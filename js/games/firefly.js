import { rand } from './util.js';
import { pickSpecies } from '../collection.js';
import { lasso, inPoly, ease } from './gestures.js';

const LIFE = 9;      // หิ่งห้อยอยู่กี่วินาที
const GAP = 1.1;     // ปล่อยตัวใหม่ทุกกี่วินาที
const LIGHT = 0.26;  // รัศมีแสงตะเกียง (สัดส่วนของด้านที่สั้นกว่า)

// จับหิ่งห้อย: b ลากตะเกียงส่องให้หิ่งห้อยสว่าง a วาดวงล้อมเก็บตัวที่สว่างอยู่ในวง
function showOnly(svg) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'lasso-path');
  svg.appendChild(path);
  return { show(p) { path.setAttribute('d', `M${p.map((q) => q.join(' ')).join(' L')} Z`); path.classList.remove('fade'); void path.getBBox?.(); path.classList.add('fade'); setTimeout(() => path.setAttribute('d', ''), 600); } };
}

export const firefly = {
  id: 'firefly',
  kind: 'star',
  night: true,
  title: 'จับหิ่งห้อย',
  desc: 'คนหนึ่งลากตะเกียงส่องให้หิ่งห้อยสว่าง อีกคนวาดวงล้อมจับตัวที่สว่าง วงเดียวได้หลายตัว 60 วินาที',
  seconds: 60,
  unit: 'ตัว',
  collectAt: 'ท้องฟ้าดูดาวในสวน',
  stars: [6, 10, 15],

  create({ el, role, seed, send, partnerName }) {
    const caught = [];
    const nodes = {};
    let lamp = [50, 55]; let netLamp = [50, 55];
    let t0 = 0; let raf = 0; let last = 0; let lastSent = 0; let live = false;
    const total = Math.floor(60 / GAP);

    el.innerHTML = `
      <div class="cg ff">
        <p class="cg-count"><b id="ffN">0</b> ตัวที่จับได้</p>
        <p class="cg-role">${role === 'a' ? `${partnerName} ส่องตะเกียง คุณวาดวงล้อมหิ่งห้อยที่สว่าง` : `ลากตะเกียงไปส่องหิ่งห้อย ให้ ${partnerName} วาดวงจับ`}</p>
        <div class="ff-field ${role === 'a' ? 'draw' : 'lamp'}" id="ffField">
          <span class="ff-light" id="ffLight"></span>
          <span class="ff-lantern" id="ffLantern" aria-hidden="true">🏮</span>
          <svg class="ff-svg" id="ffSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        </div>
      </div>`;
    const field = el.querySelector('#ffField');
    const $n = el.querySelector('#ffN');
    const light = el.querySelector('#ffLight');
    const lantern = el.querySelector('#ffLantern');

    const at = (i) => 0.6 + i * GAP;
    function pos(i, t) {
      const age = t - at(i);
      const fx = 0.45 + rand(seed, i * 10 + 1) * 0.6;
      const fy = 0.45 + rand(seed, i * 10 + 2) * 0.6;
      const x = 50 + 38 * Math.sin(age * fx + rand(seed, i * 10 + 3) * 6.28) * Math.cos(age * 0.31 + i);
      const y = 48 + 36 * Math.sin(age * fy + rand(seed, i * 10 + 4) * 6.28);
      return [x, y];
    }
    const lit = (x, y, r) => {
      const dx = ((x - lamp[0]) / 100) * r.width;
      const dy = ((y - lamp[1]) / 100) * r.height;
      return Math.hypot(dx, dy) < LIGHT * Math.min(r.width, r.height);
    };

    function apply(a) {
      if (a.k === 'lamp') netLamp = [a.x, a.y];
      else if (a.k === 'lasso' && role === 'b') draw.show(a.p);
      else if (a.k === 'got') {
        a.ids.forEach((i) => {
          if (caught.includes(i)) return;
          caught.push(i);
          nodes[i]?.classList.add('got');
          const n = nodes[i]; delete nodes[i]; setTimeout(() => n?.remove(), 600);
        });
        $n.textContent = String(caught.length);
      }
    }

    // a วาดวงได้ ฝั่ง b แค่เห็นวงที่ a วาด
    const svg = el.querySelector('#ffSvg');
    const draw = role !== 'a' ? showOnly(svg) : lasso(field, svg, {
      onClose: (pts) => {
        if (role !== 'a' || !live) return;
        const r = field.getBoundingClientRect();
        const t = (performance.now() - t0) / 1000;
        const ids = Object.keys(nodes).map(Number).filter((i) => { const [x, y] = pos(i, t); return lit(x, y, r) && inPoly([x, y], pts); });
        const step = Math.max(1, Math.floor(pts.length / 24));
        send({ k: 'lasso', p: pts.filter((_, k) => k % step === 0).map(([x, y]) => [Math.round(x), Math.round(y)]) });
        if (ids.length) { const m = { k: 'got', ids }; send(m); apply(m); }
      },
    });

    if (role === 'b') {
      const move = (ev) => {
        const r = field.getBoundingClientRect();
        lamp = [Math.max(4, Math.min(96, ((ev.clientX - r.left) / r.width) * 100)), Math.max(6, Math.min(94, ((ev.clientY - r.top) / r.height) * 100))];
        const now = performance.now();
        if (live && now - lastSent > 60) { lastSent = now; send({ k: 'lamp', x: Math.round(lamp[0] * 10) / 10, y: Math.round(lamp[1] * 10) / 10 }); }
      };
      field.addEventListener('pointerdown', (ev) => { field.setPointerCapture?.(ev.pointerId); move(ev); });
      field.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'touch') move(ev); });
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (role === 'a') lamp = [ease(lamp[0], netLamp[0], dt, 10), ease(lamp[1], netLamp[1], dt, 10)];
      light.style.left = `${lamp[0]}%`; light.style.top = `${lamp[1]}%`;
      const fr = field.getBoundingClientRect();
      light.style.width = light.style.height = `${2 * LIGHT * Math.min(fr.width, fr.height)}px`;
      lantern.style.left = `${lamp[0]}%`; lantern.style.top = `${lamp[1]}%`;
      if (live) {
        const r = field.getBoundingClientRect();
        const t = (now - t0) / 1000;
        for (let i = 0; i < total; i += 1) {
          if (caught.includes(i)) continue;
          const age = t - at(i);
          const on = age >= 0 && age < LIFE;
          let n = nodes[i];
          if (on && !n) { n = document.createElement('i'); n.className = 'ff-bug'; field.appendChild(n); nodes[i] = n; }
          if (!n) continue;
          if (!on) { n.remove(); delete nodes[i]; continue; }
          const [x, y] = pos(i, t);
          n.style.left = `${x}%`; n.style.top = `${y}%`;
          n.classList.toggle('lit', lit(x, y, r));
        }
      }
      raf = requestAnimationFrame(frame);
    }

    last = performance.now();
    raf = requestAnimationFrame(frame);
    return {
      onAct: apply,
      start() { live = true; t0 = performance.now(); },
      stop() { live = false; cancelAnimationFrame(raf); },
      score: () => caught.length,
      items: () => caught.map((i) => pickSpecies('star', seed, i)),
    };
  },
};
