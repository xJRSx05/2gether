export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

// โลโก้: วงกลมสองวงซ้อนกัน
export const logoMark = (size = 28) => `
<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 48 32" aria-hidden="true">
  <circle cx="17" cy="16" r="14" fill="var(--accent)"/>
  <circle cx="31" cy="16" r="14" fill="var(--ink)" opacity=".55"/>
</svg>`;

let toastTimer;
export function toast(message, kind = 'info') {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.dataset.kind = kind;
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), 3200);
}

export const PAGE_LABEL = {
  home: 'ห้องนั่งเล่น',
  chat: 'แชท',
  bedroom: 'ห้องนอน',
  kitchen: 'ครัว',
  garden: 'สวน',
  games: 'ห้องเกม',
  memory: 'สมุดความทรงจำ',
  settings: 'ตั้งค่า',
  away: 'พักหน้าจอ',
};

// แจ้งเตือนลอยจากด้านบนแบบในมือถือ: { title, body, icon (html), actions: [{label, primary, run}], ms }
let notiBox = null;
export function notify({ title, body = '', icon = '', actions = [], ms = 5000 } = {}) {
  if (!notiBox) {
    notiBox = document.createElement('div');
    notiBox.className = 'noti-stack';
    notiBox.setAttribute('aria-live', 'polite');
    document.body.appendChild(notiBox);
  }
  const n = document.createElement('div');
  n.className = 'noti';
  n.setAttribute('role', actions.length ? 'alertdialog' : 'status');
  n.innerHTML = `<div class="noti-ico" aria-hidden="true">${icon}</div>
    <div class="noti-txt"><p class="noti-app">2gether · ตอนนี้</p><p class="noti-title">${esc(title)}</p>${body ? `<p class="noti-body">${esc(body)}</p>` : ''}
    ${actions.length ? `<div class="noti-acts">${actions.map((a, i) => `<button type="button" class="btn small${a.primary ? ' primary' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}</div>`;
  notiBox.prepend(n);
  while (notiBox.children.length > 3) notiBox.lastChild.remove();
  let t = 0;
  const close = () => {
    clearTimeout(t);
    n.classList.add('out');
    setTimeout(() => n.remove(), 300);
  };
  t = setTimeout(close, actions.length ? Math.max(ms, 12000) : ms);
  n.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) { actions[Number(b.dataset.i)].run?.(); close(); return; }
    if (!actions.length) close();
  });
  // ปัดขึ้นเพื่อปิด
  let y0 = null;
  n.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
  n.addEventListener('pointermove', (e) => { if (y0 !== null && e.clientY - y0 < -24) { y0 = null; close(); } });
  n.addEventListener('pointerup', () => { y0 = null; });
  return close;
}

// รีเฟรชแอป (แอปที่ติดตั้งไว้หน้าโฮมไม่มีปุ่มรีเฟรชของเบราว์เซอร์): เช็กของใหม่ก่อนแล้วโหลดใหม่
export async function refreshApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await Promise.race([reg?.update(), new Promise((r) => { setTimeout(r, 2500); })]);
  } catch { /* ไม่เป็นไร */ }
  location.reload();
}
