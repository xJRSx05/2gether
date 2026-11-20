// ดูทีวีด้วยกัน (YouTube): เลือกคลิปจากหน้ามาแรง ค้นหา ช่องที่ติดตาม เพลย์ลิสต์ หรือที่เคยดูด้วยกัน
// ซิงก์: ใครกดเล่น หยุด หรือเลื่อน อีกเครื่องตามทันที เจ้าบ้านส่งตำแหน่งทุก 4 วินาที ห่างเกิน 1.5 วินาทีจะปรับให้ตรง
import { sendPush, pushFailText } from './push.js';
import { YOUTUBE_API_KEY, GOOGLE_CLIENT_ID } from './config.js';
import { esc, toast } from './ui.js';
import { modal } from './play-invite.js';
import { isHost } from './host.js';
import { avatarSvg } from './avatar.js';
import { catSvg } from './cat.js';
import { createChatView } from './chat.js';
import { markRead } from './chat-store.js';
import { pauseForTV, resumeAfterTV } from './music.js';
import {
  loadScript, partnerName, partnerOnline, cacheGet, cacheSet, historyGet, historyAdd, withChip, svg,
} from './media-util.js';

const API = 'https://www.googleapis.com/youtube/v3/';
const HIST = '2gether.tvHistory';
const CACHE = '2gether.ytCache';
const GTOK = '2gether.gtok';
const REACTS = [['heart', '💗'], ['lol', '😂'], ['wow', '😮'], ['cry', '🥹']];

const S = {
  ctx: null, ov: null,
  player: null, playerReady: null, video: null, readyT: 0,
  together: false, waiting: false, applying: 0, needSync: false, waitT: 0,
  lastPos: 0, lastAt: 0, poll: 0, beat: 0, tab: 'trend', listToken: 0,
  fs: false, chat: null, chatOpen: false, ctlT: 0, fanT: 0, tapT: 0, lastTap: 0, seeking: false,
};

/* ---------- YouTube Data API ---------- */
async function yt(path, params, { auth = false, ttl = 0 } = {}) {
  const q = new URLSearchParams(params);
  if (!auth) q.set('key', YOUTUBE_API_KEY);
  const url = `${API}${path}?${q}`;
  if (!auth && ttl) { const hit = cacheGet(CACHE, url); if (hit) return hit; }
  const headers = auth ? { Authorization: `Bearer ${await googleToken()}` } : {};
  let r;
  try { r = await fetch(url, { headers }); } catch { throw new Error('network'); }
  if (!r.ok) {
    // เก็บเหตุผลจริงจาก Google ไว้บอกผู้ใช้ว่าต้องแก้ตรงไหน
    const e = (await r.json().catch(() => ({})))?.error;
    const code = e?.details?.find((x) => x.reason)?.reason || e?.errors?.[0]?.reason || String(r.status);
    throw new Error(code);
  }
  const j = await r.json();
  if (!auth && ttl) cacheSet(CACHE, url, j, ttl);
  return j;
}
const isoDur = (d) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '');
  if (!m) return '';
  const h = +(m[1] || 0); const mi = +(m[2] || 0); const s = +(m[3] || 0);
  return h ? `${h}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${mi}:${String(s).padStart(2, '0')}`;
};
const thumbOf = (sn) => sn?.thumbnails?.medium?.url || sn?.thumbnails?.high?.url || sn?.thumbnails?.default?.url || '';
const fromVideo = (it) => ({ id: it.id, title: it.snippet.title, channel: it.snippet.channelTitle, thumb: thumbOf(it.snippet), dur: isoDur(it.contentDetails?.duration) });

