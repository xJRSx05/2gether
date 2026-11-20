import { configured, sb } from './supabase.js';
import { applyTheme } from './theme.js';
import { refreshApp, toast, logoMark, esc, notify } from './ui.js';
import { startAmbient, heartRain } from './fx.js';
import { applyLite } from './perf.js';
import { handleAdminEvent } from './admin.js';
import { handleTvEvent, tvWatching, tvPresence, tvOpen, closeTV, tvMessage, tvTogether } from './tv.js';
import { handleMusicEvent, spotifyReturn, leaveMusic, loadSpotifyLink, warmMusic, musicListening, musicPresence, musicTogether } from './music.js';
import { sendPush, setAppBadge, pushFailText, syncPush } from './push.js';
import { openPicker, handleInviteEvent } from './play-invite.js';
import { catSvg } from './cat.js';
import { avatarSvg } from './avatar.js';
import { renderAuth } from './auth.js';
import { renderOnboarding } from './onboarding.js';
import { renderAvatarEditor } from './avatar-editor.js';
import { renderCatSetup } from './cat-setup.js';
import { home } from './home.js';
import { anchorRoom } from './room-view.js';
import { loadQuests, treeVisit, startMediaClock, bump, handleEcoEvent, ecoNotice } from './eco.js';
import { msgPreview } from './stickers.js';
import { settings } from './settings.js';
import { memory } from './memory.js';
import { bedroom } from './bedroom.js';
import { kitchen } from './kitchen.js';
import { garden } from './garden.js';
import { gamesHub } from './games-hub.js';
import { dayNumber, isMilestone, todayIso } from './days.js';
import { joinRoom } from './presence.js';
import { isHost } from './host.js';
import { bondInfo } from './bond.js';
import { chatPage, createChatView } from './chat.js';
import { chat, loadChat, onChat, handleChatEvent, resetChat, markRead } from './chat-store.js';

const root = document.getElementById('app');

const ctx = {
  me: null,
  partner: null,
  home: null,
  partnerPresence: null,
  conn: 'connecting',
  route: 'home',
  room: null,
  since: 0,       // เวลาที่เราเข้าห้องเรียลไทม์ (ใช้ตัดสินว่าใครเป็นเจ้าบ้านที่คุมแมว)
  pos: null,      // ตำแหน่งของเราในห้องนั่งเล่น
  catState: null, // ตำแหน่งแมวล่าสุดที่รู้
  sleeping: false, // เรากำลังนอนอยู่บนเตียงในห้องนอนหรือไม่
};

const VIEWS = {
  home,
  chat: chatPage,
  bedroom,
  kitchen,
  garden,
  games: gamesHub,
  memory,
  settings,
};
let current = null;

const ICONS = {
  home: '<path d="M4 12V9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><rect x="3" y="12" width="18" height="6" rx="2"/><path d="M6 18v2M18 18v2"/>',
  kitchen: '<path d="M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M3 10h18M9 6c0-1.5 1.5-1.5 1.5-3M14 6c0-1.5 1.5-1.5 1.5-3"/>',
  garden: '<path d="M12 21V11M12 11c0-4 3-6 6-6 0 4-2 6-6 6zM12 15c0-3-2-5-5-5 0 3 2 5 5 5z"/>',
  bedroom: '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.5"/>',
  games: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14" r="1"/>',
  memory: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10M10 8h4"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8.5 9h7M8.5 12h4"/>',
};
// เมนูล่างบนมือถือมี 5 ห้อง ส่วนสมุดกับตั้งค่าอยู่บนหัวเว็บ (จอใหญ่แสดงครบในแถบข้าง)
const TAB_ROOMS = ['home', 'kitchen', 'garden', 'bedroom', 'games'];
const WIDE = matchMedia('(min-width: 1200px)');
const ROOMS = [
  ['home', 'นั่งเล่น'],
  ['kitchen', 'ครัว'],
  ['garden', 'สวน'],
  ['bedroom', 'ห้องนอน'],
  ['games', 'ห้องเกม'],
  ['memory', 'สมุด'],
  ['settings', 'ตั้งค่า'],
];
const svgIcon = (key, size = 24) => `
  <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
       stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>`;

const CONN_LABEL = {
  connecting: 'กำลังเชื่อมต่อ',
  ok: 'เชื่อมต่อแล้ว',
  error: 'เชื่อมต่อไม่ได้',
  closed: 'หลุดการเชื่อมต่อ',
};

/* ---------- ฟังก์ชันที่หน้าอื่นเรียกใช้ ---------- */

