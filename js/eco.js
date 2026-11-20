// กระเป๋าหัวใจ ภารกิจคู่ ร้านแต่งบ้าน ต้นไม้ของเรา และรางวัลจาก Bond
// ทุกอย่างอยู่ที่บ้านหลังเดียว (home) ใช้ร่วมกันสองคน เปลี่ยนค่าผ่านฟังก์ชันฝั่งเซิร์ฟเวอร์ (schema-eco.sql)
import { sb } from './supabase.js';
import { toast, esc } from './ui.js';
import { todayIso, dayNumber } from './days.js';
import { bondInfo } from './bond.js';
import { isHost } from './host.js';
import { modal } from './play-invite.js';
import { catSvg } from './cat.js';

/* ---------- ภารกิจ ---------- */
// key = เหตุการณ์ที่นับ, need = เป้า, host = นับเฉพาะเครื่องเจ้าบ้าน (ของที่ทำด้วยกัน กันนับซ้ำสองเครื่อง)
const DAILY = [
  { key: 'touch', title: 'กอดหรือหอมแก้มกัน', need: 1 },
  { key: 'chat', title: 'คุยแชทกัน 5 ข้อความ', need: 5 },
  { key: 'media', title: 'ดูหนังหรือฟังเพลงด้วยกัน 10 นาที', need: 10 },
  { key: 'game', title: 'เล่นเกมด้วยกัน 1 รอบ', need: 1 },
  { key: 'cat', title: 'ให้อาหารหรือลูบแมว', need: 1 },
  { key: 'sit', title: 'นั่งโซฟาหรือม้านั่งด้วยกัน', need: 1 },
  { key: 'miss', title: 'กดคิดถึงกัน', need: 1 },
  { key: 'visit', title: 'เข้ามาหากันทั้งคู่วันนี้', need: 1 },
];
const WEEKLY = [
  { key: 'media', title: 'ดูหนังหรือฟังเพลงด้วยกัน 3 วัน', need: 3, perDay: true },
  { key: 'game', title: 'เล่นเกมด้วยกัน 5 รอบ', need: 5 },
  { key: 'touch', title: 'กอดหรือหอมแก้มกัน 10 ครั้ง', need: 10 },
  { key: 'visit', title: 'มาหากันทั้งคู่ 5 วัน', need: 5, perDay: true },
  { key: 'chat', title: 'คุยแชทกัน 60 ข้อความ', need: 60 },
];
const D_REWARD = 10;
const BONUS = 20;
const W_REWARD = 60;