async function withDurations(list) {
  if (!list.length) return list;
  const j = await yt('videos', { part: 'contentDetails', id: list.map((v) => v.id).join(',') }, { ttl: 864e5 }).catch(() => null);
  const map = new Map((j?.items || []).map((it) => [it.id, isoDur(it.contentDetails?.duration)]));
  return list.map((v) => ({ ...v, dur: map.get(v.id) || v.dur || '' }));
}
const api = {
  trending: async () => (await yt('videos', { part: 'snippet,contentDetails', chart: 'mostPopular', regionCode: 'TH', maxResults: 24 }, { ttl: 30 * 6e4 })).items.map(fromVideo),
  search: async (q) => {
    const j = await yt('search', { part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: 20, regionCode: 'TH', relevanceLanguage: 'th', safeSearch: 'moderate', q }, { ttl: 864e5 });
    return withDurations(j.items.filter((it) => it.id?.videoId).map((it) => ({ id: it.id.videoId, title: it.snippet.title, channel: it.snippet.channelTitle, thumb: thumbOf(it.snippet) })));
  },
  subs: async () => (await yt('subscriptions', { part: 'snippet', mine: 'true', maxResults: 50, order: 'alphabetical' }, { auth: true })).items
    .map((it) => ({ id: it.snippet.resourceId.channelId, title: it.snippet.title, thumb: thumbOf(it.snippet) })),
  playlists: async () => (await yt('playlists', { part: 'snippet,contentDetails', mine: 'true', maxResults: 50 }, { auth: true })).items
    .map((it) => ({ id: it.id, title: it.snippet.title, thumb: thumbOf(it.snippet), count: it.contentDetails?.itemCount || 0 })),
  // คลิปในเพลย์ลิสต์ (คลิปล่าสุดของช่อง = เพลย์ลิสต์ UU...)
  items: async (playlistId, auth) => {
    const j = await yt('playlistItems', { part: 'snippet', playlistId, maxResults: 25 }, auth ? { auth: true } : { ttl: 15 * 6e4 });
    return withDurations(j.items.filter((it) => it.snippet?.resourceId?.videoId && it.snippet.title !== 'Private video' && it.snippet.title !== 'Deleted video')
      .map((it) => ({ id: it.snippet.resourceId.videoId, title: it.snippet.title, channel: it.snippet.videoOwnerChannelTitle || it.snippet.channelTitle, thumb: thumbOf(it.snippet) })));
  },
  one: async (id) => {
    if (!YOUTUBE_API_KEY) return { id, title: 'คลิปจาก YouTube', channel: '', thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` };
    const j = await yt('videos', { part: 'snippet,contentDetails', id }, { ttl: 864e5 });
    return j.items?.[0] ? fromVideo(j.items[0]) : null;
  },
};

/* ---------- บัญชี Google (เฉพาะช่องที่ติดตาม/เพลย์ลิสต์) ---------- */
export const googleLinked = () => { try { return localStorage.getItem('2gether.gLinked') === '1'; } catch { return false; } };
export function googleUnlink() {
  try { localStorage.removeItem('2gether.gLinked'); localStorage.removeItem(GTOK); } catch { /* ไม่เป็นไร */ }
}
export const preloadGoogle = () => { if (GOOGLE_CLIENT_ID) loadScript('https://accounts.google.com/gsi/client').catch(() => {}); };
function googleToken() {
  try { const c = JSON.parse(localStorage.getItem(GTOK) || 'null'); if (c && c.exp > Date.now() + 60000) return Promise.resolve(c.t); } catch { /* ไม่เป็นไร */ }
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error('noclient'));
  if (!window.google?.accounts?.oauth2) return Promise.reject(new Error('gsi'));
  return new Promise((res, rej) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      prompt: googleLinked() ? '' : 'consent',
      callback: (r) => {
        if (r.error) { rej(new Error(r.error)); return; }
        try {
          localStorage.setItem(GTOK, JSON.stringify({ t: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 }));
          localStorage.setItem('2gether.gLinked', '1');
        } catch { /* ไม่เป็นไร */ }
        res(r.access_token);
      },
      error_callback: (e) => rej(new Error(e?.type || 'popup')),
    });
    tc.requestAccessToken();
  });
}
export const googleConnect = () => (window.google?.accounts?.oauth2 ? googleToken() : loadScript('https://accounts.google.com/gsi/client').then(googleToken));

/* ---------- ลิงก์ YouTube → id ---------- */
export function videoIdFrom(text) {
  const t = String(text || '').trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = /(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/.exec(t);
  return m ? m[1] : null;
}

/* ---------- เครื่องเล่น ---------- */
let ytApi = null;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve();
  if (!ytApi) {
    ytApi = new Promise((res) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); res(); };
      loadScript('https://www.youtube.com/iframe_api').catch(() => { ytApi = null; });
    });
  }
  return ytApi;
}
const ERR = {
  2: 'ลิงก์คลิปไม่ถูกต้อง',
  5: 'เบราว์เซอร์นี้เล่นคลิปนี้ไม่ได้',
  100: 'คลิปนี้ถูกลบหรือตั้งเป็นส่วนตัว',
  101: 'เจ้าของคลิปไม่ให้เปิดนอก YouTube ลองคลิปอื่นนะ',
  150: 'เจ้าของคลิปไม่ให้เปิดนอก YouTube ลองคลิปอื่นนะ',
  153: 'เครื่องเล่นโหลดไม่ขึ้น (ตัวบล็อกโฆษณาหรือการตั้งค่าความเป็นส่วนตัวอาจบล็อกอยู่)',
};
function makePlayer(id, start = 0, autoplay = false) {
  const screen = S.ov?.querySelector('#tvScreen');
  if (!screen) return Promise.resolve(null);
  // ทุกครั้งที่สร้างใหม่ ใช้กล่องใหม่ (ลองใหม่หลังโหลดพลาดได้)
  screen.querySelector('#tvPlayer')?.remove();
  screen.querySelector('iframe')?.remove();
  const host = document.createElement('div');
  host.id = 'tvPlayer';
  screen.prepend(host);
  hideFail();
  clearTimeout(S.readyT);
  // ถ้าเครื่องเล่นไม่พร้อมใน 9 วินาที ให้ลองใหม่ได้
  S.readyT = setTimeout(() => showFail(153), 9000);
  S.playerReady = loadYT().then(() => new Promise((res) => {
    if (!S.ov) { res(null); return; }
    S.player = new window.YT.Player(host, {
      videoId: id,
      width: '100%', height: '100%',
      host: 'https://www.youtube.com',
      // ใช้ปุ่มควบคุมของ YouTube เอง (ซับ คุณภาพ ความเร็ว) แต่ปิดปุ่มเต็มจอของ YouTube ให้ใช้ของเรา ปุ่มแชท/อิโมจิจะได้ไม่หาย
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0, start: Math.floor(start), autoplay: autoplay ? 1 : 0, origin: location.origin },
      events: {
        onReady: () => { clearTimeout(S.readyT); res(S.player); fillTitle(); },
        onStateChange: onLocalState,
        onError: (e) => { clearTimeout(S.readyT); showFail(e.data); },
      },
    });
  }));
  return S.playerReady;
}
const ready = () => S.playerReady || Promise.resolve(null);
const P = () => (S.player?.getPlayerState ? S.player : null);
const now = () => Date.now();

function showFail(code) {
  const f = S.ov?.querySelector('#tvFail'); if (!f || !S.video) return;
  f.querySelector('p').textContent = ERR[code] || 'เปิดคลิปไม่สำเร็จ';
  f.querySelector('a').href = `https://www.youtube.com/watch?v=${encodeURIComponent(S.video.id)}`;
  f.hidden = false;
}
function hideFail() { const f = S.ov?.querySelector('#tvFail'); if (f) f.hidden = true; }

// ชื่อคลิปจากตัวเครื่องเล่น (ใช้เมื่อเปิดจากลิงก์และไม่มีคีย์ API)
function fillTitle() {
  const d = P()?.getVideoData?.();
  if (!d?.title || !S.video) return;
  if (S.video.title && S.video.title !== 'คลิปจาก YouTube') return;
  S.video = { ...S.video, title: d.title, channel: d.author || S.video.channel, thumb: S.video.thumb || `https://i.ytimg.com/vi/${S.video.id}/mqdefault.jpg` };
  paintInfo();
  historyAdd(HIST, S.video);
  syncMeta();
}

function stateMsg() {
  const p = P();
  const st = p?.getPlayerState?.();
  return { t: 'state', v: S.video, pos: p?.getCurrentTime?.() || 0, playing: st === 1 || st === 3 };
}
function sendState() {
  if (!S.together || now() < S.applying) return;
  S.ctx.send('tv', stateMsg());
}
let musicPaused = false;
function onLocalState(e) {
  paintPlay();
  if (e.data === 1) {
    setTapThrough(false);
    hideFail();
    fillTitle();
    if (!musicPaused) { musicPaused = true; pauseForTV(); }
  }
  if (e.data === 1 && S.needSync && S.together) {
    // เพิ่งแตะเริ่มเล่นเองหลังเครื่องไม่ยอมเล่นอัตโนมัติ: ขอเวลาปัจจุบันจากอีกคน
    S.needSync = false;
    S.ctx.send('tv', { t: 'want' });
    return;
  }
  if (e.data === 1 || e.data === 2) { S.lastPos = P()?.getCurrentTime?.() || 0; S.lastAt = now(); sendState(); }
}
function watchSeek() {
  clearInterval(S.poll);
  S.poll = setInterval(() => {
    const p = P();
    if (!p) return;
    const cur = p.getCurrentTime?.() || 0;
    const playing = p.getPlayerState?.() === 1;
    const expect = S.lastPos + (playing ? (now() - S.lastAt) / 1000 : 0);
    if (Math.abs(cur - expect) > 1.6) sendState();
    S.lastPos = cur; S.lastAt = now();
  }, 500);
  clearInterval(S.beat);
  S.beat = setInterval(() => {
    if (S.together && isHost(S.ctx) && P()?.getPlayerState?.() === 1) S.ctx.send('tv', { ...stateMsg(), t: 'tick' });
  }, 4000);
}
async function applyRemote(m) {
  if (!m?.v?.id) return;
  S.applying = now() + 1400;
  if (!S.video || S.video.id !== m.v.id) {
    S.video = m.v;
    paintInfo();
    syncMeta();
    const p = await ready();
    if (p) { if (m.playing) p.loadVideoById({ videoId: m.v.id, startSeconds: m.pos }); else p.cueVideoById({ videoId: m.v.id, startSeconds: m.pos }); }
    S.applying = now() + 1400;
    if (m.playing) checkAutoplay();
    return;
  }
  const p = await ready();
  if (!p) return;
  const cur = p.getCurrentTime?.() || 0;
  const want = m.pos + (m.playing ? 0.25 : 0);
  if (Math.abs(cur - want) > (m.t === 'tick' ? 1.5 : 0.8)) p.seekTo(want, true);
  const st = p.getPlayerState?.();
  if (m.playing && st !== 1 && st !== 3) { p.playVideo(); checkAutoplay(); }
  if (!m.playing && st === 1) p.pauseVideo();
  S.lastPos = want; S.lastAt = now();
  S.applying = now() + 1000;
}
// มือถือบางเครื่อง (โดยเฉพาะ iPhone) ไม่ยอมเล่นถ้าไม่ได้แตะที่ตัววิดีโอเอง: เปิดให้แตะทะลุถึงวิดีโอ
function checkAutoplay() {
  setTimeout(() => {
    const st = P()?.getPlayerState?.();
    if (st === 1 || st === 3) return;
    setTapThrough(true);
    if (S.together) S.needSync = true;
  }, 1600);
}
function setTapThrough(on) {
  const t = S.ov?.querySelector('#tvTap'); if (t) t.hidden = !on;
}
/* ---------- เต็มจอ ---------- */
const realFs = () => Boolean(document.fullscreenEnabled && S.ov?.querySelector('#tvScreen')?.requestFullscreen);
function toggleFs() {
  const sc = S.ov?.querySelector('#tvScreen'); if (!sc) return;
  if (S.fs) {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setFs(false);
    return;
  }
  if (realFs()) {
    sc.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
      .catch(() => setFs(true));
  }
  setFs(true); // iPhone: เต็มจอแบบของเราเอง (ขยายวิดีโอปิดทั้งจอ)
}
function setFs(on) {
  S.fs = on;
  S.ov?.classList.toggle('fs', on);
  document.documentElement.classList.toggle('fs-on', on);
  placeChat();
  S.ov?.querySelectorAll('[data-fs]').forEach((b) => b.setAttribute('aria-label', on ? 'ออกจากเต็มจอ' : 'เต็มจอ'));
}
// มือถือหมุนเป็นแนวนอนระหว่างดู = เต็มจอเอง
const landscape = matchMedia('(orientation: landscape) and (max-height: 520px)');
landscape.addEventListener?.('change', (e) => { if (S.ov && S.video && !document.fullscreenElement) setFs(e.matches); });
document.addEventListener('fullscreenchange', () => {
  if (!S.ov) return;
  if (!document.fullscreenElement && S.fs) setFs(false);
});

/* ---------- อิโมจิ: กดหนึ่งครั้งลอยขึ้น 3 ดวง ---------- */
function burstReact(k, mine) {
  const layer = S.ov?.querySelector('#tvReacts'); if (!layer) return;
  const e = REACTS.find((x) => x[0] === k)?.[1]; if (!e) return;
  const base = mine ? 58 + Math.random() * 20 : 14 + Math.random() * 20;
  for (let i = 0; i < 3; i += 1) {
    setTimeout(() => {
      const n = document.createElement('span');
      n.className = 'tv-react';
      n.textContent = e;
      n.style.left = `${base + (i - 1) * 7 + (Math.random() - 0.5) * 6}%`;
      n.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
      n.style.fontSize = `${1.75 + Math.random() * 0.9}rem`;
      layer.appendChild(n);
      setTimeout(() => n.remove(), 2400);
    }, i * 130);
  }
}
function fanOpen(on) {
  S.ov?.querySelectorAll('.emo-fan').forEach((f) => f.classList.toggle('on', on));
  S.ov?.querySelectorAll('[data-emo]').forEach((b) => b.setAttribute('aria-expanded', String(on)));
  clearTimeout(S.fanT);
  if (on) S.fanT = setTimeout(() => fanOpen(false), 3000);
}

/* ---------- แชท (ช่องเดียวกับหน้าแชทปกติ) ---------- */
function toggleChat(force) {
  const open = force ?? !S.chatOpen;
  S.chatOpen = open;
  const box = S.ov?.querySelector('#tvChat'); if (!box) return;
  if (open && !S.chat) {
    // ปุ่มปิดแชทบนหัวกล่อง (จอแนวตั้งปุ่มแชทเดิมอาจอยู่ไกลนิ้ว)
    box.innerHTML = '<button type="button" class="tv-chat-x" data-chat-x aria-label="ปิดแชท"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="tv-chat-body"></div>';
    box.querySelector('[data-chat-x]').addEventListener('click', () => toggleChat(false));
    S.chat = createChatView({ panel: true }); S.chat.mount(box.querySelector('.tv-chat-body'), S.ctx);
  }
  if (open) S.ov.querySelector('.tv-msg')?.remove();
  S.ctx.tvChat = open;
  box.hidden = !open;
  S.ov.classList.toggle('chatting', open);
  S.ov.querySelectorAll('[data-chat]').forEach((b) => { b.setAttribute('aria-pressed', String(open)); b.classList.toggle('on', open); });
  // ไม่โฟกัสช่องพิมพ์เอง แป้นพิมพ์จะขึ้นเมื่อผู้ใช้แตะช่องพิมพ์เท่านั้น
  if (open) markRead(S.ctx);
  placeChat();
}
// เต็มจอ: แชทต้องอยู่ในกรอบวิดีโอถึงจะเห็น ไม่เต็มจอ: กลับมาอยู่ในหน้า
function placeChat() {
  const box = S.ov?.querySelector('#tvChat'); if (!box) return;
  const target = S.fs ? S.ov.querySelector('#tvScreen') : S.ov.querySelector('#tvChatHome');
  if (box.parentElement !== target) target.appendChild(box);
}

/* ---------- หน้าจอ ---------- */
const card = (v, i) => `<button type="button" class="tv-card" data-i="${i}">
    <span class="tv-thumb">${v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy" decoding="async">` : ''}${v.dur ? `<b>${esc(v.dur)}</b>` : ''}</span>
    <span class="tv-meta"><span class="tv-title">${esc(v.title)}</span><span class="tv-ch">${esc(v.channel || '')}${v.count ? ` · ${v.count} คลิป` : ''}</span></span></button>`;
const emoBtn = () => `<div class="emo-wrap"><button type="button" class="tv-round" data-emo aria-expanded="false" aria-label="ส่งความรู้สึก"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1.8 2 5.2 2 7 0M9 9.5h.01M15 9.5h.01"/></svg></button>
  <div class="emo-fan" role="group" aria-label="เลือกความรู้สึก">${REACTS.map(([k, e]) => `<button type="button" data-react="${k}" aria-label="ส่ง ${e}">${e}</button>`).join('')}</div></div>`;
const chatBtn = () => `<button type="button" class="tv-round" data-chat aria-pressed="false" aria-label="แชท"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5z"/></svg><span class="tv-badge" data-badge hidden></span></button>`;

function shell() {
  document.querySelector('.media-ov.tv')?.remove();
  const ov = document.createElement('div');
  ov.className = 'media-ov tv';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'ดูหนัง');
  ov.innerHTML = `
    <header class="mo-head tv-head">
      <button type="button" class="icon-btn" data-close aria-label="ปิด">${svg('back', 22)}</button>
      <form class="tv-search" id="tvSearch" role="search">
        ${svg('search', 20)}<input type="search" id="tvQ" placeholder="ค้นหา หรือวางลิงก์ YouTube" enterkeyhint="search" autocomplete="off" aria-label="ค้นหาหรือวางลิงก์ YouTube">
      </form>
      <button type="button" class="icon-btn" id="tvPick" aria-label="เลือกคลิปอื่น" aria-pressed="true">${svg('list', 22)}</button>
      <span class="mo-with" data-with></span>
      <button type="button" class="btn small primary tv-join" id="tvJoin" hidden>เข้าร่วม</button>
    </header>
    <div class="mo-body tv-body">
      <section class="tv-watch" id="tvWatch" hidden>
        <div class="tv-screen" id="tvScreen">
          <div class="tv-react-layer" id="tvReacts" aria-hidden="true"></div>
          <div class="tv-tap" id="tvTap" hidden>${svg('play', 26)}<span>กดเล่นที่วิดีโอเพื่อเริ่มดู</span></div>
          <div class="tv-fail" id="tvFail" hidden><p></p><div><button type="button" class="btn small primary" id="tvRetry">ลองใหม่</button><a class="btn small" target="_blank" rel="noopener">เปิดใน YouTube</a></div></div>
          <div class="tv-side">${chatBtn()}${emoBtn()}<button type="button" class="tv-round" data-fs aria-label="ออกจากเต็มจอ">${svg('exitfs', 22)}</button></div>
        </div>
        <div class="tv-info">
          <div class="tv-now"><p class="tv-now-title" id="tvTitle"></p><p class="tv-now-ch" id="tvCh"></p></div>
          <div class="tv-tools">${emoBtn()}${chatBtn()}<button type="button" class="tv-round" data-fs aria-label="เต็มจอ">${svg('full', 22)}</button></div>
        </div>
        <div class="tv-couch" id="tvCouch" aria-hidden="true"></div>
      </section>
      <section class="tv-browse" id="tvBrowse">
        <div class="tv-tabs" role="tablist">
          ${[['trend', 'มาแรง'], ['subs', 'ช่องที่ติดตาม'], ['lists', 'เพลย์ลิสต์'], ['hist', 'ดูด้วยกัน']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${l}</button>`).join('')}
        </div>
        <div class="tv-list" id="tvList" aria-live="polite"></div>
      </section>
      <div class="tv-chat-home" id="tvChatHome"><div class="tv-chat" id="tvChat" hidden></div></div>
    </div>`;
  ov.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, textarea')) e.preventDefault(); });
  document.body.appendChild(ov);
  document.documentElement.classList.add('tv-open');
  requestAnimationFrame(() => ov.classList.add('on'));
  S.ov = ov;
  bind();
  paintWith();
}

function bind() {
  const ov = S.ov;
  ov.querySelector('[data-close]').addEventListener('click', closeTV);
  ov.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (S.fs) setFs(false); else if (S.chatOpen) toggleChat(false); else closeTV();
  });
  ov.querySelector('#tvSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = ov.querySelector('#tvQ').value.trim();
    if (!q) return;
    ov.querySelector('#tvQ').blur();
    // วางลิงก์ในช่องค้นหาได้เลย
    const id = videoIdFrom(q);
    if (id) {
      ov.querySelector('#tvQ').value = '';
      api.one(id).then((v) => choose(v || { id, title: 'คลิปจาก YouTube', channel: '', thumb: '' })).catch(() => choose({ id, title: 'คลิปจาก YouTube', channel: '', thumb: '' }));
      return;
    }
    showBrowse(true);
    tab('search', q);
  });
  ov.querySelector('.tv-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) tab(b.dataset.tab); });
  ov.querySelector('#tvPick').addEventListener('click', () => showBrowse(ov.querySelector('#tvBrowse').hidden));
  ov.querySelector('#tvJoin').addEventListener('click', (e) => {
    if (e.currentTarget.dataset.mode === 'join') joinTV(S.ctx);
    else invite();
  });
  ov.querySelector('#tvRetry').addEventListener('click', () => { if (S.video) makePlayer(S.video.id, S.lastPos || 0, true); });
  ov.addEventListener('click', (e) => {
    const emo = e.target.closest('[data-emo]');
    if (emo) { fanOpen(!emo.parentElement.querySelector('.emo-fan').classList.contains('on')); return; }
    const r = e.target.closest('[data-react]');
    if (r) {
      burstReact(r.dataset.react, true);
      if (S.together) S.ctx.send('tv', { t: 'react', k: r.dataset.react });
      fanOpen(true); // ค้างไว้อีก 3 วินาที กดรัวได้
      return;
    }
    if (e.target.closest('[data-chat]')) { toggleChat(); return; }
    if (e.target.closest('[data-fs]')) { toggleFs(); return; }
    if (!e.target.closest('.emo-wrap')) fanOpen(false);
  });
}

function showBrowse(on) {
  const ov = S.ov; if (!ov) return;
  const br = ov.querySelector('#tvBrowse');
  br.hidden = !on;
  ov.classList.toggle('browsing', on);
  ov.querySelector('#tvPick').setAttribute('aria-pressed', String(on));
  if (on && S.video && !ov.querySelector('#tvList').children.length) tab(S.tab);
  if (on && S.video) setTimeout(() => br.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function paintWith() {
  if (!S.ov) return;
  const pw = S.ctx.partnerPresence?.watching;
  const canJoin = Boolean(pw?.id && !S.together && S.ctx.partnerPresence.page !== 'away');
  // ดูคนเดียว: แทนป้าย "คนเดียว" ด้วยปุ่มชวน (หรือปุ่มเข้าร่วมถ้าอีกคนดูอยู่)
  const solo = !S.together && !S.waiting;
  const withEl = S.ov.querySelector('[data-with]');
  withEl.innerHTML = solo ? '' : withChip(S.ctx, S.together, S.waiting);
  withEl.hidden = solo;
  const join = S.ov.querySelector('#tvJoin');
  join.hidden = !(canJoin || (solo && S.ctx.partner && S.video));
  join.textContent = canJoin ? 'เข้าร่วม' : `ชวน ${partnerName(S.ctx)}`;
  join.dataset.mode = canJoin ? 'join' : 'invite';
  paintCouch();
}
// ตัวละครใต้จอ: นั่งโซฟา คนหนึ่งนอนหนุนตัก คนนั่งลูบหัว
function paintCouch() {
  const couch = S.ov?.querySelector('#tvCouch'); if (!couch) return;
  const meAv = S.ctx.me.avatar;
  const pAv = S.ctx.partnerPresence?.avatar || S.ctx.partner?.avatar;
  if (!S.together) {
    couch.innerHTML = `<span class="tc-sofa"></span><span class="tc-base solo pose-sit">${avatarSvg(meAv)}</span>`;
    return;
  }
  const lapperMe = S.ctx.lapRoles?.lapper === 'me';
  const lapAv = lapperMe ? meAv : pAv;
  const baseAv = lapperMe ? pAv : meAv;
  const skin = (baseAv && baseAv.skin) || '#F1C7A5';
  // อีกคนสลับแอปอยู่: ตัวเขาจางลง
  const away = S.ctx.partnerPresence?.page === 'away';
  couch.classList.toggle('p-away', away);
  couch.innerHTML = `<span class="tc-sofa"></span>
    <span class="tc-base pose-sit${!lapperMe && away ? ' away' : ''}">${avatarSvg(baseAv)}</span>
    <span class="tc-lap${lapperMe && away ? ' away' : ''}">${avatarSvg({ ...(lapAv || {}), eyes: 'sleepy' })}</span>
    <svg class="tc-hand" viewBox="0 0 30 26" aria-hidden="true"><path d="M3 15c0-6 5-11 12-11s12 4 12 9c0 6-5 10-12 10H9c-3 0-6-3-6-8z" fill="${esc(skin)}" stroke="#3A2A24" stroke-width="2.4"/></svg>
    <span class="tc-heart"></span>`;
}
function paintInfo() {
  const v = S.video; if (!v || !S.ov) return;
  S.ov.querySelector('#tvTitle').textContent = v.title || '';
  S.ov.querySelector('#tvCh').textContent = v.channel || '';
}
function paintPlay() { /* ใช้ปุ่มของ YouTube เอง */ }

const lists = { cur: [] };
function renderList(items, empty) {
  const box = S.ov?.querySelector('#tvList'); if (!box) return;
  lists.cur = items;
  box.innerHTML = items.length ? `<div class="tv-grid">${items.map(card).join('')}</div>` : `<div class="tv-empty">${empty}</div>`;
  box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    const v = lists.cur[+b.dataset.i];
    if (v.kind === 'channel') tab('channel', v);
    else if (v.kind === 'playlist') tab('playlist', v);
    else choose(v);
  }));
}
function loading() { const box = S.ov?.querySelector('#tvList'); if (box) box.innerHTML = `<div class="tv-grid">${'<span class="tv-card sk"><span class="tv-thumb"></span><span class="tv-meta"><span></span><span></span></span></span>'.repeat(6)}</div>`; }
const needKey = () => '<p><b>ยังไม่ได้ใส่คีย์ YouTube</b></p><p>หน้ามาแรงและการค้นหาต้องใช้คีย์ YouTube Data API (ฟรี) ดูวิธีตั้งค่าใน README</p><p>ระหว่างนี้วางลิงก์ YouTube ในช่องค้นหาด้านบนได้เลย</p>';
const ERR_HINT = {
  quotaExceeded: 'โควตาค้นหาของวันนี้หมดแล้ว พรุ่งนี้ใช้ได้ใหม่ ระหว่างนี้ดูจากหน้ามาแรงหรือวางลิงก์ได้',
  dailyLimitExceeded: 'โควตาของวันนี้หมดแล้ว พรุ่งนี้ใช้ได้ใหม่',
  API_KEY_HTTP_REFERRER_BLOCKED: 'คีย์ YouTube ไม่อนุญาตเว็บนี้ ไปที่ Google Cloud > Credentials > คีย์ของคุณ > Website restrictions แล้วใส่ที่อยู่เว็บนี้ตามด้วย /* ให้ตรง',
  API_KEY_SERVICE_BLOCKED: 'คีย์ YouTube ยังไม่ได้อนุญาต YouTube Data API v3 ไปที่ Credentials > คีย์ของคุณ > API restrictions แล้วติ๊ก YouTube Data API v3',
  SERVICE_DISABLED: 'ยังไม่ได้เปิด YouTube Data API v3 ไปที่ APIs & Services > Library ค้นหา YouTube Data API v3 แล้วกด Enable (รอ 2-3 นาที)',
  accessNotConfigured: 'ยังไม่ได้เปิด YouTube Data API v3 ไปที่ APIs & Services > Library ค้นหา YouTube Data API v3 แล้วกด Enable (รอ 2-3 นาที)',
  API_KEY_INVALID: 'คีย์ YouTube ไม่ถูกต้อง ตรวจว่าคัดลอกครบทุกตัวอักษรใน config.js',
  keyInvalid: 'คีย์ YouTube ไม่ถูกต้อง ตรวจว่าคัดลอกครบทุกตัวอักษรใน config.js',
  ACCESS_DENIED: 'คีย์นี้ใช้กับ YouTube ไม่ได้ ลบคีย์เดิมแล้วสร้างคีย์ใหม่หลังเปิด YouTube Data API v3 (ไม่ติ๊กให้ผูกกับ service account)',
  forbidden: 'คีย์ YouTube ถูกปฏิเสธ ตรวจ Website restrictions และ API restrictions ของคีย์',
  network: 'ต่อ YouTube ไม่ได้ ตรวจอินเทอร์เน็ต หรือปิดตัวบล็อกโฆษณาที่อาจบล็อก googleapis.com',
  gsi: 'เปิดหน้าต่างล็อกอิน Google ไม่ได้ ลองกดอีกครั้ง',
  popup: 'เปิดหน้าต่างล็อกอิน Google ไม่ได้ ลองกดอีกครั้ง',
};
const errText = (e) => `${ERR_HINT[e.message] || 'โหลดไม่สำเร็จ ลองใหม่อีกครั้ง'} (รหัส: ${e.message})`;

async function tab(k, arg) {
  S.tab = ['search', 'channel', 'playlist'].includes(k) ? S.tab : k;
  S.ov?.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k || (k === 'channel' && b.dataset.tab === 'subs') || (k === 'playlist' && b.dataset.tab === 'lists'))));
  const token = ++S.listToken;
  const box = S.ov?.querySelector('#tvList'); if (!box) return;
  const done = (items, empty) => { if (token === S.listToken) renderList(items, empty); };
  const fail = (e) => { if (token === S.listToken) box.innerHTML = `<div class="tv-empty">${esc(errText(e))}</div>`; };
  if (k === 'hist') { done(historyGet(HIST), 'ยังไม่เคยดูด้วยกัน เลือกคลิปแล้วจะชวนอีกคนให้เอง'); return; }
  if (!YOUTUBE_API_KEY && k !== 'subs' && k !== 'lists') { box.innerHTML = `<div class="tv-empty">${needKey()}</div>`; return; }
  if ((k === 'subs' || k === 'lists') && !googleLinked() && !arg) {
    if (!GOOGLE_CLIENT_ID) { box.innerHTML = '<div class="tv-empty"><p><b>ยังไม่ได้ตั้งค่าการเชื่อม Google</b></p><p>ใส่ GOOGLE_CLIENT_ID ใน config.js ตามขั้นตอนใน README ก่อน</p></div>'; return; }
    box.innerHTML = `<div class="tv-empty"><p>เชื่อมบัญชี YouTube ครั้งเดียว เพื่อดู${k === 'subs' ? 'ช่องที่ติดตาม' : 'เพลย์ลิสต์'}ของคุณ</p><button type="button" class="btn primary" id="tvGLink">เชื่อม YouTube</button></div>`;
    box.querySelector('#tvGLink').addEventListener('click', () => googleToken().then(() => tab(k)).catch(fail));
    return;
  }
  loading();
  try {
    if (k === 'trend') done(await api.trending(), 'ยังไม่มีคลิปมาแรง');
    else if (k === 'search') done(await api.search(arg), `ไม่เจอคลิปที่ตรงกับ "${esc(arg)}"`);
    else if (k === 'subs') done((await api.subs()).map((c) => ({ ...c, kind: 'channel', channel: 'ช่อง' })), 'ยังไม่ได้ติดตามช่องไหน');
    else if (k === 'lists') done((await api.playlists()).map((c) => ({ ...c, kind: 'playlist', channel: 'เพลย์ลิสต์' })), 'ยังไม่มีเพลย์ลิสต์');
    else if (k === 'channel') done(await api.items(`UU${arg.id.slice(2)}`, false), 'ช่องนี้ยังไม่มีคลิป');
    else if (k === 'playlist') done(await api.items(arg.id, true), 'เพลย์ลิสต์นี้ว่าง');
  } catch (e) { fail(e); }
}

// เลือกคลิป: ดูด้วยกันอยู่ = เปลี่ยนให้ทั้งคู่, นั่งโซฟาด้วยกัน = ชวนอัตโนมัติ, ไม่งั้นดูคนเดียว
function choose(v) {
  if (!v) return;
  if (S.together) {
    startWatch(v, { playing: true });
    S.ctx.send('tv', { t: 'state', v, pos: 0, playing: true });
    historyAdd(HIST, v);
    return;
  }
  const canInvite = S.ctx.partner && partnerOnline(S.ctx) && (S.ctx.lapRoles || S.ctx.partnerPresence?.page === 'home');
  startWatch(v, { playing: !canInvite });
  if (canInvite) invite();
}

function startWatch(v, { playing = true, pos = 0 } = {}) {
  S.video = v;
  const ov = S.ov;
  ov.querySelector('#tvWatch').hidden = false;
  ov.classList.add('watching');
  showBrowse(false);
  paintInfo(); paintWith();
  S.applying = now() + 1400;
  if (P()) {
    if (playing) S.player.loadVideoById({ videoId: v.id, startSeconds: pos }); else S.player.cueVideoById({ videoId: v.id, startSeconds: pos });
  } else makePlayer(v.id, pos, playing);
  S.lastPos = pos; S.lastAt = now();
  watchSeek();
  if (playing) checkAutoplay();
  if (landscape.matches && !S.fs) setFs(true);
  syncMeta();
  ov.querySelector('.mo-body').scrollTo?.({ top: 0 });
}

function invite() {
  if (!S.video || !S.ctx.partner) return;
  S.waiting = true;
  paintWith();
  S.ctx.send('tv', { t: 'invite', v: S.video, from: S.ctx.me.nickname });
  // อีกคนไม่ได้เปิดแอป: แจ้งเตือนบนมือถือ
  if (!partnerOnline(S.ctx)) {
    sendPush('tv', undefined, S.video.title || '').then((r) => {
      if (r.result === 'ok') toast(`ส่งแจ้งเตือนชวน${partnerName(S.ctx)}ดูหนังแล้ว`);
      else if (r.result === 'no_sub') toast(`${partnerName(S.ctx)} ยังไม่ได้เปิดแจ้งเตือน`, 'error');
      else if (r.result === 'error') toast(pushFailText(r), 'error');
    });
  }
  clearTimeout(S.waitT);
  S.waitT = setTimeout(() => { if (S.waiting) { S.waiting = false; paintWith(); toast(`${partnerName(S.ctx)} ยังไม่ได้กดรับ เริ่มดูคนเดียวไปก่อนนะ`); } }, 60000);
}

export function closeTV() {
  if (S.together) S.ctx.send('tv', { t: 'leave' });
  clearInterval(S.poll); clearInterval(S.beat); clearTimeout(S.waitT); clearTimeout(S.readyT);
  try { S.player?.destroy?.(); } catch { /* ไม่เป็นไร */ }
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  S.chat?.unmount?.();
  S.chat = null; S.chatOpen = false; S.fs = false;
  document.documentElement.classList.remove('fs-on');
  if (S.ctx) S.ctx.tvChat = false;
  S.player = null; S.playerReady = null; S.video = null;
  S.together = false; S.waiting = false;
  musicPaused = false;
  const ov = S.ov;
  S.ov = null;
  document.documentElement.classList.remove('tv-open');
  // เพลงเล่นต่อเฉพาะเครื่องที่ออกจากหนัง (อีกคนที่ยังดูอยู่ไม่ได้ยิน)
  resumeAfterTV();
  // แผงแชทข้างจอคอมกลับมาให้เห็นแล้ว: ข้อความที่ค้างนับว่าอ่าน
  if (S.ctx?.chatVisible?.()) markRead(S.ctx);
  syncMeta();
  if (ov) { ov.classList.remove('on'); setTimeout(() => ov.remove(), 260); }
}

// บอกอีกคนผ่านสถานะออนไลน์ว่าเรากำลังดูคลิปอะไร (ใช้กับปุ่มเข้าร่วม)
function syncMeta() { S.ctx?.room?.track?.(); }
export const tvTogether = () => Boolean(S.ov && S.together && S.video);
export const tvWatching = () => (S.ov && S.video ? { id: S.video.id, title: S.video.title, channel: S.video.channel, thumb: S.video.thumb } : null);

/* ---------- เปิดจากห้อง / จากคำชวน / เข้าร่วม ---------- */
export function openTV(ctx, { join = null } = {}) {
  S.ctx = ctx;
  if (!S.ov) shell();
  preloadGoogle();
  loadYT();
  if (join) {
    S.together = true; S.waiting = false;
    startWatch(join.v, { playing: false, pos: join.pos || 0 });
    paintWith();
    historyAdd(HIST, join.v);
    ctx.send('tv', { t: join.rejoin ? 'rejoin' : 'join' });
  } else if (!S.video) { showBrowse(true); tab(S.tab); }
}
// เข้าร่วมดูต่อทันที (อีกคนดูอยู่แล้ว ไม่ต้องรอกดรับ)
export function joinTV(ctx) {
  const v = ctx.partnerPresence?.watching;
  if (!v?.id) { toast(`${partnerName(ctx)} ปิดทีวีไปแล้ว`); return; }
  openTV(ctx, { join: { v, rejoin: true } });
}
// สถานะออนไลน์ของอีกคนเปลี่ยน (เรียกจาก app.js)
export function tvPresence(ctx) {
  if (!S.ov) return;
  S.ctx = ctx;
  paintWith();
}

export function handleTvEvent(ctx, p) {
  if (!p) return;
  S.ctx = ctx;
  const who = p.from || partnerName(ctx);
  if (p.t === 'invite' && p.v?.id) {
    // หน้าตาเดียวกับคำชวนทำกิจกรรม: รูปคลิป + แมว ปุ่ม ไปดู / ไว้ก่อน
    const { ov, close } = modal('invite-pop tv-invite', `
      <div class="ip-art tv-ip">${p.v.thumb ? `<img src="${esc(p.v.thumb)}" alt="">` : `<span class="tv-ip-ph">${svg('tv', 40)}</span>`}<span class="ip-cat">${catSvg(ctx.home?.cat_color)}</span></div>
      <h2>${esc(who)} ชวนดูหนังด้วยกัน</h2>
      <p class="sheet-sub">${esc(p.v.title || '')}</p>
      <div class="ip-btns"><button type="button" class="btn primary" data-yes>ไปดู</button><button type="button" class="btn" data-no>ไว้ก่อน</button></div>`, 'คำชวนดูหนัง');
    let done = false;
    const finish = (fn) => { if (done) return; done = true; clearTimeout(timer); close(); fn?.(); };
    const timer = setTimeout(() => finish(() => ctx.send('tv', { t: 'no' })), 60000);
    navigator.vibrate?.([80, 60, 80]);
    // อยู่ห้องอื่น: พาไปห้องนั่งเล่นก่อน แล้วค่อยเปิดทีวี (ไม่งั้นการเปลี่ยนห้องจะปิดทีวีทันที)
    ov.querySelector('[data-yes]').addEventListener('click', () => finish(() => {
      if (ctx.route !== 'home') { location.hash = '#/home'; setTimeout(() => openTV(ctx, { join: { v: p.v } }), 450); } else openTV(ctx, { join: { v: p.v } });
    }));
    ov.querySelector('[data-no]').addEventListener('click', () => finish(() => ctx.send('tv', { t: 'no' })));
    ov.addEventListener('click', (e) => { if (e.target === ov) finish(() => ctx.send('tv', { t: 'no' })); });
  } else if (p.t === 'join' || p.t === 'rejoin') {
    if (!S.ov || !S.video) return;
    S.together = true; S.waiting = false;
    clearTimeout(S.waitT);
    paintWith();
    historyAdd(HIST, S.video);
    toast(p.t === 'rejoin' ? `${partnerName(ctx)} กลับมาดูด้วยแล้ว` : `${partnerName(ctx)} มาดูด้วยแล้ว`);
    if (p.t === 'join') {
      // เริ่มพร้อมกัน: เราเล่นแล้วส่งสถานะให้
      S.applying = 0;
      ready().then((pl) => { pl?.playVideo(); setTimeout(sendState, 400); });
    } else {
      S.applying = 0;
      setTimeout(() => S.ctx.send('tv', stateMsg()), 200);
    }
  } else if (p.t === 'no') {
    if (!S.waiting) return;
    S.waiting = false; paintWith();
    toast(`${partnerName(ctx)} ยังไม่สะดวกดูตอนนี้ ดูคนเดียวไปก่อนนะ`);
    ready().then((pl) => pl?.playVideo());
  } else if (p.t === 'leave') {
    if (!S.together) return;
    S.together = false; paintWith();
    toast(`${partnerName(ctx)} ออกไปก่อน กลับมาดูต่อได้ตลอด`);
  } else if ((p.t === 'state' || p.t === 'tick') && S.together && S.ov) {
    if (p.v && (!S.video || S.video.id !== p.v.id)) historyAdd(HIST, p.v);
    applyRemote(p);
  } else if (p.t === 'want' && S.together && S.ov) {
    S.ctx.send('tv', stateMsg());
  } else if (p.t === 'react' && S.together) burstReact(p.k, false);
}

export const tvOpen = () => Boolean(S.ov);
// ข้อความใหม่ระหว่างดูหนัง (แชทยังปิดอยู่): แถบเล็กบนจอวิดีโอ เห็นได้ทั้งตอนเต็มจอ แตะแล้วเปิดแชท
export function tvMessage(ctx, row, text) {
  if (!S.ov || S.chatOpen || !row || row.sender === ctx.me?.id) return;
  const scr = S.ov.querySelector('#tvScreen'); if (!scr) return;
  scr.querySelector('.tv-msg')?.remove();
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tv-msg';
  b.innerHTML = `<span class="tc-av">${avatarSvg(ctx.partnerPresence?.avatar || ctx.partner?.avatar)}</span><span class="tm-txt"><b>${esc(partnerName(ctx))}</b><span>${esc(text.length > 70 ? `${text.slice(0, 70)}...` : text)}</span></span>`;
  b.addEventListener('click', (e) => { e.stopPropagation(); b.remove(); toggleChat(true); });
  scr.appendChild(b);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 300); }, 6000);
}