ctx.updateProfile = async (patch) => {
  const { data, error } = await sb
    .from('profiles').update(patch).eq('id', ctx.me.id).select().single();
  if (error) {
    toast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
    return false;
  }
  ctx.me = data;
  applyTheme(data.season);
  ctx.room?.track();
  paintHeader();
  return true;
};

ctx.saveHome = async (patch) => {
  const { data, error } = await sb
    .from('home')
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) {
    toast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
    return false;
  }
  ctx.home = data;
  ctx.send('home', { row: data });
  paintHeader();
  return true;
};

ctx.nudge = () => {
  if (!ctx.partnerPresence || !ctx.room) return false;
  ctx.room.nudge({ from: ctx.me.nickname });
  toast(`เรียก ${ctx.partnerPresence.nickname || 'อีกคน'} แล้ว`);
  return true;
};

ctx.send = (event, payload) => ctx.room?.send(event, payload);
ctx.setPos = (pos) => {
  ctx.pos = pos;
  ctx.sleeping = pos.room === 'bedroom' && Boolean(pos.sit);
  ctx.room?.track();
};
ctx.setCat = (cat) => { ctx.catState = cat; if (isHost(ctx)) ctx.room?.track(); };

// เพิ่มแต้ม Bond ผ่านฟังก์ชันในฐานข้อมูล (จำกัดต่อวันที่นั่น) แล้วบอกอีกคน
ctx.addBond = async (kind) => {
  const { data, error } = await sb.rpc('add_bond', { kind });
  if (error || !data) return;
  applyBond(data.bond);
  ctx.send('bond', { bond: data.bond });
};

// Bond รายวัน: ราตรีสวัสดิ์/สวัสดีตอนเช้า คนละ 1 ครั้งต่อวัน คืน true ถ้าได้แต้ม
ctx.awardDaily = async (kind) => {
  const { data, error } = await sb.rpc('award_daily', { kind });
  if (error || !data) return false;
  applyBond(data.bond);
  ctx.send('bond', { bond: data.bond });
  return true;
};

// จบเกมร่วมมือ: บันทึกผล + Bond +3 (ครั้งแรกของวันต่อเกม) คืน true ถ้าได้แต้ม
ctx.awardGame = async (game, stars, score) => {
  // ภารกิจ: เล่นเกมด้วยกัน / ทำอาหารให้แมว (เครื่องคนชวนบันทึกผลเครื่องเดียว)
  bump(ctx, 'game').catch(() => {});
  if (game === 'cookcat') bump(ctx, 'cat').catch(() => {});
  const { data, error } = await sb.rpc('award_game', { game, stars, score });
  if (error || !data) return false;
  if (data.awarded) {
    applyBond(data.bond);
    ctx.send('bond', { bond: data.bond });
  }
  return Boolean(data.awarded);
};

// ของสะสมที่ได้จากเกม (ปลา/ดอกไม้) บันทึกถาวร
ctx.addItems = async (kind, species) => {
  await sb.rpc('add_items', { kind, species });
};

// วันครบ 100/200/300/ครบปี: ขอแต้มโบนัสจากเซิร์ฟเวอร์ (ได้ครั้งเดียวต่อหลักไมล์ ใครขอก่อนก็ได้)
ctx.checkMilestone = async () => {
  const n = dayNumber(ctx.home?.start_date);
  if (!n || !isMilestone(n)) return;
  const { data } = await sb.rpc('claim_milestone');
  if (data) {
    applyBond(data.bond);
    ctx.send('bond', { bond: data.bond });
  }
};

function applyBond(points) {
  const before = bondInfo(ctx.home?.bond).level;
  if (!ctx.home || Number(points) <= (ctx.home.bond || 0)) return;
  ctx.home = { ...ctx.home, bond: points };
  const after = bondInfo(points).level;
  if (after > before) toast(`Bond ขึ้นเป็นระดับ ${after} แล้ว!`);
  current?.bondChanged?.(ctx);
}

// ออกจากระบบ: ฉาก "ออกจากบ้าน" สั้นๆ ก่อน
ctx.signOut = async () => {
  leaveMusic();
  if (ctx.me) {
    const ov = document.createElement('div');
    ov.className = 'farewell';
    ov.setAttribute('role', 'status');
    ov.innerHTML = `<div class="fw-scene" aria-hidden="true">
        <span class="fw-av">${avatarSvg(ctx.me.avatar)}</span>
        <span class="fw-cat pose-happy">${catSvg(ctx.home?.cat_color)}</span>
      </div>
      <p class="fw-title">ไปก่อนนะ</p>
      <p class="fw-sub">${esc(ctx.home?.cat_name || 'แมว')} จะเฝ้าบ้านรอเธอกลับมา</p>`;
    document.body.appendChild(ov);
    await new Promise((r) => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : 1900));
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 500);
  }
  await sb.auth.signOut();
};
ctx.enterApp = () => proceed();
ctx.editAvatar = () => renderAvatarEditor(root, ctx, {
  onDone: () => { showShell(); location.hash = '#/settings'; },
  onCancel: () => { showShell(); location.hash = '#/settings'; },
});

