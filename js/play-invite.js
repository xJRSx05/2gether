// ชวนเล่นจากทุกที่: เลือกเกมจากปุ่มบนหัวเว็บ อีกคนเห็นการ์ดคำชวนไม่ว่าอยู่หน้าไหน
// กด "เล่นเลย" แล้วทั้งคู่ถูกพาไปห้องของเกมนั้น ห้องจะเริ่มเกมให้เองเมื่ออยู่ครบสองคน
//   ctx.pendingGame = { g, room, asker, at }  asker = เราเป็นคนชวน
import { esc, toast, notify } from './ui.js';
import { GAMES } from './game.js';
import { CLASSIC } from './games/classic/index.js';
import { gameThumb } from './game-icons.js';
import { catSvg } from './cat.js';
import { cooldownLeft, sendPush, pushFailText } from './push.js';

const GROUPS = [
  { room: 'kitchen', label: 'ห้องครัว', ids: ['cookcat', 'cooktog'] },
  { room: 'garden', label: 'สวน', ids: ['plant', 'fish', 'firefly', 'starcatch'] },
  { room: 'games', label: 'ห้องเกม', ids: CLASSIC.map((g) => g.id) },
];
export const ROOM_OF = Object.fromEntries(GROUPS.flatMap((g) => g.ids.map((id) => [id, g.room])));
export const ROOM_LABEL = Object.fromEntries(GROUPS.map((g) => [g.room, g.label]));
const PENDING_MS = 90000;
const partnerName = (ctx) => ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
const online = (ctx) => Boolean(ctx.partnerPresence && ctx.partnerPresence.page !== 'away');

/* ---------- หน้าต่างลอย (ใช้ร่วม) ---------- */
export function modal(cls, html, label) {
  document.querySelector(`.${cls}`)?.remove();
  const ov = document.createElement('div');
  ov.className = `sheet-ov ${cls}`;
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
  document.body.appendChild(ov);
  const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 220); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  setTimeout(() => ov.querySelector('button')?.focus(), 30);
  return { ov, close };
}

/* ---------- ฝั่งคนชวน ---------- */
export function openPicker(ctx) {
  if (!ctx.partner) { toast('ยังไม่มีอีกคนในบ้าน', 'error'); return; }
  const { ov, close } = modal('play-picker', `
    <header class="sheet-head"><h2>ชวน ${esc(partnerName(ctx))} เล่นอะไรดี</h2>
      <button type="button" class="icon-btn" data-close aria-label="ปิด"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <p class="sheet-sub">${online(ctx) ? 'เลือกเกมแล้วรอเขากดรับ ระบบจะพาทั้งคู่ไปที่ห้องของเกมเอง' : `${esc(partnerName(ctx))} ไม่ได้เปิดเว็บอยู่ จะส่งแจ้งเตือนชวนแทน`}</p>
    ${GROUPS.map((g) => `<section class="pick-group"><h3>${g.label}</h3><div class="pick-grid">
      ${g.ids.map((id) => `<button type="button" class="pick" data-g="${id}">${gameThumb(id, ctx.home?.cat_color)}<span>${esc(GAMES[id].title)}</span></button>`).join('')}
    </div></section>`).join('')}`, 'ชวนเล่น');
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    close();
    inviteGame(ctx, b.dataset.g);
  });
}

let sending = false;
export async function inviteGame(ctx, id) {
  const room = ROOM_OF[id];
  if (!room || !ctx.partner) return;
  const name = partnerName(ctx);
  if (online(ctx)) {
    ctx.pendingGame = { g: id, room, asker: true, at: Date.now() };
    ctx.send('game', { t: 'invite', g: id, room, from: ctx.me.nickname });
    toast(`ชวน ${name} เล่น${GAMES[id].title}แล้ว รอเขากดรับนะ`);
    return;
  }
  const left = cooldownLeft('play');
  if (left > 0) { toast(`ชวนผ่านแจ้งเตือนได้อีกครั้งในอีก ${Math.ceil(left / 60)} นาที`, 'error'); return; }
  if (sending) return;
  sending = true;
  const r = await sendPush('play', room);
  sending = false;
  if (r.result === 'ok') toast(`ส่งแจ้งเตือนชวน ${name} แล้ว`);
  else if (r.result === 'rate') toast(`ชวนได้อีกครั้งในอีก ${Math.ceil(r.retryAfter / 60)} นาที`, 'error');
  else if (r.result === 'dnd') toast(`${name} พักแจ้งเตือนอยู่ชั่วคราว`, 'error');
  else if (r.result === 'no_sub') { ctx.partnerPush = false; toast(`${name} ยังไม่ได้เปิดแจ้งเตือน`, 'error'); }
  else toast(pushFailText(r), 'error');
}

