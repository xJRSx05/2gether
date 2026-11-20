// ของที่ใช้ร่วมกันระหว่างทีวี (YouTube) กับเครื่องเล่นเพลง (Spotify)
import { esc } from './ui.js';
import { avatarSvg } from './avatar.js';

const scripts = new Map();
export function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => { scripts.delete(src); rej(new Error('load')); };
      document.head.appendChild(s);
    }));
  }
  return scripts.get(src);
}

export const partnerName = (ctx) => ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
export const partnerOnline = (ctx) => Boolean(ctx.partnerPresence && ctx.partnerPresence.page !== 'away');

// แคชผลลัพธ์ไว้ในเครื่อง ประหยัดโควตา API
export function cacheGet(store, k) {
  try { const e = JSON.parse(localStorage.getItem(store) || '{}')[k]; if (e && e.exp > Date.now()) return e.v; } catch { /* ไม่เป็นไร */ }
  return null;
}
export function cacheSet(store, k, v, ttl) {
  try {
    const all = JSON.parse(localStorage.getItem(store) || '{}');
    const now = Date.now();
    Object.keys(all).forEach((key) => { if (all[key].exp < now) delete all[key]; });
    all[k] = { v, exp: now + ttl };
    const keys = Object.keys(all);
    if (keys.length > 30) delete all[keys[0]];
    localStorage.setItem(store, JSON.stringify(all));
  } catch { /* เต็มก็ไม่เป็นไร */ }
}

// ประวัติ "ทำด้วยกันล่าสุด" (เก็บในเครื่อง ไม่เกิน 30 รายการ)
export function historyGet(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
export function historyAdd(key, item) {
  const list = historyGet(key).filter((x) => x.id !== item.id);
  list.unshift({ ...item, at: Date.now() });
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, 30))); } catch { /* ไม่เป็นไร */ }
}

// หน้าต่างเต็มจอของทีวี/เพลง
export function mediaOverlay(cls, title, label) {
  document.querySelector(`.media-ov.${cls}`)?.remove();
  const ov = document.createElement('div');
  ov.className = `media-ov ${cls}`;
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', label || title);
  ov.innerHTML = `<header class="mo-head">
      <button type="button" class="icon-btn" data-close aria-label="ปิด"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <h2>${esc(title)}</h2><span class="mo-with" data-with></span></header>
    <div class="mo-body"></div>`;
  ov.addEventListener('contextmenu', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));
  return { ov, body: ov.querySelector('.mo-body'), withEl: ov.querySelector('[data-with]') };
}

// ป้ายบอกว่ากำลังดู/ฟังกับใคร
export function withChip(ctx, together, waiting) {
  const pav = ctx.partnerPresence?.avatar || ctx.partner?.avatar;
  if (together) return `<span class="mw-faces"><i>${avatarSvg(ctx.me.avatar)}</i><i>${avatarSvg(pav)}</i></span>ด้วยกัน`;
  if (waiting) return `<span class="mw-dot"></span>รอ ${esc(partnerName(ctx))} กดรับ`;
  return 'คนเดียว';
}

// คำชวนแบบเด้งกลางจอ (หน้าตาเดียวกับคำชวนเล่นเกม)
export function mediaInvite({ art, title, sub, yes = 'ไปด้วย', onYes, onNo, modal }) {
  const { ov, close } = modal('invite-pop media-invite', `
    <div class="mi-art">${art}</div>
    <h2>${esc(title)}</h2>
    <p class="sheet-sub">${esc(sub)}</p>
    <div class="ip-btns"><button type="button" class="btn primary" data-yes>${esc(yes)}</button><button type="button" class="btn" data-no>ไว้ก่อน</button></div>`, title);
  let done = false;
  const finish = (fn) => { if (done) return; done = true; clearTimeout(timer); close(); fn?.(); };
  const timer = setTimeout(() => finish(onNo), 60000);
  navigator.vibrate?.([80, 60, 80]);
  ov.querySelector('[data-yes]').addEventListener('click', () => finish(onYes));
  ov.querySelector('[data-no]').addEventListener('click', () => finish(onNo));
  ov.addEventListener('click', (e) => { if (e.target === ov) finish(onNo); });
  return () => finish(null);
}

export const fmtTime = (s) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

export const ICON = {
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  repeat1: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  tv: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M8 21h8M9 3l3 3 3-3"/>',
  music: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3a9 9 0 0 1 9 9"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3.2"/>',
  next: '<path d="M6 5.5v13l9-6.5zM18 5v14" fill="currentColor"/>',
  prev: '<path d="M18 5.5v13l-9-6.5zM6 5v14" fill="currentColor"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exitfs: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
};
export const svg = (name, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