/* ---------- โหลดข้อมูล ---------- */

// รอเซิร์ฟเวอร์ไม่เกินเวลาที่กำหนด (เน็ตค้าง = แจ้งให้ลองใหม่ ไม่ค้างจอขาว)
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => { setTimeout(() => rej(new Error('timeout')), ms); })]);
async function loadAll(user) {
  const [prof, homeRes] = await within(Promise.all([
    sb.from('profiles').select('*'),
    sb.from('home').select('*'),
  ]), 12000);
  if (prof.error) throw prof.error;
  if (homeRes.error) throw homeRes.error;

  let me = prof.data.find((p) => p.id === user.id);
  if (!me) {
    const nickname = (user.email || 'เรา').split('@')[0].slice(0, 20);
    const ins = await sb.from('profiles').insert({ id: user.id, nickname }).select().single();
    if (ins.error) throw ins.error;
    me = ins.data;
    prof.data.push(me);
  }
  ctx.me = me;
  if (user.email) ctx.email = user.email.toLowerCase();
  ctx.partner = prof.data.find((p) => p.id !== user.id) || null;
  ctx.home = homeRes.data?.[0] || null;
}

async function start(user) {
  try {
    await loadAll(user);
  } catch (err) {
    console.error(err);
    const needStep2 = /home|42P01|PGRST205|avatar/i.test(`${err?.message} ${err?.code}`);
    if (err?.message === 'timeout' || /fetch|network/i.test(err?.message || '')) {
      showFatal('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'เน็ตช้าหรือหลุดอยู่ ลองโหลดหน้านี้ใหม่อีกครั้ง');
      const b = document.createElement('button');
      b.className = 'btn primary'; b.type = 'button'; b.textContent = 'ลองใหม่'; b.style.marginBottom = '.75rem';
      b.addEventListener('click', () => location.reload());
      root.querySelector('#signOutFatal').before(b);
      return;
    }
    showFatal(
      needStep2 ? 'ยังไม่ได้รัน schema-step2.sql' : 'โหลดข้อมูลไม่ได้',
      needStep2
        ? 'เปิด Supabase > SQL Editor แล้วรันไฟล์ supabase/schema-step2.sql จากนั้นโหลดหน้านี้ใหม่'
        : 'ตรวจว่ารัน supabase/schema.sql แล้ว แล้วลองโหลดหน้านี้ใหม่',
    );
    return;
  }
  applyTheme(ctx.me.season);
  loadChat(ctx);
  loadSpotifyLink(ctx.me.id).then(warmMusic);
  // เครื่องนี้เปิดแจ้งเตือนไว้: ยืนยันกับเซิร์ฟเวอร์ทุกครั้งที่เปิดแอป (เครื่องหายจากรายการ / รหัสเปลี่ยน ก็กลับมาได้เอง)
  syncPush(ctx.me.id).catch(() => {});
  // ภารกิจ ต้นไม้ และนาฬิกานับเวลาดูหนัง/ฟังเพลงด้วยกัน
  loadQuests(ctx).catch(() => {});
  treeVisit(ctx).then((d) => { if (d?.both) visitDay = todayIso(); }).catch(() => {});
  startMediaClock(ctx, () => tvTogether() || (musicTogether() && Boolean(musicListening())));
  // เปิดแอปมาตอนตัวละครนั่ง/นอนค้างอยู่: บอกอีกฝ่ายตำแหน่งนั้นตั้งแต่แรก
  { const a = anchorRoom(); if (a && !ctx.pos) { ctx.pos = a.pos; ctx.sleeping = a.pos.room === 'bedroom'; } }
  ctx.checkMilestone();
  proceed();
}

// ตัดสินว่าผู้ใช้อยู่ขั้นไหน: ตั้งค่าครั้งแรก > สร้างตัวละคร > ตั้งชื่อแมว > เข้าบ้าน
function proceed() {
  window.__bootDone?.();
  const h = ctx.home;
  if (!ctx.me.onboarded) renderOnboarding(root, ctx);
  else if (!ctx.me.avatar) renderAvatarEditor(root, ctx, { first: true, onDone: proceed });
  else if (!h?.cat_name) renderCatSetup(root, ctx, { mode: 'propose', onDone: proceed });
  else if (!h.confirmed && h.proposed_by !== ctx.me.id) renderCatSetup(root, ctx, { mode: 'confirm', onDone: proceed });
  else showShell();
}

/* ---------- เรียลไทม์ ---------- */

function metaNow() {
  return {
    nickname: ctx.me.nickname,
    season: ctx.me.season,
    avatar: ctx.me.avatar,
    page: document.hidden ? 'away' : ctx.route,
    // ห้องที่ตัวละครเรายืนอยู่: เปิดแชทหรือสลับแอป ตัวละครก็ยังอยู่ห้องเดิม
    // นั่ง/นอนค้างไว้ห้องไหน ตัวละครอยู่ห้องนั้น แม้จอเราจะไปดูห้องอื่น
    room: anchorRoom()?.route || (SCENE_ROOMS.includes(ctx.route) ? ctx.route : prevRoute),
    watching: tvWatching(),
    listening: musicListening(),
    sleeping: ctx.sleeping,
    since: ctx.since,
    pos: ctx.pos,
    cat: ctx.catState,
  };
}

function setConn(state) {
  ctx.conn = state;
  const chip = document.getElementById('conn');
  if (chip) {
    chip.dataset.state = state;
    chip.querySelector('span').textContent = CONN_LABEL[state];
  }
}

let goneTimer = 0;
function startRoom() {
  ctx.room?.leave();
  lastJoinAt = Date.now();
  if (!ctx.since) ctx.since = Date.now();
  setConn('connecting');
  let warned = false;
  ctx.room = joinRoom({
    userId: ctx.me.id,
    getMeta: metaNow,
    onSync: (state) => {
      const other = Object.entries(state).find(([key]) => key !== ctx.me.id);
      if (other) {
        clearTimeout(goneTimer);
        goneTimer = 0;
        ctx.partnerPresence = other[1].at(-1);
      } else if (ctx.partnerPresence && !goneTimer) {
        // มือถือที่สลับแอปมักตัดสายก่อนทันบอกว่าไปไหน ตัวละครยังอยู่ในห้อง (จางลง) 30 นาทีก่อนนับว่าออกจากบ้านจริง
        ctx.partnerPresence = { ...ctx.partnerPresence, page: 'away' };
        goneTimer = setTimeout(() => {
          goneTimer = 0;
          ctx.partnerPresence = null;
          paintHeader();
          current?.update?.(ctx);
        }, AWAY_GRACE);
      }
      if (other && !ctx.partner) {
        loadAll({ id: ctx.me.id, email: '' }).then(() => { paintHeader(); current?.update?.(ctx); }).catch(() => {});
      }
      paintHeader();
      current?.update?.(ctx);
      tvPresence(ctx);
      musicPresence(ctx);
      // อีกคนออนไลน์วันนี้ครั้งแรก: นับวันที่มาหากันทั้งคู่ (ต้นไม้โต)
      if (ctx.partnerPresence && visitDay !== todayIso()) { visitDay = todayIso(); treeVisit(ctx).then((d) => { if (!d?.both) visitDay = ''; }).catch(() => {}); }
    },
    onEvent: (event, payload) => {
      const who = payload?.from || ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
      const face = faceHtml(ctx.partnerPresence?.avatar || ctx.partner?.avatar);
      if (event === 'nudge') {
        notify({ title: `${who} เรียกคุณ`, body: 'มาหาหน่อยสิ อยู่ในห้องนั่งเล่นนะ', icon: face, actions: ctx.route === 'home' ? [] : [{ label: 'ไปหา', primary: true, run: () => { location.hash = '#/home'; } }] });
        navigator.vibrate?.([80, 60, 80]);
        current?.ping?.(payload?.from);
      } else if (event === 'wake' || event === 'sleepinvite') {
        notify(event === 'wake'
          ? { title: `${who} ปลุกคุณ`, body: 'ตื่นได้แล้วนะ คนขี้เซา', icon: face }
          : { title: `${who} ชวนเข้านอน`, body: 'มานอนด้วยกันนะ', icon: face, actions: ctx.route === 'bedroom' ? [] : [{ label: 'ไปห้องนอน', primary: true, run: () => { location.hash = '#/bedroom'; } }] });
        navigator.vibrate?.([80, 60, 80]);
      } else if (event === 'game' && ['invite', 'accept', 'decline'].includes(payload?.t)) {
        handleInviteEvent(ctx, payload);
        current?.update?.(ctx); // ถ้าอยู่ห้องเดียวกันแล้ว เริ่มเกมได้ทันที
      } else if (event === 'miss') {
        heartRain();
        notify({ title: `${who} คิดถึงนะ`, body: 'ส่งหัวใจมาให้เต็มจอเลย', icon: face });
        navigator.vibrate?.([60, 40, 60]);
        current?.ping?.(payload?.from, 'miss');
      } else if (event === 'home') {
        // อีกคนแก้ข้อมูลบ้าน (เช่นวันเริ่มคบ)
        if (payload?.row) ctx.home = { ...ctx.home, ...payload.row, bond: Math.max(ctx.home?.bond || 0, payload.row.bond || 0) };
        paintHeader();
        current?.update?.(ctx);
      } else if (event === 'eco') {
        ecoNotice(payload);
        handleEcoEvent(ctx, payload);
      } else if (event === 'admin') {
        handleAdminEvent(payload);
      } else if (event === 'tv') {
        handleTvEvent(ctx, payload);
      } else if (event === 'music') {
        handleMusicEvent(ctx, payload);
      } else if (event === 'bond') {
        applyBond(payload?.bond);
      } else if (['msg', 'msgup', 'read', 'typing'].includes(event)) {
        handleChatEvent(ctx, event, payload);
        if (event === 'msg') {
          current?.onEvent?.(event, payload, ctx);
          if (payload?.row && !payload.row.deleted) tvMessage(ctx, payload.row, msgPreview(payload.row.body));
        }
      } else {
        current?.onEvent?.(event, payload, ctx);
      }
    },
    onStatus: (status) => {
      if (status === 'SUBSCRIBED') {
        setConn('ok');
        if (chat.ready) loadChat(ctx); // ดึงข้อความที่อาจพลาดตอนสายหลุด
      }
      else if (status === 'CLOSED') setConn('closed');
      else {
        setConn('error');
        if (!warned) {
          warned = true;
          toast('เชื่อมต่อเรียลไทม์ไม่ได้ ตรวจว่ารัน schema.sql ครบทุกข้อแล้ว', 'error');
        }
      }
    },
  });
}

// หลุดแล้วต่อใหม่เอง: มือถือพักหน้าจอแล้วสายเรียลไทม์มักขาด ต้องเข้าห้องใหม่ตอนกลับมา
let lastJoinAt = 0;
function ensureRoom() {
  if (!ctx.me || !ctx.room) return;
  if (ctx.conn === 'ok') ctx.room.track();
  else if (Date.now() - lastJoinAt > 3000) startRoom();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ctx.room?.track();
  else {
    ensureRoom();
    if (ctx.chatVisible()) markRead(ctx);
  }
});
window.addEventListener('online', () => { if (ctx.me && ctx.room) startRoom(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) ensureRoom(); });
setInterval(() => {
  if (!document.hidden && ctx.me && ctx.room && ctx.conn !== 'ok' && Date.now() - lastJoinAt > 8000) startRoom();
}, 5000);