// สุ่มแบบเดียวกันทั้งสองเครื่อง (ตั้งต้นจากวันที่)
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function pick(list, n, seed) {
  const r = seeded(seed);
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const today = () => todayIso();
function weekStart() {
  const d = new Date(`${today()}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // จันทร์ = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
export const dailyQuests = () => pick(DAILY, 3, `d${today()}`);
export const weeklyQuests = () => pick(WEEKLY, 2, `w${weekStart()}`);

const E = { ctx: null, q: new Map(), loadedFor: '', chains: new Map(), mediaDay: '' };
const qk = (day, qid) => `${day}|${qid}`;
const qGet = (day, qid) => E.q.get(qk(day, qid)) || { progress: 0, done: false };

export async function loadQuests(ctx) {
  E.ctx = ctx;
  const d = today();
  const w = weekStart();
  const { data } = await sb.from('quest_log').select('day, qid, progress, done').in('day', [d, w]);
  E.q.clear();
  (data || []).forEach((r) => E.q.set(qk(r.day, r.qid), { progress: r.progress, done: r.done }));
  E.loadedFor = d;
  paintQuestBadge();
  repaintSheet();
}

async function rpcBump(ctx, day, qid, need, amount, reward) {
  // กันยิงซ้อนต่อภารกิจเดียวกัน
  const prev = E.chains.get(qid) || Promise.resolve();
  const run = prev.then(async () => {
    if (qGet(day, qid).done) return null;
    const { data, error } = await sb.rpc('quest_bump', { p_day: day, p_qid: qid, p_need: need, p_amount: amount, p_reward: reward });
    if (error || !data) return null;
    E.q.set(qk(day, qid), { progress: data.progress, done: data.done });
    if (ctx.home) ctx.home.hearts = data.hearts;
    return data;
  }).catch(() => null);
  E.chains.set(qid, run);
  return run;
}

// เกิดเหตุการณ์ที่นับภารกิจได้ (เรียกจากทั่วแอป)
export async function bump(ctx, key, amount = 1) {
  if (!ctx?.home || !ctx.partner) return;
  if (E.loadedFor !== today()) await loadQuests(ctx);
  const d = today();
  let gained = 0;
  const dq = dailyQuests().find((q) => q.key === key);
  if (dq) {
    const r = await rpcBump(ctx, d, `d_${key}`, dq.need, amount, D_REWARD);
    if (r?.new) {
      gained += D_REWARD;
      toastQuest(dq.title, D_REWARD);
      if (dailyQuests().every((q) => qGet(d, `d_${q.key}`).done)) {
        const b = await rpcBump(ctx, d, 'd_bonus', 1, 1, BONUS);
        if (b?.new) { gained += BONUS; setTimeout(() => toastQuest('ทำภารกิจวันนี้ครบแล้ว', BONUS), 1600); }
      }
    }
  }
  const wq = weeklyQuests().find((q) => q.key === key);
  if (wq) {
    const flag = `2gether.wq.${key}.${d}`;
    let skip = false;
    if (wq.perDay) { try { skip = localStorage.getItem(flag) === '1'; } catch { /* ไม่เป็นไร */ } }
    if (!skip) {
      const r = await rpcBump(ctx, weekStart(), `w_${key}`, wq.need, wq.perDay ? 1 : amount, W_REWARD);
      if (r && wq.perDay) { try { localStorage.setItem(flag, '1'); } catch { /* ไม่เป็นไร */ } }
      if (r?.new) { gained += W_REWARD; toastQuest(wq.title, W_REWARD); }
    }
  }
  paintQuestBadge();
  repaintSheet();
  if (gained) changed(ctx);
}
function toastQuest(title, n) { toast(`ภารกิจสำเร็จ: ${title} +${n} หัวใจ`); }

// ทุกนาทีที่ดูหนัง/ฟังเพลงด้วยกัน (เครื่องเจ้าบ้านนับ)
export function startMediaClock(ctx, together) {
  clearInterval(E.mediaT);
  E.mediaT = setInterval(() => {
    if (!E.ctx || document.hidden || !together() || !isHost(ctx)) return;
    bump(ctx, 'media');
  }, 60000);
}

/* ---------- เปลี่ยนแปลง/ซิงก์กับอีกคน ---------- */
const listeners = new Set();
export const onEco = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function emit() { listeners.forEach((f) => { try { f(); } catch { /* ไม่เป็นไร */ } }); paintQuestBadge(); repaintSheet(); }
function changed(ctx) { ctx.send('eco', { t: 'sync' }); emit(); }
export async function reloadEco(ctx) {
  const { data } = await sb.from('home').select('hearts, owned, placed, tree_days, tree_day, water_day, bond').eq('id', 1).maybeSingle();
  if (data && ctx.home) Object.assign(ctx.home, data);
  await loadQuests(ctx);
  emit();
}
export function handleEcoEvent(ctx, p) {
  if (p?.t === 'fw') { import('./fx.js').then((m) => m.skyFireworks?.()); return; }
  reloadEco(ctx);
}

/* ---------- ต้นไม้ของเรา ---------- */
export const TREE_STAGES = [
  { at: 0, name: 'เมล็ด' }, { at: 3, name: 'ต้นกล้า' }, { at: 7, name: 'ต้นเล็ก' },
  { at: 14, name: 'ต้นกลาง' }, { at: 30, name: 'ต้นใหญ่' }, { at: 60, name: 'ต้นไม้ออกดอก' },
];
export function treeStage(days) {
  let i = 0;
  TREE_STAGES.forEach((s, k) => { if (days >= s.at) i = k; });
  return i;
}
const isAnniv = (ctx) => {
  const s = ctx.home?.start_date;
  if (!s) return false;
  return s.slice(5) === today().slice(5) && dayNumber(s) > 1;
};
export async function treeVisit(ctx) {
  if (!ctx.partner) return null;
  const { data } = await sb.rpc('tree_visit');
  if (!data) return null;
  if (ctx.home) { ctx.home.tree_days = data.tree_days; ctx.home.tree_day = data.tree_day; }
  if (data.both) await bump(ctx, 'visit');
  if (data.grew) { toast(`ต้นไม้ของเราโตขึ้นอีกวัน (${data.tree_days} วัน)`); changed(ctx); }
  return data;
}
export async function waterTree(ctx) {
  const { data, error } = await sb.rpc('tree_water');
  if (error || !data) { toast('รดน้ำไม่สำเร็จ ลองใหม่อีกครั้ง', 'error'); return; }
  if (ctx.home) { ctx.home.hearts = data.hearts; ctx.home.water_day = data.water_day; }
  if (data.ok) { toast('รดน้ำแล้ว +5 หัวใจ'); changed(ctx); } else toast('วันนี้รดน้ำแล้ว พรุ่งนี้มาใหม่นะ');
}

// ต้นไม้ 6 ขั้น (กว้าง 150 สูง 190) วันครบรอบมีดอกหัวใจ
export function treeSvg(stage, anniv = false) {
  const soil = '<ellipse cx="75" cy="184" rx="40" ry="6" fill="#7A5233" opacity=".55"/><ellipse cx="75" cy="182" rx="30" ry="5" fill="#9B6B43"/>';
  const leaf = (cx, cy, rx, ry, c = '#6DBB82') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
  const blossoms = (pts, c) => pts.map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="5" fill="${c}"/><circle r="1.8" fill="#FFF3C4"/></g>`).join('');
  const hearts = (pts) => pts.map(([x, y]) => `<path transform="translate(${x - 6} ${y - 6}) scale(.5)" d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z" fill="#E0607E"/>`).join('');
  let body = '';
  if (stage === 0) body = '<ellipse cx="75" cy="178" rx="9" ry="6" fill="#8A5A33"/><path d="M75 174q2-8 8-10" stroke="#6DBB82" stroke-width="3" fill="none" stroke-linecap="round"/>';
  else if (stage === 1) body = `<path d="M75 182V150" stroke="#5FA05A" stroke-width="4" stroke-linecap="round"/>${leaf(64, 150, 11, 6)}${leaf(86, 144, 12, 6)}`;
  else if (stage === 2) body = `<path d="M75 182V118" stroke="#8A5A33" stroke-width="6" stroke-linecap="round"/><g class="tree-leaves">${leaf(75, 108, 26, 22)}${leaf(58, 122, 16, 12, '#5FA777')}${leaf(92, 120, 16, 12, '#5FA777')}</g>`;
  else if (stage === 3) body = `<path d="M75 182V96M75 132l-18-14M75 124l16-12" stroke="#8A5A33" stroke-width="9" stroke-linecap="round"/><g class="tree-leaves">${leaf(75, 82, 40, 32)}${leaf(46, 106, 24, 18, '#5FA777')}${leaf(104, 100, 24, 18, '#5FA777')}${leaf(75, 62, 24, 18, '#7FCB8E')}</g>`;
  else body = `<path d="M70 184 Q72 130 68 92 M80 184 Q78 130 84 92" stroke="#7A5233" stroke-width="10" fill="#8A5A33"/><path d="M68 112l-26-22M84 108l26-24" stroke="#7A5233" stroke-width="9" stroke-linecap="round"/><g class="tree-leaves">${leaf(75, 60, 60, 46)}${leaf(34, 86, 30, 24, '#5FA777')}${leaf(116, 82, 30, 24, '#5FA777')}${leaf(75, 30, 38, 26, '#7FCB8E')}${leaf(52, 46, 22, 16, '#7FCB8E')}</g>`;
  const flowers = stage === 5 ? blossoms([[44, 52], [70, 30], [100, 46], [110, 78], [36, 84], [80, 66], [58, 72], [92, 22]], '#F7B6C8') : '';
  const annivH = anniv && stage >= 2 ? hearts(stage >= 4 ? [[40, 60], [76, 40], [108, 62], [60, 88], [96, 92]] : [[64, 104], [88, 98]]) : '';
  return `<svg viewBox="0 0 150 190" aria-hidden="true">${soil}${body}${flowers}${annivH}</svg>`;
}

/* ---------- ร้านแต่งบ้าน ---------- */
// จุดวางในแต่ละห้อง (พิกัดในภาพห้อง: x กลาง, y ฐาน, กว้าง, สูง) flat = ปูพื้น อยู่ใต้ตัวละคร
export const SLOTS = {
  lv_wall: { room: 'home', x: 590, y: 210, w: 60, h: 46 },
  lv_corner: { room: 'home', x: 80, y: 378, w: 66, h: 104 },
  lv_ceiling: { room: 'home', x: 600, y: 70, w: 50, h: 70 },
  lv_floor: { room: 'home', x: 125, y: 482, w: 120, h: 40, flat: true },
  lv_catbed: { room: 'home', x: 545, y: 492, w: 84, h: 30, flat: true },
  bd_head: { room: 'bedroom', x: 595, y: 230, w: 290, h: 30 },
  bd_bed: { room: 'bedroom', x: 732, y: 330, w: 40, h: 46 },
  bd_blanket: { room: 'bedroom', x: 595, y: 352, w: 312, h: 38, flat: true },
  bd_ceiling: { room: 'bedroom', x: 300, y: 84, w: 60, h: 84 },
  kt_wall: { room: 'kitchen', x: 45, y: 214, w: 46, h: 84 },
  kt_counter: { room: 'kitchen', x: 742, y: 292, w: 40, h: 46 },
  gd_post: { room: 'garden', x: 700, y: 352, w: 44, h: 96 },
  gd_deco: { room: 'garden', x: 318, y: 404, w: 34, h: 70 },
  gd_deco2: { room: 'garden', x: 456, y: 424, w: 36, h: 46 },
  cat_neck: { room: 'cat' },
  cat_head: { room: 'cat' },
};
const A = {
  frame: '<svg viewBox="0 0 60 46"><rect x="2" y="2" width="56" height="42" rx="4" fill="#FFF8EA" stroke="#8A6A4A" stroke-width="4"/><rect x="9" y="9" width="42" height="28" rx="2" fill="#FBE3E8"/><circle cx="22" cy="20" r="5" fill="#F2C9A5"/><circle cx="38" cy="20" r="5" fill="#E3AE82"/><path d="M14 37q8-12 16 0M30 37q8-12 16 0" fill="#E0607E"/><path d="M30 14c-1.5-2-4.5-.5-3 2l3 3 3-3c1.5-2.5-1.5-4-3-2z" fill="#E0485F"/></svg>',
  plant: '<svg viewBox="0 0 66 104"><path d="M16 74h34l-4 28H20z" fill="#E8D6BC" stroke="#B89868" stroke-width="2"/><path d="M16 74h34" stroke="#B89868" stroke-width="5"/><g class="sway" fill="#4F9A63"><path d="M33 74C30 50 8 46 4 30c14 0 26 14 29 44z"/><path d="M33 74C34 44 52 34 62 18c2 18-14 36-29 56z"/><path d="M33 74C28 40 30 18 36 2c8 16 6 46-3 72z" fill="#5FA777"/><path d="M33 74C24 60 10 62 2 54c12-6 26 0 31 20z" fill="#5FA777"/><path d="M33 74c8-16 22-18 31-14-6 10-20 14-31 14z"/></g></svg>',
  lantern: '<svg viewBox="0 0 50 70"><path d="M25 0v22" stroke="#6B4A32" stroke-width="2"/><g class="swing-y"><ellipse cx="25" cy="44" rx="22" ry="22" fill="#FFE9C2" stroke="#E8B97A" stroke-width="2"/><path d="M8 34q17 6 34 0M5 44q20 6 40 0M8 54q17 6 34 0" stroke="#E8B97A" stroke-width="1.6" fill="none"/><rect x="18" y="20" width="14" height="5" rx="2" fill="#B5652A"/><rect x="18" y="63" width="14" height="5" rx="2" fill="#B5652A"/></g></svg>',
  heartrug: '<svg viewBox="0 0 120 40"><path d="M60 38C30 30 4 22 6 11 8 2 24 0 36 6c8 4 18 8 24 12 6-4 16-8 24-12 12-6 28-4 30 5 2 11-24 19-54 27z" fill="#F2A6B8" stroke="#E0607E" stroke-width="2.5"/><path d="M60 31C38 26 18 20 20 13c2-5 12-6 20-2 8 3 14 7 20 10 6-3 12-7 20-10 8-4 18-3 20 2 2 7-18 13-40 18z" fill="none" stroke="#FFF" stroke-width="1.6" stroke-dasharray="3 3"/></svg>',
  catbed: '<svg viewBox="0 0 84 30"><ellipse cx="42" cy="18" rx="40" ry="11" fill="#E0607E"/><ellipse cx="42" cy="15" rx="34" ry="8" fill="#F7D9E0"/><path d="M14 13q28-8 56 0" stroke="#E0607E" stroke-width="1.5" fill="none" opacity=".5"/><circle cx="62" cy="12" r="3" fill="#FFF"/><circle cx="24" cy="12" r="2" fill="#FFF"/></svg>',
  garland: '<svg viewBox="0 0 290 30"><path d="M4 6Q72 22 145 8T286 6" stroke="#8A6A4A" stroke-width="1.5" fill="none"/><g class="twinkle" fill="#FFE08A" stroke="#E8B04A" stroke-width="1">' + [24, 60, 96, 132, 168, 204, 240, 272].map((x, i) => `<path transform="translate(${x} ${i % 2 ? 18 : 14})" d="M0-6l1.8 3.8 4.2.5-3.1 2.9.8 4.1L0 3.3l-3.7 2 .8-4.1-3.1-2.9 4.2-.5z"/>`).join('') + '</g></svg>',
  teddy: '<svg viewBox="0 0 40 46"><circle cx="9" cy="9" r="6" fill="#B07A4C"/><circle cx="31" cy="9" r="6" fill="#B07A4C"/><circle cx="20" cy="16" r="12" fill="#C9955F"/><ellipse cx="20" cy="36" rx="13" ry="10" fill="#C9955F"/><ellipse cx="20" cy="20" rx="5" ry="4" fill="#F1D6B2"/><circle cx="15" cy="14" r="1.6" fill="#2B2024"/><circle cx="25" cy="14" r="1.6" fill="#2B2024"/><circle cx="20" cy="19" r="1.4" fill="#2B2024"/><path d="M16 27l4 3 4-3" fill="#E0485F"/><circle cx="8" cy="40" r="5" fill="#B07A4C"/><circle cx="32" cy="40" r="5" fill="#B07A4C"/></svg>',
  starblanket: '<svg viewBox="0 0 312 38" preserveAspectRatio="none"><rect x="1" y="2" width="310" height="34" rx="8" fill="#2F3A66" opacity=".92"/><path d="M1 10h310" stroke="#46548A" stroke-width="3"/>' + [[24, 22], [62, 16], [100, 26], [140, 18], [178, 27], [216, 17], [254, 25], [290, 18]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0-4.5l1.3 2.8 3.2.4-2.3 2.2.6 3.1L0 2.5l-2.8 1.5.6-3.1-2.3-2.2 3.2-.4z" fill="#FFE08A"/>`).join('') + '</svg>',
  starlamp: '<svg viewBox="0 0 60 84"><path d="M30 0v30" stroke="#6B4A32" stroke-width="2"/><circle class="glow" cx="30" cy="56" r="28" fill="#FFE9A8" opacity=".25"/><path d="M30 34l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L30 67.2l-13 6.8 2.5-14.5L9 49.3l14.5-2.1z" fill="#FFE08A" stroke="#E8B04A" stroke-width="2" stroke-linejoin="round"/></svg>',
  catclock: '<svg viewBox="0 0 46 84"><path d="M8 10L14 0l6 8h6l6-8 6 10v26H8z" fill="#2B2024"/><circle cx="17" cy="16" r="4.5" fill="#FFF"/><circle cx="29" cy="16" r="4.5" fill="#FFF"/><g class="eyes-lr"><circle cx="17" cy="16" r="2" fill="#2B2024"/><circle cx="29" cy="16" r="2" fill="#2B2024"/></g><path d="M20 24q3 3 6 0" stroke="#FFF" stroke-width="1.6" fill="none"/><rect x="8" y="34" width="30" height="34" rx="6" fill="#2B2024"/><circle cx="23" cy="50" r="11" fill="#FFF8EA"/><path d="M23 50v-7M23 50l5 3" stroke="#2B2024" stroke-width="2" stroke-linecap="round"/><g class="tail-swing"><path d="M23 68q0 10 2 15" stroke="#2B2024" stroke-width="4" stroke-linecap="round" fill="none"/></g></svg>',
  cookies: '<svg viewBox="0 0 40 46"><rect x="10" y="2" width="20" height="6" rx="2" fill="#E0607E"/><path d="M6 10h28v30a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#E8F4F8" fill-opacity=".8" stroke="#9FB8D9" stroke-width="2"/><g fill="#C9955F" stroke="#8A5A33" stroke-width="1"><circle cx="15" cy="34" r="6"/><circle cx="26" cy="36" r="6"/><circle cx="20" cy="25" r="6"/></g><g fill="#5A3A22"><circle cx="14" cy="33" r="1"/><circle cx="27" cy="35" r="1"/><circle cx="21" cy="24" r="1"/><circle cx="17" cy="36" r=".9"/></g></svg>',
  birdhouse: '<svg viewBox="0 0 44 96"><rect x="19" y="40" width="6" height="56" fill="#8A6A4A"/><path d="M4 22L22 6l18 16v24H4z" fill="#F2C94C" stroke="#8A6A4A" stroke-width="2"/><path d="M0 24L22 3l22 21" fill="none" stroke="#C9485F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="30" r="6" fill="#4A3A2A"/><path d="M18 40h8" stroke="#8A6A4A" stroke-width="3" stroke-linecap="round"/><g class="bird-hop"><circle cx="34" cy="2" r="4" fill="#9FB8D9"/><path d="M37 2l3 1-3 1" fill="#F2A65A"/></g></svg>',
  pinwheel: '<svg viewBox="0 0 34 70"><path d="M17 20v50" stroke="#8A6A4A" stroke-width="3"/><g class="spin"><path d="M17 17L17 2Q28 4 17 17z" fill="#E0607E"/><path d="M17 17L32 17Q30 28 17 17z" fill="#F2C94C"/><path d="M17 17L17 32Q6 30 17 17z" fill="#9FB8D9"/><path d="M17 17L2 17Q4 6 17 17z" fill="#7FCB8E"/><circle cx="17" cy="17" r="2.2" fill="#FFF"/></g></svg>',
  fireflies: '<svg viewBox="0 0 36 46"><rect x="10" y="2" width="16" height="5" rx="2" fill="#8A6A4A"/><path d="M6 9h24v30a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z" fill="#2F3A66" fill-opacity=".35" stroke="#B8C6E0" stroke-width="2"/><g class="glow" fill="#FFF3A0"><circle cx="13" cy="20" r="2.2"/><circle cx="23" cy="26" r="2.2"/><circle cx="16" cy="34" r="2.2"/><circle cx="25" cy="16" r="1.8"/></g></svg>',
  aquarium: '<svg viewBox="0 0 66 104"><rect x="6" y="70" width="54" height="34" rx="3" fill="#B98757" stroke="#8A6A4A" stroke-width="2"/><rect x="2" y="22" width="62" height="48" rx="5" fill="#6FB8D9" fill-opacity=".85" stroke="#3E7FA6" stroke-width="3"/><rect class="glow" x="6" y="26" width="54" height="40" rx="3" fill="#BDF0FF" opacity=".35"/><path d="M10 66q6-14 2-26M52 66q-4-10 2-20" stroke="#5FA777" stroke-width="3" fill="none" stroke-linecap="round"/><g class="swim"><path d="M24 44q8-6 16 0q-8 6-16 0z" fill="#F2A65A"/><path d="M40 44l6-4v8z" fill="#F2A65A"/></g><g class="swim b"><path d="M30 56q6-4 12 0q-6 4-12 0z" fill="#F2A6B8"/><path d="M30 56l-5-3v6z" fill="#F2A6B8"/></g><circle cx="18" cy="34" r="1.6" fill="#FFF" opacity=".8"/><circle cx="20" cy="28" r="1.1" fill="#FFF" opacity=".8"/></svg>',
  owlclock: '<svg viewBox="0 0 60 46"><path d="M12 8l6 6M48 8l-6 6" stroke="#8A5A33" stroke-width="4" stroke-linecap="round"/><ellipse cx="30" cy="26" rx="22" ry="19" fill="#B07A4C" stroke="#7A5233" stroke-width="2"/><circle cx="21" cy="22" r="8" fill="#FFF8EA"/><circle cx="39" cy="22" r="8" fill="#FFF8EA"/><path d="M21 22v-5M21 22l3 2M39 22v-5M39 22l-3 2" stroke="#2B2024" stroke-width="1.6" stroke-linecap="round"/><path d="M27 30l3 4 3-4z" fill="#F2A65A"/><path d="M16 38q14 6 28 0" stroke="#7A5233" stroke-width="2" fill="none"/></svg>',
};
// ของในร้าน: slot = จุดวาง, lv = ปลดล็อกจาก Bond (ฟรี ร้านไม่มีขาย)
export const ITEMS = [
  { id: 'lv_frame', name: 'กรอบรูปคู่', price: 60, slot: 'lv_wall', art: A.frame },
  { id: 'lv_plant', name: 'ต้นไม้ใหญ่', price: 120, slot: 'lv_corner', art: A.plant },
  { id: 'lv_lantern', name: 'โคมกระดาษ', price: 90, slot: 'lv_ceiling', art: A.lantern },
  { id: 'lv_heartrug', name: 'พรมหัวใจ', price: 80, slot: 'lv_floor', art: A.heartrug },
  { id: 'bd_garland', name: 'ไฟดาวหัวเตียง', price: 100, slot: 'bd_head', art: A.garland },
  { id: 'bd_teddy', name: 'ตุ๊กตาหมี', price: 70, slot: 'bd_bed', art: A.teddy },
  { id: 'bd_starblanket', name: 'ผ้าห่มลายดาว', price: 250, slot: 'bd_blanket', art: A.starblanket },
  { id: 'kt_catclock', name: 'นาฬิกาแมว', price: 110, slot: 'kt_wall', art: A.catclock },
  { id: 'kt_cookies', name: 'โหลคุกกี้', price: 40, slot: 'kt_counter', art: A.cookies },
  { id: 'gd_birdhouse', name: 'บ้านนก', price: 130, slot: 'gd_post', art: A.birdhouse },
  { id: 'gd_pinwheel', name: 'กังหันลม', price: 50, slot: 'gd_deco', art: A.pinwheel },
  { id: 'cat_bed', name: 'เบาะแมว', price: 90, slot: 'lv_catbed', art: A.catbed, cat: true },
  { id: 'cat_collar', name: 'ปลอกคอกระดิ่ง', price: 60, slot: 'cat_neck', cat: true },
  { id: 'cat_beanie', name: 'หมวกไหมพรมแมว', price: 80, slot: 'cat_head', cat: true },
  { id: 'bd_starlamp', name: 'โคมดาวลอย', price: 0, lv: 3, slot: 'bd_ceiling', art: A.starlamp },
  { id: 'lv_aquarium', name: 'ตู้ปลาเรืองแสง', price: 0, lv: 5, slot: 'lv_corner', art: A.aquarium },
  { id: 'gd_fireflies', name: 'โหลหิ่งห้อย', price: 0, lv: 7, slot: 'gd_deco2', art: A.fireflies },
  { id: 'lv_owlclock', name: 'นาฬิกานกฮูก', price: 0, lv: 9, slot: 'lv_wall', art: A.owlclock },
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const ROOM_TABS = [
  { id: 'home', label: 'ห้องนั่งเล่น' }, { id: 'bedroom', label: 'ห้องนอน' }, { id: 'kitchen', label: 'ครัว' },
  { id: 'garden', label: 'สวน' }, { id: 'cat', label: 'ของแมว' }, { id: 'bond', label: 'รางวัล Bond' },
];
const itemTab = (it) => (it.lv ? 'bond' : it.cat ? 'cat' : SLOTS[it.slot].room);

// รางวัลจาก Bond: ท่าทางใหม่ (เลเวลคู่) ของพิเศษ (เลเวลคี่) ชุดคู่และพลุ (เลเวล 10)
export const ACT_LV = { dance: 2, piggy: 4, spin: 6, feed: 8 };
export const bondLevel = (ctx) => bondInfo(ctx.home?.bond || 0).level;

const owned = (ctx, id) => Boolean(ctx.home?.owned?.[id]);
const placedIn = (ctx, slot) => ctx.home?.placed?.[slot] || null;

// ของที่วางไว้ในห้องนี้ (ให้ฉากวาด)
export function decorFor(ctx, roomId) {
  const out = [];
  Object.entries(ctx.home?.placed || {}).forEach(([slot, id]) => {
    const s = SLOTS[slot]; const it = ITEM[id];
    if (!s || !it?.art || s.room !== roomId) return;
    out.push({ ...s, html: it.art, cls: `d-${id}` });
  });
  return out;
}
export function catAccFor(ctx) {
  const p = ctx.home?.placed || {};
  return { collar: p.cat_neck === 'cat_collar', hat: p.cat_head === 'cat_beanie' };
}
export const treeArt = (ctx) => treeSvg(treeStage(ctx.home?.tree_days || 0), isAnniv(ctx));

async function buy(ctx, it) {
  const { data, error } = await sb.rpc('shop_buy', { p_item: it.id, p_price: it.price });
  if (error || !data) { toast('ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง', 'error'); return; }
  if (!data.ok) { toast(`หัวใจยังไม่พอ ขาดอีก ${it.price - data.hearts}`); return; }
  ctx.home.hearts = data.hearts; ctx.home.owned = data.owned;
  await place(ctx, it, true);
  ctx.send('eco', { t: 'sync', bought: it.name, from: ctx.me.nickname });
  toast(`ได้${it.name}แล้ว วางไว้ให้เลย`);
  emit();
}
async function place(ctx, it, on) {
  const { data, error } = await sb.rpc('place_item', { p_slot: it.slot, p_item: on ? it.id : '' });
  if (error || !data) { toast('วางของไม่สำเร็จ', 'error'); return; }
  ctx.home.placed = data.placed;
  changed(ctx);
}

/* ---------- หน้าต่างภารกิจ / ร้าน / ต้นไม้ ---------- */
const HEART = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#E0607E" d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
export const QUEST_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M6 4a2 2 0 0 0-2 2v2h2M10 9h6M10 13h6M10 17h3"/></svg>';
const CLOSE = '<button type="button" class="icon-btn" data-close aria-label="ปิด"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

let sheet = null; // { ov, tab, shopTab }
function repaintSheet() { if (sheet?.ov?.isConnected) paintSheet(); }
export function openEco(ctx, tab = 'quests') {
  E.ctx = ctx;
  const { ov } = modal('eco-sheet', '<div class="eco-body"></div>', 'ภารกิจและร้านแต่งบ้าน');
  sheet = { ov, tab, shopTab: 'home' };
  ov.addEventListener('click', (e) => onSheetClick(ctx, e));
  paintSheet();
  if (E.loadedFor !== today()) loadQuests(ctx);
}
function questRow(q, st, reward) {
  const pctDone = Math.round((Math.min(st.progress, q.need) / q.need) * 100);
  return `<li class="eq-row${st.done ? ' done' : ''}">
    <span class="eq-check">${st.done ? CHECK : ''}</span>
    <span class="eq-main"><b>${esc(q.title)}</b><span class="eq-bar"><i style="width:${pctDone}%"></i></span></span>
    <span class="eq-side">${q.need > 1 ? `<small>${Math.min(st.progress, q.need)}/${q.need}</small>` : ''}<span class="eq-rw">${HEART}+${reward}</span></span></li>`;
}
function paintSheet() {
  const ctx = E.ctx; const { ov } = sheet;
  const body = ov.querySelector('.eco-body');
  const hearts = ctx.home?.hearts || 0;
  const d = today(); const w = weekStart();
  let main = '';
  if (sheet.tab === 'quests') {
    const dq = dailyQuests();
    const allDone = dq.every((q) => qGet(d, `d_${q.key}`).done);
    const bonus = qGet(d, 'd_bonus');
    const tdays = ctx.home?.tree_days || 0;
    const st = treeStage(tdays);
    const next = TREE_STAGES[st + 1];
    const watered = ctx.home?.water_day === d;
    main = `
      <h3 class="eco-h">ภารกิจวันนี้ <small>เริ่มใหม่ทุกเที่ยงคืน</small></h3>
      <ul class="eq-list">${dq.map((q) => questRow(q, qGet(d, `d_${q.key}`), D_REWARD)).join('')}
        <li class="eq-row bonus${bonus.done ? ' done' : ''}"><span class="eq-check">${bonus.done ? CHECK : ''}</span><span class="eq-main"><b>${allDone ? 'ครบทั้ง 3 ข้อแล้ว' : 'ทำครบทั้ง 3 ข้อ'}</b></span><span class="eq-side"><span class="eq-rw">${HEART}+${BONUS}</span></span></li></ul>
      <h3 class="eco-h">ภารกิจสัปดาห์นี้ <small>เริ่มใหม่ทุกวันจันทร์</small></h3>
      <ul class="eq-list">${weeklyQuests().map((q) => questRow(q, qGet(w, `w_${q.key}`), W_REWARD)).join('')}</ul>
      <div class="eco-tree">
        <span class="et-art">${treeSvg(st, isAnniv(ctx))}</span>
        <span class="et-txt"><b>ต้นไม้ของเรา: ${TREE_STAGES[st].name}</b><small>มาหากันทั้งคู่แล้ว ${tdays} วัน${next ? ` · อีก ${next.at - tdays} วันเป็น${next.name}` : ''}</small></span>
        <button type="button" class="btn small${watered ? '' : ' primary'}" data-water ${watered ? 'disabled' : ''}>${watered ? 'รดแล้ว' : 'รดน้ำ +5'}</button>
      </div>`;
  } else {
    const lv = bondLevel(ctx);
    const list = ITEMS.filter((it) => itemTab(it) === sheet.shopTab);
    main = `<div class="eco-chips" role="tablist">${ROOM_TABS.map((t) => `<button type="button" class="chip" data-shop="${t.id}" aria-pressed="${t.id === sheet.shopTab}">${t.label}</button>`).join('')}</div>
      ${sheet.shopTab === 'bond' ? `<p class="sheet-sub">Bond ตอนนี้ Lv.${lv} · เลเวลคู่ได้ท่าทางใหม่ เลเวลคี่ได้ของพิเศษ Lv.10 ได้เสื้อคู่และพลุในสวน</p>` : ''}
      <div class="eco-grid">${list.map((it) => shopCard(ctx, it, lv, hearts)).join('')}${sheet.shopTab === 'bond' ? bondExtras(lv) : ''}</div>`;
  }
  body.innerHTML = `
    <header class="sheet-head eco-head"><div class="eco-tabs" role="tablist">
      <button type="button" class="eco-tab" data-tab="quests" aria-selected="${sheet.tab === 'quests'}">ภารกิจ</button>
      <button type="button" class="eco-tab" data-tab="shop" aria-selected="${sheet.tab === 'shop'}">ร้านแต่งบ้าน</button></div>
      <span class="eco-wallet" aria-label="หัวใจในกระเป๋า ${hearts}">${HEART}<b>${hearts}</b></span>${CLOSE}</header>
    <div class="eco-scroll">${main}</div>`;
}
function itemPreview(it, ctx) {
  if (it.id === 'cat_collar') return catSvg(ctx.home?.cat_color, { collar: true });
  if (it.id === 'cat_beanie') return catSvg(ctx.home?.cat_color, { hat: true });
  return it.art;
}
function shopCard(ctx, it, lv, hearts) {
  const locked = it.lv && lv < it.lv;
  const have = owned(ctx, it.id) || (it.lv && !locked);
  const inSlot = placedIn(ctx, it.slot);
  const here = inSlot === it.id;
  let btn;
  if (locked) btn = `<button type="button" class="btn small" disabled>${LOCK} Bond Lv.${it.lv}</button>`;
  else if (!have) btn = `<button type="button" class="btn small${hearts >= it.price ? ' primary' : ''}" data-buy="${it.id}" ${hearts >= it.price ? '' : 'disabled'}>${HEART}${it.price}</button>`;
  else btn = `<button type="button" class="btn small${here ? '' : ' primary'}" data-place="${it.id}">${here ? 'เก็บ' : 'วาง'}</button>`;
  const swapNote = have && !here && inSlot && ITEM[inSlot] ? `<small class="ec-note">แทน${esc(ITEM[inSlot].name)}</small>` : '';
  return `<div class="ec-card${locked ? ' locked' : ''}${here ? ' on' : ''}"><span class="ec-art">${itemPreview(it, ctx)}</span><b>${esc(it.name)}</b>${swapNote}${btn}</div>`;
}
function bondExtras(lv) {
  const row = (need, name) => `<div class="ec-card${lv < need ? ' locked' : ' on'}"><span class="ec-art ec-txt">Lv.${need}</span><b>${name}</b><span class="btn small" aria-disabled="true">${lv < need ? `${LOCK} Bond Lv.${need}` : 'ปลดล็อกแล้ว'}</span></div>`;
  return row(2, 'ท่าเต้นด้วยกัน') + row(4, 'ท่าขี่หลัง') + row(6, 'ท่าจับมือหมุน') + row(8, 'ท่าป้อนขนม') + row(10, 'เสื้อคู่ + พลุในสวน');
}
function onSheetClick(ctx, e) {
  const t = e.target.closest('[data-tab]');
  if (t) { sheet.tab = t.dataset.tab; paintSheet(); return; }
  const sh = e.target.closest('[data-shop]');
  if (sh) { sheet.shopTab = sh.dataset.shop; paintSheet(); return; }
  const b = e.target.closest('[data-buy]');
  if (b) { b.disabled = true; buy(ctx, ITEM[b.dataset.buy]); return; }
  const p = e.target.closest('[data-place]');
  if (p) {
    const it = ITEM[p.dataset.place];
    // ของรางวัล Bond ที่ยังไม่ได้รับ: รับก่อน (ราคา 0) แล้ววางเลย
    if (it.lv && !owned(ctx, it.id)) { buy(ctx, it); return; }
    place(ctx, it, placedIn(ctx, it.slot) !== it.id);
    return;
  }
  if (e.target.closest('[data-water]')) waterTree(ctx);
}
export function openTree(ctx) { openEco(ctx, 'quests'); }

// ป้ายจำนวนภารกิจวันนี้ที่ยังไม่เสร็จ
export function paintQuestBadge() {
  const d = today();
  const left = dailyQuests().filter((q) => !qGet(d, `d_${q.key}`).done).length;
  document.querySelectorAll('[data-quest-badge]').forEach((el) => { el.textContent = String(left); el.hidden = left === 0 || E.loadedFor !== d; });
}

// เพื่อนซื้อของ: บอกให้รู้
export function ecoNotice(p) { if (p?.bought) toast(`${p.from || 'อีกคน'}ซื้อ${p.bought}ให้บ้านแล้ว`); }