/* ---------- ฝั่งคนถูกชวน + ข้อความตอบกลับ (เรียกจาก app.js) ---------- */
// การ์ดคำชวน (ใช้ทั้งชวนจากห้องอื่นและชวนในห้องเดียวกัน) คืนฟังก์ชันปิด
let cardClose = null;
export function invitePopup(ctx, { g, from, sub, onYes, onNo }) {
  cardClose?.();
  const { ov, close } = modal('invite-pop', `
    <div class="ip-art">${gameThumb(g, ctx.home?.cat_color)}<span class="ip-cat">${catSvg(ctx.home?.cat_color)}</span></div>
    <h2>${esc(from || partnerName(ctx))} ชวนเล่น${esc(GAMES[g].title)}</h2>
    <p class="sheet-sub">${esc(sub || GAMES[g].desc || '')}</p>
    <div class="ip-btns"><button type="button" class="btn primary" data-yes>เล่นเลย</button><button type="button" class="btn" data-no>ไว้ก่อน</button></div>`, 'คำชวนเล่นเกม');
  let done = false;
  const finish = (fn) => { if (done) return; done = true; clearTimeout(timer); close(); fn?.(); };
  const timer = setTimeout(() => finish(onNo), 60000);
  cardClose = () => finish(null);
  navigator.vibrate?.([80, 60, 80]);
  ov.querySelector('[data-yes]').addEventListener('click', () => finish(onYes));
  ov.querySelector('[data-no]').addEventListener('click', () => finish(onNo));
  // แตะพื้นหลัง/กด Esc = ไว้ก่อน
  ov.addEventListener('click', (e) => { if (e.target === ov) finish(onNo); });
  return cardClose;
}

export function handleInviteEvent(ctx, p) {
  if (!p || !GAMES[p.g]) return false;
  if (p.t === 'invite') {
    const room = ROOM_OF[p.g] || p.room;
    invitePopup(ctx, {
      g: p.g,
      from: p.from,
      sub: `กดเล่นเลยแล้วจะพาไปที่${ROOM_LABEL[room] || 'ห้องเกม'}ด้วยกัน`,
      onYes: () => {
        ctx.pendingGame = { g: p.g, room, asker: false, at: Date.now() };
        ctx.send('game', { t: 'accept', g: p.g, room });
        if (ctx.route !== room) location.hash = `#/${room}`;
      },
      onNo: () => ctx.send('game', { t: 'decline', g: p.g }),
    });
    return true;
  }
  if (p.t === 'accept') {
    const pg = ctx.pendingGame;
    if (!pg || !pg.asker || pg.g !== p.g) return true;
    pg.at = Date.now();
    notify({ title: `${partnerName(ctx)} รับคำชวนแล้ว`, body: `ไปเล่น${GAMES[pg.g].title}ที่${ROOM_LABEL[pg.room]}กัน`, icon: catSvg(ctx.home?.cat_color) });
    if (ctx.route !== pg.room) location.hash = `#/${pg.room}`;
    return true;
  }
  if (p.t === 'decline') {
    if (ctx.pendingGame?.asker) ctx.pendingGame = null;
    notify({ title: `${partnerName(ctx)} ยังไม่ว่างเล่นตอนนี้`, body: 'ไว้ชวนใหม่ทีหลังนะ', icon: catSvg(ctx.home?.cat_color) });
    return true;
  }
  return false;
}

// ห้องเกมเรียกทุกครั้งที่อัปเดต: ถ้ามีคำชวนที่ตกลงกันแล้วและอยู่ห้องเดียวกันครบ ให้เริ่มเลย
export function maybeStart(ctx, route, director, together) {
  const pg = ctx.pendingGame;
  if (!pg) return;
  if (Date.now() - pg.at > PENDING_MS) { ctx.pendingGame = null; return; }
  if (pg.asker && pg.room === route && together && director && !director.busy()) {
    ctx.pendingGame = null;
    director.ask(pg.g);
  }
}