// ทุก 5 นาทีที่อยู่บ้านพร้อมกัน ได้ +1 (เจ้าบ้านเป็นคนบันทึกคนเดียว)
let togetherSecs = 0;
setInterval(() => {
  const pp = ctx.partnerPresence;
  const both = ctx.room && ctx.me && pp && !document.hidden && pp.page !== 'away';
  if (!both || !isHost(ctx)) { togetherSecs = 0; return; }
  togetherSecs += 15;
  if (togetherSecs >= 300) { togetherSecs = 0; ctx.addBond('time'); }
}, 15000);

/* ---------- ป้ายข้อความที่ยังไม่อ่าน ---------- */
function updateBadge() {
  const n = chat.unread;
  setAppBadge(n);
  document.querySelectorAll('[data-badge]').forEach((badge) => {
    badge.hidden = n === 0;
    badge.textContent = n > 9 ? '9+' : String(n);
  });
  document.querySelectorAll('[data-chat-link]').forEach((link) => {
    link.setAttribute('aria-label', n ? `แชทของเรา มี ${n} ข้อความใหม่` : 'แชทของเรา');
  });
}
onChat(updateBadge);

// กดแจ้งเตือนแล้วพาไปหน้าที่ถูกต้อง (ส่งมาจาก service worker)
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (typeof e.data?.go === 'string' && /^#\/\w+$/.test(e.data.go)) location.hash = e.data.go;
});

