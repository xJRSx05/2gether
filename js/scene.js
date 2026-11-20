import { avatarSvg } from './avatar.js';
import { catSvg } from './cat.js';
import { WINDOW_ART, SEASON_TINT } from './rooms.js';
import { esc } from './ui.js';
import { timeOfDay, timeLightOn } from './days.js';
import { normalizeAvatar } from './avatar.js';
import { bedTopSvg } from './scenes-special.js';

const HEART = '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z" fill="#E0607E"/></svg>';
const CAT_LINES = ['เหมียว~', 'งื้ออ~', 'ครืดดด...', 'เมี้ยว!'];
const ACT_LINE = { hug: 'กอดๆ นะ', pat: 'โอ๋ๆ', kiss: 'จุ๊บๆ', highfive: 'เย้~', piggy: 'ขี่หลังหน่อย~' };
const ACT_TO_LINE = { piggy: 'ฮึบ!', feed: 'อร่อย~', dance: 'เย้~' };
const ACT_MS = { dance: 2800, piggy: 3000, spin: 2200, feed: 2800, kiss: 2400 };
// ขนมชิ้นเล็กในมือ (ท่าป้อนขนม)
const CAKE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h16v6H4z" fill="#F7D9A8" stroke="#8A5A33" stroke-width="1.5"/><path d="M4 14q8-6 16 0" fill="#F2A6B8" stroke="#8A5A33" stroke-width="1.5"/><circle cx="12" cy="9" r="2.4" fill="#E0485F"/></svg>';
// ของขยับในฉาก (ฝุ่นในแสงแดด ไอน้ำจากหม้อ ผีเสื้อในสวน) วาดทับภาพห้อง ใต้ตัวละคร
const ART_CACHE = new Map();
const P = (v, t) => `${((v / t) * 100).toFixed(2)}%`;
function ambientFx(R) {
  const motes = (x0, x1, y0, y1) => Array.from({ length: 9 }, (_, i) => `<i class="mote" style="left:${P(x0 + ((x1 - x0) * ((i * 37) % 100)) / 100, R.width)};top:${P(y0 + ((y1 - y0) * ((i * 61) % 100)) / 100, R.height)};animation-delay:${(-i * 1.7).toFixed(1)}s"></i>`).join('');
  if (R.id === 'home' || R.id === 'bedroom') return `<div class="motes">${motes(150, 380, 250, 420)}</div>`;
  if (R.id === 'kitchen') return [596, 654].map((x, k) => `<div class="steam" style="left:${P(x, R.width)};top:${P(k ? 226 : 218, R.height)}"><i></i><i></i><i></i></div>`).join('');
  if (R.id === 'garden') return ['a', 'b'].map((k) => `<svg class="bfly ${k}" viewBox="0 0 24 20"><g class="bw"><path d="M12 10C8 2 1 2 2 8s8 4 10 2z" fill="${k === 'a' ? '#F2A6B8' : '#9FB8D9'}"/><path d="M12 10c4-8 11-8 10-2s-8 4-10 2z" fill="${k === 'a' ? '#F2A6B8' : '#9FB8D9'}"/></g><path d="M12 6v9" stroke="#4A3A2A" stroke-width="1.6" stroke-linecap="round"/></svg>`).join('');
  return '';
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pct = (v, total) => `${(v / total) * 100}%`;

// ห้องหนึ่งห้อง (ห้องนั่งเล่น/ห้องนอน ตามค่าใน rooms.js): ตัวละครของเรา อีกคน แมว
// แตะพื้นเพื่อเดิน แตะเฟอร์นิเจอร์ (โซฟา/เตียง) เพื่อนั่ง/นอน แตะแมวเพื่อลูบ
export function mountScene(host, { room: R, season, me, avatar, catName, catColor, initialCat, catPresent: catInit, isHost: hostInit, ghost = false, catAcc: catAcc0 = null, on = {} }) {
  // ghost: ตัวเรานั่ง/นอนค้างอยู่อีกห้อง ห้องนี้ดูได้อย่างเดียว ไม่มีตัวเรา
  let isHost = hostInit !== false;
  let catPresent = catInit !== false;
  const POS_KEY = `2gether.pos.${R.id}`;
  const clampFloor = (p) => ({
    x: clamp(p.x, R.floor.x0, R.floor.x1),
    y: clamp(p.y, R.floor.y0, R.floor.y1),
  });
  const scaleAt = (y) => 0.82 + 0.3 * clamp((y - R.floor.y0) / (R.floor.y1 - R.floor.y0), 0, 1);
  const actors = [];
  const w = R.window;
  host.innerHTML = `
  <div class="cam">
    <img class="win-view" alt="" draggable="false" src="${WINDOW_ART[season] || WINDOW_ART.summer}"
         style="left:${pct(w.x, R.width)};top:${pct(w.y, R.height)};width:${pct(w.w, R.width)};height:${pct(w.h, R.height)}">
    <img class="room-art" alt="" draggable="false" src="${R.art}">
    <div class="amb-fx" aria-hidden="true">${ambientFx(R)}</div>
    <div class="actors"></div>
    <div class="tint" style="background:${SEASON_TINT[season] || 'transparent'}"></div>
    <div class="timelight"></div>
    ${R.lamp ? `<div class="lamp-glow" style="left:${pct(R.lamp.x, R.width)};top:${pct(R.lamp.y, R.height)}"></div>` : ''}
    <div class="door-light"></div>
    <div class="dim-layer"></div>
  </div>`;
  const cam = host.querySelector('.cam');
  const layer = host.querySelector('.actors');
  // จางฉากเข้าเมื่อภาพห้องโหลดเสร็จ (ไม่เห็นห้องว่างกระพริบ)
  const art = cam.querySelector('.room-art');
  const ready = () => cam.classList.add('ready');
  if (art.complete && art.naturalWidth) requestAnimationFrame(ready);
  else { art.addEventListener('load', ready, { once: true }); art.addEventListener('error', ready, { once: true }); setTimeout(ready, 1500); }
  cam.dataset.room = R.id;
  // แสงตามเวลาจริง (เวลาไทย): เช้า กลางวัน เย็น กลางคืน ปิดได้ในหน้าตั้งค่า
  const paintTime = () => { cam.dataset.time = timeLightOn() ? timeOfDay() : 'off'; };
  paintTime();
  const timeT = setInterval(paintTime, 60000);
  window.addEventListener('timelight', paintTime);

  function makeActor(kind, svg, tag, speed, idlePose) {
    const el = document.createElement('div');
    el.innerHTML = `${tag ? `<span class="tag">${esc(tag)}</span>` : ''}<div class="inner">${svg}</div><div class="bubble" hidden></div>${kind === 'cat' ? HEART : ''}`;
    layer.appendChild(el);
    const a = { kind, el, inner: el.querySelector('.inner'), bubble: el.querySelector('.bubble'), x: 0, y: 0, facing: 1, pose: '', target: null, speed, onArrive: null, idlePose, bubbleT: 0, extra: new Set(), z: 0, restAt: 0 };
    actors.push(a);
    setPose(a, idlePose);
    return a;
  }
  const paintCls = (a) => { a.el.className = `actor ${a.kind} pose-${a.pose} ${[...a.extra].join(' ')}`.trim(); };
  const addCls = (a, ...c) => { c.forEach((x) => a.extra.add(x)); paintCls(a); };
  const delCls = (a, ...c) => { c.forEach((x) => a.extra.delete(x)); paintCls(a); };
  function setPose(a, pose) {
    if (a.pose === pose) return;
    a.pose = pose;
    if (pose === R.restPose) a.restAt = performance.now();
    paintCls(a);
    // ห้องนอน: มีคนนอนอยู่ = หรี่ไฟ
    if (R.restPose === 'lie') cam.classList.toggle('dim', actors.some((x) => x.pose === 'lie'));
  }
  function place(a) {
    a.el.style.left = pct(a.x, R.width);
    a.el.style.top = pct(a.y, R.height);
    a.el.style.zIndex = String(Math.round(a.y + a.z));
    a.inner.style.setProperty('--face', a.facing);
    a.inner.style.setProperty('--s', scaleAt(a.y).toFixed(3));
  }
  function say(a, text, ms = 5500) {
    a.bubble.textContent = text;
    a.bubble.hidden = false;
    clearTimeout(a.bubbleT);
    a.bubbleT = setTimeout(() => { a.bubble.hidden = true; }, ms);
  }
  function moveTo(a, x, y, onArrive) {
    a.target = { x, y };
    a.onArrive = onArrive || null;
  }

  const decorEls = [];
  const meA = makeActor('me', avatarSvg(avatar), me, 150, 'stand');
  let catAcc = catAcc0;
  const catA = makeActor('cat', catSvg(catColor, catAcc), catName, 85, 'idle');
  let catLook = String(catColor);

  // ตำแหน่งเริ่มต้น (จำที่เดินไว้ล่าสุดในเครื่องนี้)
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { /* ไม่เป็นไร */ }
  const start = saved && Number.isFinite(saved.x) ? saved : { ...R.start.me, sit: false };
  meA.x = start.x; meA.y = start.y;
  if (start.sit) { meA.x = R.seats[0].x; meA.y = R.seats[0].y; setPose(meA, R.restPose); }
  const cat0 = initialCat && initialCat.room === R.id ? initialCat : null;
  catA.x = cat0?.x ?? R.start.cat.x;
  catA.y = cat0?.y ?? R.start.cat.y;
  if (cat0?.pose === 'sleep') setPose(catA, 'sleep');
  catA.el.hidden = !catPresent;
  place(meA); place(catA);
  if (ghost) meA.el.hidden = true;

  const myState = () => ({ room: R.id, x: Math.round(meA.x), y: Math.round(meA.y), sit: meA.pose === R.restPose });
  const catState = () => ({ room: R.id, x: Math.round(catA.x), y: Math.round(catA.y), pose: catA.pose === 'sleep' ? 'sleep' : 'idle' });
  const savePos = () => {
    if (ghost) return;
    try { localStorage.setItem(POS_KEY, JSON.stringify({ ...myState(), at: Date.now() })); } catch { /* ไม่เป็นไร */ }
    on.state?.(myState());
  };
  if (!ghost) on.state?.(myState());

  /* ---------- การกระทำของเรา ---------- */
  function goFloor(p) {
    const t = clampFloor(p);
    on.move?.({ x: Math.round(t.x), y: Math.round(t.y), sit: false });
    moveTo(meA, t.x, t.y, savePos);
  }
  function goRest() {
    if (!R.seats) return;
    const s = R.seats[0];
    on.move?.({ x: s.x, y: s.y, sit: true });
    moveTo(meA, s.x, s.y, () => { meA.facing = 1; setPose(meA, R.restPose); place(meA); savePos(); });
  }
  let happyT = 0;
  function happy(text) {
    if (!catPresent) return;
    catA.target = null;
    setPose(catA, 'happy');
    say(catA, text || CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)], 2600);
    clearTimeout(happyT);
    happyT = setTimeout(() => setPose(catA, 'idle'), 2600);
  }
  function petCat() {
    if (!catPresent) return;
    const dir = meA.x < catA.x ? -1 : 1;
    const t = clampFloor({ x: catA.x + dir * 64, y: catA.y });
    on.move?.({ x: Math.round(t.x), y: Math.round(t.y), sit: false });
    moveTo(meA, t.x, t.y, () => { meA.facing = -dir; place(meA); savePos(); happy(); on.pet?.(); });
  }

  /* ---------- การแตะ ---------- */
  const toScene = (ev) => {
    const r = cam.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * R.width, y: ((ev.clientY - r.top) / r.height) * R.height };
  };
  const hitCat = (p) => catPresent && Math.abs(p.x - catA.x) < 46 && p.y > catA.y - 84 && p.y < catA.y + 14;
  const inRest = (p) => R.rest && p.x >= R.rest.x && p.x <= R.rest.x + R.rest.w && p.y >= R.rest.y && p.y <= R.rest.y + R.rest.h;
  const hitPartner = (p) => pA && !pA.leaving && Math.abs(p.x - pA.x) < 44 && p.y > pA.y - 150 * scaleAt(pA.y) && p.y < pA.y + 10;
  const onDown = (ev) => {
    if (ghost) { on.ghostTap?.(); return; }
    const p = toScene(ev);
    if (hitPartner(p)) { on.tapPartner?.({ x: ev.clientX, y: ev.clientY, resting: pA.pose === R.restPose }); return; }
    if (hand === 'partner') { on.notice?.('กำลังจับมือเดินตามอยู่ แตะตัวเขาเพื่อปล่อยมือ'); return; }
    if (hitCat(p)) petCat();
    else if (inRest(p)) { if (hand) releaseHands(true); goRest(); }
    else goFloor(p);
  };
  host.addEventListener('pointerdown', onDown);

  /* ---------- แมวเดินเล่นเอง (เจ้าบ้านเป็นคนตัดสินใจ อีกเครื่องทำตามที่ส่งมา) ---------- */
  let nextWander = performance.now() + 7000;
  let wakeAt = 0;
  function catGo(m) {
    if (!catPresent || (m.room && m.room !== R.id)) return;
    if (Math.hypot(catA.x - m.fx, catA.y - m.fy) > 12) { catA.x = m.fx; catA.y = m.fy; place(catA); }
    if (catA.pose === 'sleep') setPose(catA, 'idle');
    moveTo(catA, m.tx, m.ty, () => {
      if (m.sleep) { setPose(catA, 'sleep'); wakeAt = performance.now() + m.sleepMs; }
      on.catState?.(catState());
    });
  }
  const wanderT = setInterval(() => {
    const now = performance.now();
    if (catA.pose === 'sleep') { if (now > wakeAt) { setPose(catA, 'idle'); on.catState?.(catState()); } return; }
    if (!catPresent || !isHost || catA.target || catA.pose === 'happy' || now < nextWander) return;
    nextWander = now + 20000 + Math.random() * 20000;
    // มีคนนอนอยู่ในห้องนอน แมวมักไปนอนข้างเตียง
    const toBed = R.catSpot && actors.some((x) => x.pose === 'lie') && Math.random() < 0.6;
    const t = toBed ? R.catSpot : clampFloor({
      x: catA.x + (Math.random() - 0.5) * 340,
      y: R.floor.y0 + 14 + Math.random() * (R.floor.y1 - R.floor.y0 - 20),
    });
    const m = {
      room: R.id,
      fx: Math.round(catA.x), fy: Math.round(catA.y), tx: Math.round(t.x), ty: Math.round(t.y),
      sleep: toBed || Math.random() < 0.35, sleepMs: Math.round(15000 + Math.random() * 10000),
    };
    on.cat?.(m);
    catGo(m);
  }, 1500);

  /* ---------- อีกคน ---------- */
  let pA = null;
  let firstSync = true;
  const seatFor = (pos) => (pos?.sit ? R.seats[1] : clampFloor(pos || R.start.me));
  const posHere = (pos) => (pos && pos.room === R.id ? pos : null);
  function partnerGo(m) {
    if (!pA) return;
    const t = seatFor(m);
    pA.leaving = false;
    moveTo(pA, t.x, t.y, () => {
      if (m.sit) { pA.facing = 1; setPose(pA, R.restPose); place(pA); }
    });
  }
  function partnerLeave() {
    if (!pA || pA.leaving) return;
    if (hand) releaseHands(false);
    pA.leaving = true;
    const a = pA;
    moveTo(a, R.door.x, Math.min(a.y, R.floor.y1), () => {
      if (pA === a && a.leaving) {
        a.el.remove();
        clearTimeout(a.bubbleT);
        actors.splice(actors.indexOf(a), 1);
        pA = null;
        cam.classList.toggle('dim', R.restPose === 'lie' && actors.some((x) => x.pose === 'lie'));
      }
    });
  }
  // info = { nickname, avatar, pos } ของอีกคนตอนเขาอยู่ห้องนี้ หรือ null ถ้าไม่อยู่
  function syncPartner(info) {
    const enter = !firstSync;
    firstSync = false;
    if (!info) { partnerLeave(); return; }
    const pos = posHere(info.pos);
    if (!pA) {
      pA = makeActor('partner', avatarSvg(info.avatar), info.nickname, 150, 'stand');
      pA.body = normalizeAvatar(info.avatar).body;
      pA.av = info.avatar;
      const t = seatFor(pos);
      if (enter) {
        pA.x = R.door.x; pA.y = t.y; place(pA);
        partnerGo(pos || {});
      } else {
        pA.x = t.x; pA.y = t.y;
        if (pos?.sit) setPose(pA, R.restPose);
        place(pA);
      }
      return;
    }
    pA.body = normalizeAvatar(info.avatar).body;
    if (pA.leaving) { pA.target = null; partnerGo(pos || {}); return; }
    if (hand === 'me' || together || pA.target || !pos) return;
    const t = seatFor(pos);
    if (Math.hypot(pA.x - t.x, pA.y - t.y) > 24 || Boolean(pos.sit) !== (pA.pose === R.restPose)) partnerGo(pos);
  }

  /* ---------- ท่าทางกับอีกคน: กอด ลูบหัว หอมแก้ม ไฮไฟว์ ---------- */
  const headY = (a) => a.y - 112 * scaleAt(a.y);
  function burst(x, y, kind) {
    const n = document.createElement('span');
    n.className = `burst ${kind}`;
    n.style.left = pct(x, R.width);
    n.style.top = pct(y, R.height);
    n.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
    layer.appendChild(n);
    setTimeout(() => n.remove(), 1700);
  }
  let actT = 0;
  let acting = 0;
  function play(kind, from, to) {
    from.facing = to.x >= from.x ? 1 : -1;
    // ขี่หลัง: คนถูกขี่หันไปทางเดียวกัน (หลังให้คนขี่)
    to.facing = kind === 'piggy' ? from.facing : -from.facing;
    place(from); place(to);
    [from, to].forEach((x) => { delCls(x, 'act-hug', 'act-pat', 'act-kiss', 'act-highfive', 'act-dance', 'act-piggy', 'act-spin', 'act-feed', 'act-from', 'act-to'); x.el.querySelector('.act-prop')?.remove(); });
    const ms = ACT_MS[kind] || 2300;
    acting = performance.now() + ms;
    void from.el.offsetWidth;
    addCls(from, `act-${kind}`, 'act-from');
    addCls(to, `act-${kind}`, 'act-to');
    burst((from.x + to.x) / 2, Math.min(headY(from), headY(to)), kind === 'highfive' ? 'star' : 'heart');
    // คนกดพูด (ไฮไฟว์พูดพร้อมกันทั้งคู่)
    const line = ACT_LINE[kind];
    if (line) say(from, line, 2800);
    if (kind === 'highfive') say(to, line, 2800);
    if (kind === 'pat') setTimeout(() => say(to, 'อิอิ ♥', 1800), 900);
    if (ACT_TO_LINE[kind]) setTimeout(() => say(to, ACT_TO_LINE[kind], 2000), kind === 'feed' ? 1300 : 700);
    if (kind === 'dance') say(from, 'เต้นกัน~', 2400);
    if (kind === 'feed') from.el.insertAdjacentHTML('beforeend', `<span class="act-prop">${CAKE}</span>`);
    if (kind === 'spin' || kind === 'dance') setTimeout(() => burst((from.x + to.x) / 2, Math.min(headY(from), headY(to)), kind === 'spin' ? 'star' : 'heart'), ms / 2);
    if (kind === 'piggy') { from.z = -30; place(from); }
    clearTimeout(actT);
    actT = setTimeout(() => [from, to].forEach((x) => { delCls(x, `act-${kind}`, 'act-from', 'act-to'); x.el.querySelector('.act-prop')?.remove(); if (x.z === -30) { x.z = 0; place(x); } }), ms);
  }
  // ระยะยืนก่อนทำท่า: หอมแก้มยืนห่างขึ้นหน่อย จะได้เห็นการโน้มตัวชัด (ไม่บังกัน)
  const GAP = { kiss: 78 };
  function approach(a, b, cb, kind) {
    const side = a.x <= b.x ? -1 : 1;
    const t = clampFloor({ x: b.x + side * (GAP[kind] || 56), y: b.y });
    if (Math.hypot(a.x - t.x, a.y - t.y) < 6) { cb(); return; }
    moveTo(a, t.x, t.y, cb);
  }
  function doAct(kind) {
    if (ghost) return false;
    if (!pA || pA.leaving || pA.pose === R.restPose) return false;
    if (meA.pose === R.restPose) setPose(meA, 'stand');
    on.act?.({ k: kind });
    approach(meA, pA, () => { savePos(); play(kind, meA, pA); }, kind);
    return true;
  }
  function partnerAct(kind) {
    if (!pA || pA.leaving) return;
    if (meA.pose === R.restPose) { setPose(meA, 'stand'); savePos(); }
    approach(pA, meA, () => play(kind, pA, meA), kind);
  }

  /* ---------- จับมือ: คนชวนเดินนำ อีกคนเดินตาม ---------- */
  let hand = null; // 'me' = เราเดินนำ, 'partner' = เขาเดินนำ
  let handSaveT = 0;
  function holdHands(leader) {
    if (ghost || !pA || pA.leaving) return false;
    hand = leader;
    [meA, pA].forEach((a) => { if (a.pose === R.restPose) setPose(a, 'stand'); addCls(a, 'holding'); a.speed = 165; });
    burst((meA.x + pA.x) / 2, Math.min(headY(meA), headY(pA)), 'heart');
    return true;
  }
  function releaseHands(notify) {
    if (!hand) return;
    hand = null;
    [meA, pA].forEach((a) => { if (a) { delCls(a, 'holding'); a.speed = 150; } });
    savePos();
    if (notify) on.handOff?.();
  }
  function follow() {
    if (!hand || !pA || pA.leaving) return;
    const L = hand === 'me' ? meA : pA;
    const F = hand === 'me' ? pA : meA;
    const tx = clamp(L.x - L.facing * 50, R.floor.x0, R.floor.x1);
    const ty = L.y;
    if (Math.hypot(F.x - tx, F.y - ty) > 8) {
      F.target = { x: tx, y: ty };
      F.onArrive = null;
    }
    if (!F.target) { F.facing = L.facing; place(F); }
    if (F === meA && performance.now() - handSaveT > 900) { handSaveT = performance.now(); savePos(); }
  }

  /* ---------- นั่งตัก (โซฟา) / นอนกอด (เตียง) เมื่อพักพร้อมกันทั้งคู่ ---------- */
  let together = false;
  let focus = null;
  let zoom = 1;
  let lapHeartsT = 0;
  let topdown = null;
  const lapBase = R.seats ? { x: (R.seats[0].x + R.seats[1].x) / 2, y: R.seats[0].y } : null;
  let leanT = 0;
  function setTogether(v) {
    together = v;
    if (R.pair === 'lean') {
      // ม้านั่ง: นั่งข้างกัน หัวใจลอยเป็นระยะ
      clearInterval(leanT);
      if (v) {
        // นั่งข้างกันเฉยๆ ตัวละครไม่ขยับ มีหัวใจลอยเป็นระยะ
        const leaner = meA.restAt > pA.restAt ? meA : pA;
        on.together?.({ v: true, lapper: leaner === meA ? 'me' : 'partner' });
        const beat = () => burst((meA.x + pA.x) / 2, Math.min(headY(meA), headY(pA)) - 6, 'heart');
        setTimeout(beat, 500);
        leanT = setInterval(beat, 4200);
      } else on.together?.({ v: false });
    } else if (R.restPose === 'sit') {
      if (v) {
        // คนที่นั่งทีหลังนอนหนุนตักคนที่นั่งก่อน คนนั่งลูบหัวเป็นระยะ
        const lapper = meA.restAt > pA.restAt ? meA : pA;
        const base = lapper === meA ? pA : meA;
        base.x = lapBase.x - 52; base.y = lapBase.y; base.z = 0; base.facing = 1;
        lapper.x = base.x + 50; lapper.y = lapBase.y - 4; lapper.z = 60; lapper.facing = 1;
        lapper.awake = lapper.inner.innerHTML;
        lapper.inner.innerHTML = avatarSvg({ ...(lapper === meA ? avatar : pA.av), eyes: 'sleepy' });
        addCls(lapper, 'on-lap'); addCls(base, 'lap-base');
        on.together?.({ v: true, lapper: lapper === meA ? 'me' : 'partner' });
        // มือของคนนั่งที่วางบนหัว (วาดทับหัวคนนอน)
        const skin = normalizeAvatar(base === meA ? avatar : pA.av).skin;
        lapper.el.querySelector('.lap-hand')?.remove();
        lapper.el.insertAdjacentHTML('beforeend', `<svg class="lap-hand" viewBox="0 0 30 26" aria-hidden="true"><path d="M3 15c0-6 5-11 12-11s12 4 12 9c0 6-5 10-12 10H9c-3 0-6-3-6-8z" fill="${skin}" stroke="#3A2A24" stroke-width="2.4"/><path d="M12 8v6M17 7v7M22 9v5" stroke="#3A2A24" stroke-width="1.6" stroke-linecap="round" opacity=".45"/></svg>`);
        [meA, pA].forEach(place);
        cam.classList.add('lap');
        clearInterval(lapHeartsT);
        const pat = () => {
          addCls(base, 'lap-pat'); addCls(lapper, 'lap-pat');
          setTimeout(() => { delCls(base, 'lap-pat'); delCls(lapper, 'lap-pat'); }, 1400);
          burst(base.x + 40, lapBase.y - 110, 'heart');
        };
        lapHeartsT = setInterval(pat, 3500);
        setTimeout(pat, 600);
      } else {
        on.together?.({ v: false });
        clearInterval(lapHeartsT);
        cam.classList.remove('lap');
        [meA, pA].forEach((a) => {
          if (!a) return;
          a.z = 0;
          if (a.awake) { a.inner.innerHTML = a.awake; a.awake = null; }
          a.el.querySelector('.lap-hand')?.remove();
          delCls(a, 'on-lap', 'lap-base', 'lap-pat');
        });
        if (meA.pose === R.restPose) { meA.x = R.seats[0].x; meA.y = R.seats[0].y; }
        if (pA && pA.pose === R.restPose) { pA.x = R.seats[1].x; pA.y = R.seats[1].y; }
        [meA, pA].forEach((a) => a && place(a));
      }
    } else if (R.restPose === 'lie') {
      if (v) {
        topdown?.remove();
        topdown = document.createElement('div');
        topdown.className = 'topdown';
        topdown.innerHTML = bedTopSvg(avatar, pA.av);
        host.appendChild(topdown);
        // จอแนวตั้ง: ครอปข้างให้แคบลงแต่ยังเห็นโต๊ะข้างเตียงกับเครื่องเล่นแผ่นเสียง
        // จอแนวตั้งมองไม่เห็นโต๊ะข้างเตียง: วางเครื่องเล่นแผ่นเสียงไว้มุมซ้ายล่างของฉากแทน
        if (host.clientWidth / Math.max(1, host.clientHeight) < 1.25) {
          topdown.insertAdjacentHTML('beforeend', `<button type="button" class="td-rp td-rp-mini" aria-label="เครื่องเล่นแผ่นเสียง แตะเพื่อเลือกเพลง"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="10" fill="#E9C08B" stroke="#7A5233" stroke-width="3"/><g class="td-disc" style="transform-origin:28px 34px"><circle cx="28" cy="34" r="20" fill="#2B2430"/><circle cx="28" cy="34" r="12" fill="none" stroke="#4A4050" stroke-width="1.5"/><circle cx="28" cy="34" r="6" fill="#F2617F"/></g><path d="M52 10v18l-10 9" fill="none" stroke="#5A5A62" stroke-width="3.5" stroke-linecap="round"/><circle cx="52" cy="10" r="3.5" fill="#5A5A62"/></svg></button>`);
        }
        topdown.querySelectorAll('.td-rp').forEach((rp) => {
          rp.addEventListener('pointerdown', (e) => e.stopPropagation());
          rp.addEventListener('click', (e) => { e.stopPropagation(); on.musicProp?.(); });
          rp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.musicProp?.(); } });
        });
        requestAnimationFrame(() => topdown?.classList.add('on'));
      } else if (topdown) {
        const t = topdown;
        topdown = null;
        t.classList.remove('on');
        setTimeout(() => t.remove(), 700);
      }
    }
    on.together?.(v);
  }
  function checkTogether() {
    const v = Boolean(lapBase && pA && !pA.leaving && meA.pose === R.restPose && pA.pose === R.restPose && !meA.target && !pA.target);
    if (v !== together) setTogether(v);
  }

  /* ---------- วนเฟรม: เดิน + กล้องตามตัวละคร ---------- */
  function step(a, dt) {
    if (!a.target) return;
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    const len = a.speed * dt;
    if (d <= len) {
      a.x = a.target.x; a.y = a.target.y;
      a.target = null;
      const cb = a.onArrive;
      a.onArrive = null;
      setPose(a, a.idlePose);
      if (cb) cb();
    } else {
      a.x += (dx / d) * len;
      a.y += (dy / d) * len;
      if (Math.abs(dx) > 2) a.facing = dx > 0 ? 1 : -1;
      setPose(a, 'walk');
    }
    place(a);
  }
  // ขนาดฉากเก็บไว้ อัปเดตเมื่อขนาดเปลี่ยนเท่านั้น (อ่านขนาดทุกเฟรมทำให้เบราว์เซอร์คำนวณหน้าใหม่ทุกเฟรม)
  let dims = null;
  const measure = () => { dims = { vw: host.clientWidth, vh: host.clientHeight, cw: cam.offsetWidth, ch: cam.offsetHeight }; };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
  ro?.observe(host);
  let lastCam = '';
  function camera() {
    if (!dims || !ro) measure();
    const { vw, vh, cw, ch } = dims;
    const lap = together && R.restPose === 'sit' && R.pair !== 'lean';
    const want = lap ? { x: lapBase.x + 10, y: lapBase.y - 50 } : { x: ghost ? (pA && !pA.leaving ? pA.x : R.width / 2) : meA.x, y: R.height / 2 };
    focus = focus ? { x: focus.x + (want.x - focus.x) * 0.1, y: focus.y + (want.y - focus.y) * 0.1 } : want;
    zoom += ((lap ? 1.9 : 1) - zoom) * 0.08;
    if (Math.abs(zoom - 1) < 0.002) zoom = 1;
    const fx = (focus.x / R.width) * cw;
    const fy = (focus.y / R.height) * ch;
    const tx = clamp(vw / 2 - fx * zoom, Math.min(0, vw - cw * zoom), 0);
    const ty = clamp(vh / 2 - fy * zoom, Math.min(0, vh - ch * zoom), 0);
    const tf = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom.toFixed(4)})`;
    if (tf !== lastCam) { lastCam = tf; cam.style.transform = tf; }
  }
  let last = performance.now();
  // หน้าต่างดูหนัง/เกมบังฉากทั้งหมด: พักการวาดฉากไว้ก่อน ประหยัดแบต
  const covered = () => { const c = document.documentElement.classList; return c.contains('tv-open') || c.contains('game-open'); };
  let raf = requestAnimationFrame(function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (covered()) { raf = requestAnimationFrame(tick); return; }
    step(meA, dt);
    if (catPresent) step(catA, dt);
    follow();
    if (pA) step(pA, dt);
    if (hand && pA && !pA.target && !meA.target) { const F = hand === 'me' ? pA : meA; const L = hand === 'me' ? meA : pA; F.facing = L.facing; place(F); }
    checkTogether();
    if (now > lookAt) { lookAt = now + 600; lookEach(); }
    camera();
    raf = requestAnimationFrame(tick);
  });

  // ยืนอยู่ใกล้กัน: หันไปมองอีกคน (ไม่ขัดตอนเดิน จับมือ หรือทำท่าทาง)
  let lookAt = 0;
  function lookEach() {
    if (!pA || pA.leaving || hand || ghost || performance.now() < acting) return;
    [[meA, pA], [pA, meA]].forEach(([a, b]) => {
      if (a.pose !== 'stand' || a.target || Math.abs(b.x - a.x) > 260) return;
      const f = b.x >= a.x ? 1 : -1;
      if (a.facing !== f) { a.facing = f; place(a); }
    });
  }

  // แมวยืนเฉยๆ: บิดขี้เกียจหรือเลียขาเป็นครั้งคราว (แต่ละเครื่องสุ่มเอง ไม่ต้องตรงกัน)
  const catIdleT = setInterval(() => {
    if (!catPresent || catA.pose !== 'idle' || catA.target || Math.random() < 0.35) return;
    const k = Math.random() < 0.5 ? 'cat-stretch' : 'cat-lick';
    addCls(catA, k);
    setTimeout(() => delCls(catA, k), 2700);
  }, 14000);

  // ภาพห้องแบบมีชีวิต: แทนรูปด้วย SVG ในหน้า (ผ้าม่านพลิ้ว ใบไม้ไหว นาฬิกาเดินจริง) โหมดประหยัดใช้รูปนิ่งเหมือนเดิม
  let destroyed = false;
  let clockT = 0;
  const paintClock = () => {
    const svgEl = cam.querySelector('.room-art.live svg');
    const hEl = svgEl?.querySelector('.a-hand-h');
    if (!hEl) return;
    const [hh, mm] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':').map(Number);
    // เข็มชั่วโมงในภาพชี้ราว 4 นาฬิกา (124 องศา) เข็มนาทีชี้ 12
    hEl.setAttribute('transform', `rotate(${(((hh % 12) * 30 + mm * 0.5) - 124).toFixed(1)} 412 82)`);
    svgEl.querySelector('.a-hand-m')?.setAttribute('transform', `rotate(${mm * 6} 412 82)`);
  };
  (async () => {
    if (document.documentElement.classList.contains('lite')) return;
    try {
      let t = ART_CACHE.get(R.art);
      if (!t) { const r = await fetch(R.art); if (!r.ok) return; t = await r.text(); ART_CACHE.set(R.art, t); }
      if (destroyed) return;
      const div = document.createElement('div');
      div.className = 'room-art live';
      div.innerHTML = t;
      const sv = div.querySelector('svg');
      if (!sv) return;
      sv.setAttribute('preserveAspectRatio', 'none');
      cam.querySelector('img.room-art')?.replaceWith(div);
      paintClock();
      clockT = setInterval(paintClock, 30000);
    } catch { /* ใช้รูปนิ่งต่อ */ }
  })();

  return {
    rest: () => { if (hand) releaseHands(true); goRest(); },
    doAct,
    partnerAct,
    holdHands,
    releaseHands,
    holding: () => hand,
    isTogether: () => together,
    roomId: R.id,
    // ลุกจากเตียง/โซฟา ไปยืนข้างๆ
    stand: () => goFloor({ x: R.seats[0].x - 90, y: R.start.me.y }),
    petCat,
    say: (text, ms) => say(catA, text, ms),
    happy,
    syncPartner,
    partnerGo,
    // พูดผ่านกรอบคำพูดเหนือหัวอีกคน ถ้าเขาอยู่ในฉาก (คืน true) ไม่งั้นคืน false
    partnerSay: (text) => {
      if (!pA || pA.leaving) return false;
      say(pA, text.length > 80 ? `${text.slice(0, 80)}...` : text, 10000);
      return true;
    },
    catGo,
    // เดินไปที่จุดหนึ่งแล้วค่อยทำต่อ (เช่น เดินไปหาเครื่องเล่นแผ่นเสียง)
    walkTo: (x, y, cb) => {
      if (ghost || meA.pose === R.restPose || hand === 'partner') { cb?.(); return; }
      if (hand) releaseHands(true);
      const t = clampFloor({ x, y });
      on.move?.({ x: Math.round(t.x), y: Math.round(t.y), sit: false });
      if (Math.hypot(meA.x - t.x, meA.y - t.y) < 12) { savePos(); cb?.(); return; }
      moveTo(meA, t.x, t.y, () => { savePos(); setTimeout(() => cb?.(), 120); });
    },
    // ออกจากห้อง: ยกเลิกทุกอย่างที่ทำค้างอยู่ (ลุกจากโซฟา/เตียง ปล่อยมือ)
    // ออกจากห้อง: ยกเลิกสิ่งที่ทำค้าง นั่ง/นอนอยู่ = ตัวละครอยู่ที่เดิมจนกว่าจะกลับมากดลุก
    leaveRoom: ({ keepHand = false } = {}) => {
      if (hand) releaseHands(!keepHand);
      if (ghost) return;
      if (meA.target) { meA.target = null; meA.onArrive = null; setPose(meA, 'stand'); }
      savePos();
    },
    resting: () => !ghost && meA.pose === R.restPose,
    // ของในฉากที่แตะได้ (เช่น เครื่องเล่นแผ่นเสียง) ใช้พิกัดห้อง ขยายตามกล้อง
    addProp: ({ x, y, w, h, html, label, cls = '', onTap }) => {
      // ภาพวางตามความลึกในฉาก (ตัวละครเดินบังได้) แต่พื้นที่แตะอยู่บนสุดเสมอ แตะได้แม้มีตัวละครยืนบัง
      const pos = `left:${pct(x - w / 2, R.width)};top:${pct(y - h, R.height)};width:${pct(w, R.width)};height:${pct(h, R.height)}`;
      const art = document.createElement('div');
      art.className = `prop ${cls}`;
      art.style.cssText = `${pos};z-index:${Math.round(y)}`;
      art.innerHTML = html;
      art.setAttribute('aria-hidden', 'true');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `prop-hit ${cls}`;
      b.setAttribute('aria-label', label);
      b.style.cssText = `${pos};z-index:1000`;
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('pointerenter', () => art.classList.add('hover'));
      b.addEventListener('pointerleave', () => art.classList.remove('hover'));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        art.classList.remove('tap'); void art.offsetWidth; art.classList.add('tap');
        onTap?.();
      });
      layer.append(art, b);
      return b;
    },
    // อีกคนสลับแอปหรือเปิดแชทอยู่: ตัวยังอยู่ แต่จางลงและมีไอคอนบนหัว
    setPartnerIdle: (kind) => {
      if (!pA) return;
      delCls(pA, 'idle-away', 'idle-chat');
      if (kind) addCls(pA, kind === 'away' ? 'idle-away' : 'idle-chat');
    },
    setHost: (v) => { isHost = v; },
    isResting: () => meA.pose === R.restPose,
    partnerResting: () => Boolean(pA && !pA.leaving && pA.pose === R.restPose),
    partnerHere: () => Boolean(pA && !pA.leaving),
    // แมวมาอยู่ในห้องนี้ (เมื่ออีกคนมาห้องเดียวกัน) หรือออกไป
    setCatPresent: (v, state) => {
      if (v === catPresent) return;
      catPresent = v;
      catA.el.hidden = !v;
      if (v) {
        const c = state && state.room === R.id ? state : null;
        catA.x = c?.x ?? R.start.cat.x; catA.y = c?.y ?? R.start.cat.y;
        catA.target = null;
        setPose(catA, c?.pose === 'sleep' ? 'sleep' : 'idle');
        place(catA);
      }
    },
    isCatPresent: () => catPresent,
    // อีกคนเปลี่ยนสกิน/สีแมว: วาดแมวใหม่โดยไม่ขยับตำแหน่ง
    // ของแต่งบ้านที่วางไว้ (วาดตามความลึก ของปูพื้นอยู่ใต้ตัวละครเสมอ)
    setDecor: (list) => {
      decorEls.splice(0).forEach((e) => e.remove());
      list.forEach((d) => {
        const el = document.createElement('div');
        el.className = `decor ${d.cls || ''}`;
        el.style.cssText = `left:${pct(d.x - d.w / 2, R.width)};top:${pct(d.y - d.h, R.height)};width:${pct(d.w, R.width)};height:${pct(d.h, R.height)};z-index:${d.flat ? 1 : Math.round(d.y)}`;
        el.innerHTML = d.html;
        layer.appendChild(el);
        decorEls.push(el);
      });
    },
    setCatAcc: (acc) => {
      const k = JSON.stringify(acc || {});
      if (k === JSON.stringify(catAcc || {})) return;
      catAcc = acc;
      catA.inner.innerHTML = catSvg(catLook, catAcc);
    },
    setCatLook: (color) => {
      if (String(color) === catLook) return;
      catLook = String(color);
      catA.inner.innerHTML = catSvg(color, catAcc);
    },
    // อีกคนเปลี่ยนตัวละคร
    setPartnerAvatar: (av) => { if (pA) { if (pA.awake) { pA.awake = avatarSvg(av); pA.inner.innerHTML = avatarSvg({ ...av, eyes: 'sleepy' }); } else pA.inner.innerHTML = avatarSvg(av); pA.av = av; pA.body = normalizeAvatar(av).body; } },
    // ฉากบอกสถานะ: อีกคนเพิ่งกลับบ้าน (แสงจากประตู + แมวโบกมือ)
    arrive: (name) => {
      cam.classList.remove('arrive');
      void cam.offsetWidth;
      cam.classList.add('arrive');
      setTimeout(() => cam.classList.remove('arrive'), 2600);
      if (catPresent) say(catA, `${name || 'เขา'} กลับบ้านแล้ว!`, 3000);
    },
    getCat: catState,
    destroy() {
      destroyed = true;
      clearInterval(clockT);
      clearInterval(catIdleT);
      ro?.disconnect();
      clearInterval(lapHeartsT);
      clearInterval(leanT);
      clearTimeout(actT);
      topdown?.remove();
      cancelAnimationFrame(raf);
      clearInterval(wanderT);
      clearInterval(timeT);
      window.removeEventListener('timelight', paintTime);
      clearTimeout(happyT);
      clearTimeout(catA.bubbleT);
      if (pA) clearTimeout(pA.bubbleT);
      on.catState?.(catState());
      host.removeEventListener('pointerdown', onDown);
      host.innerHTML = '';
    },
  };
}
