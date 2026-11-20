const cap = (el, e) => { try { el.setPointerCapture?.(e.pointerId); } catch { /* ไม่มี pointer จริง */ } };

// ชุดท่าทางสำหรับกิจกรรม: ปัด, วนนิ้ว, ลากวาง, กดค้าง, วาดวงล้อม
// ทุกอันคืนฟังก์ชันสำหรับถอดออก

// ปัด: นับทุกครั้งที่นิ้วเลื่อนไปทางที่กำหนดเกิน min พิกเซล (ปัดต่อเนื่องได้โดยไม่ต้องยกนิ้ว)
// dir: 'down' | 'up' | 'h' (ซ้าย-ขวาสลับกัน) | 'any'
export function swipe(el, { dir = 'down', min = 36, onSwipe }) {
  let o = null;
  let lastH = 0;
  const down = (e) => { cap(el, e); o = { x: e.clientX, y: e.clientY }; };
  const move = (e) => {
    if (!o) return;
    const dx = e.clientX - o.x;
    const dy = e.clientY - o.y;
    let hit = null;
    if (dir === 'down' && dy > min) hit = 'down';
    else if (dir === 'up' && dy < -min) hit = 'up';
    else if (dir === 'h' && Math.abs(dx) > min) {
      const s = Math.sign(dx);
      if (s !== lastH) { hit = s > 0 ? 'right' : 'left'; lastH = s; } else o = { x: e.clientX, y: e.clientY };
    } else if (dir === 'any' && Math.hypot(dx, dy) > min) hit = 'any';
    if (hit) { o = { x: e.clientX, y: e.clientY }; onSwipe(hit, e); }
  };
  const up = () => { o = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  ['pointerup', 'pointercancel'].forEach((t) => el.addEventListener(t, up));
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
  };
}

// วนนิ้วรอบจุดกลางของ el: เรียก onTurn(สัดส่วน 0..1) เมื่อวนครบ turns รอบ = 1
export function stir(el, { turns = 2, onTurn }) {
  let prev = null;
  let total = 0;
  const ang = (e) => {
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };
  const down = (e) => { cap(el, e); prev = ang(e); };
  const move = (e) => {
    if (prev === null) return;
    const a = ang(e);
    let d = a - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    prev = a;
    total += Math.abs(d);
    onTurn(Math.min(1, total / (2 * Math.PI * turns)));
  };
  const up = () => { prev = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  ['pointerup', 'pointercancel'].forEach((t) => el.addEventListener(t, up));
  return { reset: () => { total = 0; onTurn(0); } };
}

// ลากของไปวาง: ghost ตามนิ้ว ปล่อยบน element ที่ match selector แล้วเรียก onDrop(target)
export function dragDrop(token, { drop, onDrop, onPick }) {
  let ghost = null;
  const down = (e) => {
    if (token.disabled || token.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    cap(token, e);
    onPick?.();
    ghost = token.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.removeAttribute('id');
    document.body.appendChild(ghost);
    place(e);
  };
  const place = (e) => {
    if (!ghost) return;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.querySelectorAll('.drop-hover').forEach((n) => n.classList.remove('drop-hover'));
    ghost.hidden = true;
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest(drop);
    ghost.hidden = false;
    t?.classList.add('drop-hover');
  };
  const up = (e) => {
    if (!ghost) return;
    ghost.hidden = true;
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest(drop);
    ghost.remove();
    ghost = null;
    document.querySelectorAll('.drop-hover').forEach((n) => n.classList.remove('drop-hover'));
    if (t) onDrop(t);
  };
  token.addEventListener('pointerdown', down);
  token.addEventListener('pointermove', place);
  token.addEventListener('pointerup', up);
  token.addEventListener('pointercancel', () => { ghost?.remove(); ghost = null; });
}

// กดค้าง: onHold(true/false) ตอนเริ่ม/ปล่อย (ใช้คู่กับเกจที่เกมคำนวณเองในแต่ละเฟรม)
export function hold(el, onHold) {
  const on = (e) => { e.preventDefault(); cap(el, e); el.classList.add('holding'); onHold(true); };
  const off = () => { if (!el.classList.contains('holding')) return; el.classList.remove('holding'); onHold(false); };
  el.addEventListener('pointerdown', on);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.addEventListener(t, off));
}

// วาดวงล้อมบนพื้นที่ field (พิกัดเป็นเปอร์เซ็นต์) วาดเส้นใน svg แล้ว onClose(จุดทั้งหมด)
export function lasso(field, svg, { onClose, minPts = 8 }) {
  let pts = null;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'lasso-path');
  svg.appendChild(path);
  const at = (e) => {
    const r = field.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
  };
  const draw = () => path.setAttribute('d', pts && pts.length ? `M${pts.map((p) => p.join(' ')).join(' L')}${pts.length > 2 ? ' Z' : ''}` : '');
  field.addEventListener('pointerdown', (e) => { cap(field, e); pts = [at(e)]; draw(); });
  field.addEventListener('pointermove', (e) => {
    if (!pts) return;
    const p = at(e);
    const l = pts[pts.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 1.2) { pts.push(p); draw(); }
  });
  const end = () => {
    if (!pts) return;
    const done = pts;
    pts = null;
    path.classList.add('fade');
    setTimeout(() => { path.classList.remove('fade'); if (!pts) draw(); }, 350);
    if (done.length >= minPts) onClose(done);
  };
  ['pointerup', 'pointercancel'].forEach((t) => field.addEventListener(t, end));
  return { show: (p) => { path.setAttribute('d', `M${p.map((q) => q.join(' ')).join(' L')} Z`); path.classList.add('fade'); setTimeout(() => { path.classList.remove('fade'); path.setAttribute('d', ''); }, 500); } };
}

export function inPoly([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// เกลี่ยค่าที่มาจากอีกเครื่องให้ลื่น (เรียกทุกเฟรม)
export const ease = (cur, target, dt, speed = 14) => cur + (target - cur) * (1 - Math.exp(-dt * speed));