/* ---------- โครงหน้า ---------- */

// ตัวละครแบบวงกลม (เห็นแค่หัว) ใช้บนหัวเว็บ
const faceHtml = (avatar, cls = '') => `<span class="face ${cls}" aria-hidden="true">${avatarSvg(avatar)}</span>`;

const HEART_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg>';

function renderShell() {
  // เมนูแบบแผ่นไอคอน: มือถือแสดง 5 ห้อง จอใหญ่แสดงครบ 7 (สมุด ตั้งค่า)
  const tile = ([key, label]) => `
    <a href="#/${key}" data-route="${key}" class="${TAB_ROOMS.includes(key) ? '' : 'dock-extra'}"><span class="tile">${svgIcon(key)}</span><span class="tile-label">${label}</span></a>`;
  root.innerHTML = `
  <div class="shell" id="shell">
    <div class="main">
      <header class="app-top">
        <div class="top-left">
          <a class="brand" href="#/home" aria-label="2gether หน้าแรก">${logoMark(30)}</a>
          <a class="couple" id="couple" href="#/memory" aria-label="สมุดความทรงจำ"></a>
        </div>
        <div class="top-right">
          <div class="conn" id="conn" data-state="${ctx.conn}" role="status"><i></i><span>${CONN_LABEL[ctx.conn]}</span></div>
          <button class="icon-btn miss-btn" id="missBtn" type="button" aria-label="ส่งคิดถึง">${HEART_ICON}</button>
          <button class="icon-btn play-btn" id="playBtn" type="button" aria-label="ชวนเล่น">${svgIcon('games', 22)}</button>
          <a class="icon-btn tab-only" href="#/memory" data-route="memory" aria-label="สมุดความทรงจำ">${svgIcon('memory', 22)}</a>
          <a class="icon-btn tab-only" href="#/settings" data-route="settings" aria-label="ตั้งค่า">${svgIcon('settings', 22)}</a>
          <button class="icon-btn refresh-btn" id="refreshBtn" type="button" aria-label="รีเฟรชแอป"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/></svg></button>
          <a class="icon-btn chat-btn" href="#/chat" data-route="chat" data-chat-link aria-label="แชทของเรา">${svgIcon('chat', 22)}<span class="badge" data-badge hidden></span></a>
        </div>
      </header>
      <main id="view" tabindex="-1"></main>
    </div>
    <aside class="chat-panel" id="chatPanel" aria-label="แชทของเรา"></aside>
    <nav class="dock" aria-label="ห้องในบ้าน">
      ${ROOMS.map(tile).join('')}
    </nav>
  </div>`;
  root.querySelector('#missBtn').addEventListener('click', sendMiss);
  root.querySelector('#refreshBtn').addEventListener('click', (e) => { e.currentTarget.classList.add('spin'); refreshApp(); });
  root.querySelector('#playBtn').addEventListener('click', () => openPicker(ctx));
  // ปุ่มแชท: กดอีกครั้งเพื่อปิด (มือถือ = กลับห้องเดิม, คอม = พับแผงแชท)
  root.querySelector('.chat-btn').addEventListener('click', (e) => {
    if (WIDE.matches) {
      e.preventDefault();
      panelClosed = !panelClosed;
      try { localStorage.setItem('2gether.chatPanel', panelClosed ? 'closed' : 'open'); } catch { /* ไม่เป็นไร */ }
      syncPanel();
      if (!panelClosed) setTimeout(() => document.querySelector('#chatPanel textarea')?.focus(), 50);
    } else if (ctx.route === 'chat') {
      e.preventDefault();
      location.hash = `#/${prevRoute || 'home'}`;
    }
  });
  paintHeader();
}

/* ---------- ปุ่มคิดถึง ---------- */
let missAt = 0;
let visitDay = '';
async function sendMiss() {
  if (!ctx.partner) { toast('ยังไม่มีอีกคนในบ้าน', 'error'); return; }
  const now = Date.now();
  if (now - missAt < 10000) { toast('ส่งไปแล้ว รอสักครู่นะ'); return; }
  missAt = now;
  const pp = ctx.partnerPresence;
  const name = pp?.nickname || ctx.partner.nickname || 'อีกคน';
  heartRain();
  if (pp && pp.page !== 'away') {
    ctx.send('miss', { from: ctx.me.nickname });
    toast(`ส่งคิดถึงถึง ${name} แล้ว`);
    bump(ctx, 'miss').catch(() => {});
    return;
  }
  const r = await sendPush('miss');
  if (r.result === 'ok') { toast(`ส่งคิดถึงถึง ${name} แล้ว`); bump(ctx, 'miss').catch(() => {}); }
  else if (r.result === 'rate') toast(`ส่งแจ้งเตือนได้อีกครั้งในอีก ${Math.ceil(r.retryAfter / 60)} นาที`, 'error');
  else if (r.result === 'dnd') toast(`${name} พักแจ้งเตือนอยู่`, 'error');
  else if (r.result === 'no_sub') toast(`${name} ยังไม่ได้เปิดแจ้งเตือน`, 'error');
  else toast(pushFailText(r), 'error');
}

// หัวเว็บ: ตัวละครเราสองคน + จุดออนไลน์ + จำนวนวันที่อยู่ด้วยกัน
function paintHeader() {
  const box = document.getElementById('couple');
  if (!box || !ctx.me) return;
  const pp = ctx.partnerPresence;
  const online = Boolean(pp && pp.page !== 'away');
  const partnerName = pp?.nickname || ctx.partner?.nickname || '';
  const n = dayNumber(ctx.home?.start_date);
  const party = n && isMilestone(n);
  box.innerHTML = `
    <span class="faces">
      ${faceHtml(ctx.me.avatar, 'me')}
      ${ctx.partner ? faceHtml(pp?.avatar || ctx.partner.avatar, `them${online ? ' on' : ''}`) : '<span class="face empty" aria-hidden="true">?</span>'}
    </span>
    <span class="couple-text">
      <span class="couple-names">${esc(ctx.me.nickname)}${partnerName ? ` <span class="amp" aria-hidden="true">♥</span> ${esc(partnerName)}` : ''}</span>
      <span class="couple-sub${party ? ' party' : ''}${online ? ' on' : ''}">${
        !ctx.partner ? 'รออีกคนเข้าบ้าน'
          : party ? `ครบ ${n} วันแล้ว!`
            : online ? `${esc(partnerName)} อยู่บ้าน` : pp ? `${esc(partnerName)} สลับแอปอยู่` : `${esc(partnerName)} ยังไม่กลับบ้าน`
      }</span>
    </span>`;
  panelChat?.update();
  box.setAttribute('aria-label', `${ctx.me.nickname}${partnerName ? ` กับ ${partnerName}` : ''}${online ? ` (${partnerName} ออนไลน์)` : ''} เปิดสมุดความทรงจำ`);
}

/* ---------- แผงแชทข้างขวา (จอคอม 1200px ขึ้นไป) ---------- */
let panelChat = null;
ctx.chatPanel = false;
// คอม: กดปุ่มแชทเพื่อพับ/เปิดแผงแชท (จำไว้ในเครื่องนี้)
let panelClosed = false;
try { panelClosed = localStorage.getItem('2gether.chatPanel') === 'closed'; } catch { /* ไม่เป็นไร */ }
let prevRoute = 'home';
const SCENE_ROOMS = ['home', 'bedroom', 'kitchen', 'garden', 'games'];
const AWAY_GRACE = 30 * 60 * 1000;
// แผงแชทข้างจอคอมถูกหน้าดูหนังบังอยู่ = ยังไม่เห็นแชท
ctx.chatVisible = () => !document.hidden && (ctx.route === 'chat' || (ctx.chatPanel && !tvOpen()) || ctx.tvChat);

function syncPanel() {
  const panel = document.getElementById('chatPanel');
  const want = Boolean(panel && WIDE.matches && ctx.me && !panelClosed);
  document.getElementById('shell')?.classList.toggle('chat-closed', panelClosed);
  document.querySelectorAll('[data-chat-link]').forEach((a) => {
    if (WIDE.matches) a.setAttribute('aria-expanded', String(!panelClosed));
    else a.removeAttribute('aria-expanded');
  });
  if (want && !panelChat) {
    panelChat = createChatView({ panel: true });
    panelChat.mount(panel, ctx);
    ctx.chatPanel = true;
    if (ctx.route === 'chat') location.replace('#/home');
  } else if (!want && panelChat) {
    panelChat.unmount();
    panelChat = null;
    ctx.chatPanel = false;
    if (panel) panel.innerHTML = '';
  }
}
WIDE.addEventListener('change', syncPanel);

function go() {
  const key = location.hash.replace(/^#\//, '');
  // จอคอมมีแชทค้างอยู่ข้างขวาแล้ว: ลิงก์ไปหน้าแชทให้โฟกัสช่องพิมพ์แทน
  if (key === 'chat' && ctx.chatPanel) {
    history.replaceState(null, '', `#/${current ? ctx.route : 'home'}`);
    document.querySelector('#chatPanel textarea')?.focus();
    if (current) return;
  }
  const next = VIEWS[key] && !(key === 'chat' && ctx.chatPanel) ? key : 'home';
  if (current && SCENE_ROOMS.includes(ctx.route)) prevRoute = ctx.route;
  ctx.nextRoute = next;
  // เปลี่ยนหน้า = เลิกดูทีวี (เพลงยังเล่นต่อ)
  if (tvOpen() && next !== ctx.route) closeTV();
  current?.unmount?.();
  ctx.route = next;
  current = VIEWS[next];
  const view = document.getElementById('view');
  if (!view) return;
  view.innerHTML = '';
  view.dataset.route = next;
  current.mount(view, ctx);
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  document.querySelectorAll('.dock a, .app-top .icon-btn').forEach((a) => {
    if (a.dataset.route === ctx.route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  ctx.room?.track();
}

let hashBound = false;
function showShell() {
  current?.unmount?.();
  current = null;
  // วาดหน้าใหม่ทั้งหมด (เช่นกลับจากหน้าแก้ตัวละคร): ต้องใส่แผงแชทกลับเข้าไปด้วย
  panelChat?.unmount();
  panelChat = null;
  ctx.chatPanel = false;
  renderShell();
  syncPanel();
  updateBadge();
  if (!hashBound) {
    window.addEventListener('hashchange', go);
    hashBound = true;
  }
  go();
  startRoom();
}

function showAuth() {
  window.__bootDone?.();
  applyTheme('summer');
  renderAuth(root);
}

function showFatal(title, detail) {
  window.__bootDone?.();
  root.innerHTML = `
  <main class="auth">
    <div class="auth-logo">${logoMark(56)}</div>
    <h1 class="display">${title}</h1>
    <p class="lead">${detail}</p>
    <button class="btn" id="signOutFatal" type="button">ออกจากระบบ</button>
  </main>`;
  root.querySelector('#signOutFatal').addEventListener('click', () => ctx.signOut());
}

function teardown() {
  current?.unmount?.();
  current = null;
  panelChat?.unmount();
  panelChat = null;
  ctx.chatPanel = false;
  ctx.room?.leave();
  resetChat();
  Object.assign(ctx, { me: null, partner: null, home: null, partnerPresence: null, room: null, conn: 'connecting', pos: null, catState: null, since: 0, sleeping: false });
}

/* ---------- เริ่มทำงาน ---------- */

let booting = false;

async function boot() {
  if (!configured) {
    applyTheme('summer');
    showFatal('ยังไม่ได้เชื่อม Supabase', 'เปิดไฟล์ js/config.js ใส่ SUPABASE_URL กับ SUPABASE_ANON_KEY ตามคู่มือ แล้วอัปโหลดเว็บใหม่');
    root.querySelector('#signOutFatal').remove();
    return;
  }

  sb.auth.onAuthStateChange((event, session) => {
    // อย่าเรียก Supabase ตรงๆ ในนี้ ให้เลื่อนไปรอบถัดไปเพื่อกัน deadlock
    setTimeout(() => {
      if (event === 'SIGNED_OUT') {
        teardown();
        showAuth();
      } else if (session && ctx.me?.id !== session.user.id && !booting) {
        booting = true;
        start(session.user).finally(() => { booting = false; });
      }
    }, 0);
  });

  let data = null;
  try { ({ data } = await within(sb.auth.getSession(), 12000)); } catch { /* หน้าสำรองใน index.html จะขึ้นเอง */ return; }
  if (!data?.session) showAuth();
}

applyLite();
// แอปที่ติดตั้งไว้ (หน้าโฮม / หน้าต่างแอป): มีปุ่มรีเฟรชบนหัวเว็บ
if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true) document.documentElement.classList.add('is-pwa');
startAmbient();
// กลับมาจากหน้าอนุญาตของ Spotify
spotifyReturn().then((r) => {
  if (r === 'ok') toast('เชื่อม Spotify แล้ว เปิดเครื่องเล่นเพลงในห้องได้เลย');
  else if (r === 'fail') toast('เชื่อม Spotify ไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
});
// โหลดภาพทุกห้องไว้ล่วงหน้า เปลี่ยนห้องแล้วขึ้นทันที
setTimeout(() => {
  ['living', 'bedroom', 'kitchen', 'garden'].map((r) => `art/rooms/${r}.svg`)
    .concat(['summer', 'rain', 'cool', 'spring', 'autumn'].map((s) => `art/windows/${s}.svg`))
    .forEach((src) => { const i = new Image(); i.decoding = 'async'; i.src = src; });
}, 800);
// ปิดเมนูกดค้าง/คลิกขวาของเบราว์เซอร์ทั้งเว็บ (ยกเว้นช่องพิมพ์ เพื่อให้วาง/คัดลอกข้อความได้)
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('input, textarea, [contenteditable="true"]')) e.preventDefault();
});
boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
