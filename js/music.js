// เครื่องเล่นเพลงด้วยกัน (Spotify): แต่ละคนเชื่อมบัญชีของตัวเองครั้งเดียว แอปจำไว้
// ฟังพร้อมกัน: ใครเปลี่ยนเพลง หยุด หรือเลื่อน อีกเครื่องตาม เจ้าบ้านส่งตำแหน่งทุก 6 วินาที ห่างเกิน 2 วินาทีจะปรับ
import { sendPush, pushFailText } from './push.js';
import { SPOTIFY_CLIENT_ID } from './config.js';
import { sb } from './supabase.js';
import { esc, toast } from './ui.js';
import { modal } from './play-invite.js';
import { avatarSvg } from './avatar.js';
import {
  loadScript, partnerName, partnerOnline, historyGet, historyAdd, mediaOverlay, withChip, mediaInvite, svg, fmtTime,
} from './media-util.js';

const AUTH = 'https://accounts.spotify.com/authorize';
const TOKEN = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1/';
const KEY = '2gether.spotify';
const HIST = '2gether.musicHistory';
const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-library-read';

const M = {
  ctx: null, ov: null, body: null, withEl: null,
  player: null, deviceId: '', connecting: null, error: '',
  track: null, ctxUri: '', paused: true, pos: 0, dur: 0, at: 0,
  together: false, waiting: false, applying: 0, beat: 0, tick: 0, tab: 'lists', listToken: 0, waitT: 0,
};
const now = () => Date.now();

/* ---------- เชื่อมบัญชี (PKCE ไม่ต้องมีรหัสลับบนเซิร์ฟเวอร์) ---------- */
const redirectUri = () => `${location.origin}${location.pathname.replace(/index\.html$/, '')}`;
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rnd = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const saved = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
// เก็บการเชื่อมไว้ทั้งในเครื่องและในบัญชี (ตาราง media_links อ่านได้เฉพาะเจ้าของ) เชื่อมครั้งเดียวใช้ได้ทุกเครื่อง
const save = (t, { sync = true } = {}) => {
  try { if (t) localStorage.setItem(KEY, JSON.stringify(t)); else localStorage.removeItem(KEY); } catch { /* ไม่เป็นไร */ }
  if (sync) syncLink(t);
};
async function syncLink(t) {
  try {
    const { data } = await sb.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    if (t) await sb.from('media_links').upsert({ user_id: uid, spotify: { refresh: t.refresh }, updated_at: new Date().toISOString() });
    else await sb.from('media_links').update({ spotify: null }).eq('user_id', uid);
  } catch { /* ยังไม่ได้รัน schema-admin.sql ก็ใช้ในเครื่องได้ */ }
}
// เปิดแอปในเครื่องใหม่: ดึงการเชื่อม Spotify ที่เคยทำไว้จากบัญชี
export async function loadSpotifyLink(userId) {
  if (!SPOTIFY_CLIENT_ID || !userId) return;
  // เชื่อมไว้ในเครื่องนี้แล้ว (เช่น เพิ่งกลับมาจากหน้า Spotify ก่อนล็อกอินเสร็จ): บันทึกขึ้นบัญชีด้วย
  if (saved()?.refresh) { syncLink(saved()); return; }
  try {
    const { data, error } = await sb.from('media_links').select('spotify').eq('user_id', userId).maybeSingle();
    if (!error && data?.spotify?.refresh) save({ access: '', refresh: data.spotify.refresh, exp: 0 }, { sync: false });
  } catch { /* ไม่เป็นไร */ }
}
// รหัสในบัญชีต่างจากในเครื่อง = อีกเครื่องเพิ่งต่ออายุ ใช้อันล่าสุด
async function pullLink(old) {
  try {
    const { data: u } = await sb.auth.getUser();
    if (!u?.user?.id) return false;
    const { data } = await sb.from('media_links').select('spotify').eq('user_id', u.user.id).maybeSingle();
    const ref = data?.spotify?.refresh;
    if (!ref || ref === old) return false;
    save({ access: '', refresh: ref, exp: 0 }, { sync: false });
    return true;
  } catch { return false; }
}
export const spotifyReady = () => Boolean(SPOTIFY_CLIENT_ID);
export const spotifyLinked = () => Boolean(saved()?.refresh);

export async function spotifyConnect() {
  if (!SPOTIFY_CLIENT_ID) { toast('ยังไม่ได้ใส่ SPOTIFY_CLIENT_ID ใน config.js', 'error'); return; }
  const verifier = rnd(48);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = rnd(12);
  localStorage.setItem('2gether.spPkce', JSON.stringify({ verifier, state, back: location.hash || '#/settings' }));
  const q = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES, state });
  location.assign(`${AUTH}?${q}`);
}
export function spotifyUnlink() {
  save(null);
  dropPlayer();
}
function dropPlayer() {
  try { M.player?.disconnect(); } catch { /* ไม่เป็นไร */ }
  M.player = null; M.deviceId = ''; M.track = null;
  paintMini();
}

// กลับมาจากหน้าอนุญาตของ Spotify (เรียกตอนเปิดแอป)
export async function spotifyReturn() {
  const u = new URL(location.href);
  const code = u.searchParams.get('code');
  const err = u.searchParams.get('error');
  if (!code && !err) return null;
  let pk = null;
  try { pk = JSON.parse(localStorage.getItem('2gether.spPkce') || 'null'); } catch { /* ไม่เป็นไร */ }
  localStorage.removeItem('2gether.spPkce');
  history.replaceState(null, '', `${redirectUri()}${pk?.back || '#/settings'}`);
  if (err || !pk || u.searchParams.get('state') !== pk.state) return 'fail';
  try {
    const r = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: SPOTIFY_CLIENT_ID, code_verifier: pk.verifier }),
    });
    if (!r.ok) return 'fail';
    const j = await r.json();
    save({ access: j.access_token, refresh: j.refresh_token, exp: now() + j.expires_in * 1000 });
    return 'ok';
  } catch { return 'fail'; }
}

let refreshing = null;
async function token() {
  const t = saved();
  if (!t?.refresh) throw new Error('nolink');
  if (t.exp > now() + 60000) return t.access;
  if (!refreshing) {
    refreshing = fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: SPOTIFY_CLIENT_ID }),
    }).then(async (r) => {
      if (!r.ok) {
        // อีกเครื่องอาจต่ออายุไปแล้ว (รหัสเก่าใช้ไม่ได้): ดึงรหัสล่าสุดจากบัญชีมาลองอีกครั้ง
        if (r.status === 400 && await pullLink(t.refresh)) return token();
        if (r.status === 400) { save(null, { sync: false }); dropPlayer(); }
        throw new Error('refresh');
      }
      const j = await r.json();
      save({ access: j.access_token, refresh: j.refresh_token || t.refresh, exp: now() + j.expires_in * 1000 });
      return j.access_token;
    }).finally(() => { refreshing = null; });
  }
  return refreshing;
}
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
async function sp(path, { method = 'GET', body } = {}, retry = true) {
  let r;
  try {
    r = await fetch(API + path, { method, headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    if (e?.message === 'nolink' || e?.message === 'refresh') throw e;
    // เน็ตสะดุดชั่วครู่: รอแล้วลองใหม่หนึ่งครั้ง
    if (retry) { await sleep(900); return sp(path, { method, body }, false); }
    throw new Error('network');
  }
  if (r.status === 401 && retry) { const t = saved(); if (t) save({ ...t, exp: 0 }, { sync: false }); return sp(path, { method, body }, false); }
  if ((r.status === 429 || r.status >= 500) && retry) {
    await sleep(Math.min(4000, (Number(r.headers.get('Retry-After')) || 1) * 1000));
    return sp(path, { method, body }, false);
  }
  if (r.status === 204 || r.status === 202) return null;
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const err = new Error(e?.error?.reason || (r.status === 403 && /registered/i.test(e?.error?.message || '') ? 'notRegistered' : '') || String(r.status));
    err.detail = e?.error?.message || '';
    err.status = r.status;
    throw err;
  }
  return r.json().catch(() => null);
}

/* ---------- เครื่องเล่นในเบราว์เซอร์ (Web Playback SDK) ---------- */
// เครื่องเล่นมีตัวเดียวตลอดการเปิดแอป เตรียมไว้ตั้งแต่เปิดแอป (warmMusic) กดเพลงแล้วเล่นได้ทันที
// หลุดเมื่อไรต่อใหม่เอง ไม่สร้างตัวซ้ำ
let sdk = null;
function loadSDK() {
  if (window.Spotify?.Player) return Promise.resolve();
  if (!sdk) {
    sdk = new Promise((res, rej) => {
      const to = setTimeout(() => { sdk = null; rej(new Error('timeout')); }, 20000);
      window.onSpotifyWebPlaybackSDKReady = () => { clearTimeout(to); res(); };
      loadScript('https://sdk.scdn.co/spotify-player.js').catch(() => { clearTimeout(to); sdk = null; rej(new Error('network')); });
    });
  }
  return sdk;
}
let waiters = [];
const settle = (err, id) => { const w = waiters; waiters = []; w.forEach((x) => (err ? x.rej(err) : x.res(id))); };
function makePlayer() {
  const pl = new window.Spotify.Player({
    name: '2gether',
    // ขอรหัสไม่สำเร็จก็ต้องตอบเครื่องเล่น ไม่งั้นมันค้างรอ
    getOAuthToken: (cb) => token().then(cb).catch((e) => { M.error = e.message; settle(e); cb(''); }),
    volume: 0.8,
  });
  M.player = pl;
  pl.addListener('ready', ({ device_id: id }) => { if (M.player !== pl) return; M.deviceId = id; M.readyAt = now(); M.error = ''; settle(null, id); paint(); });
  pl.addListener('not_ready', () => { if (M.player === pl) { M.deviceId = ''; M.readyAt = 0; paintMini(); } });
  pl.addListener('account_error', () => { M.error = 'premium'; settle(new Error('premium')); });
  pl.addListener('authentication_error', () => { M.error = 'auth'; settle(new Error('auth')); });
  pl.addListener('initialization_error', () => { M.error = 'browser'; settle(new Error('browser')); });
  pl.addListener('playback_error', () => toast('เล่นเพลงนี้ไม่ได้ ลองเพลงอื่นนะ', 'error'));
  // เบราว์เซอร์ไม่ยอมเปิดเสียงเอง (ยังไม่ได้แตะหน้าจอ): ขึ้นปุ่มให้แตะครั้งเดียว
  pl.addListener('autoplay_failed', () => askUnlock());
  pl.addListener('player_state_changed', onLocalState);
  return pl;
}
async function connectOnce(ms) {
  await loadSDK();
  // เครื่องเล่นเดิมที่หลุดไปแล้ว ต่อซ้ำมักไม่กลับมา: ทิ้งแล้วสร้างใหม่ทุกครั้ง
  if (M.player) { try { M.player.disconnect(); } catch { /* ไม่เป็นไร */ } M.player = null; }
  const pl = makePlayer();
  const ready = new Promise((res, rej) => {
    waiters.push({ res, rej });
    setTimeout(() => rej(new Error('timeout')), ms);
  });
  const ok = await pl.connect();
  if (ok === false) throw new Error('browser');
  return ready;
}
function ensurePlayer() {
  if (M.deviceId) return Promise.resolve(M.deviceId);
  if (!spotifyLinked()) return Promise.reject(new Error('nolink'));
  if (M.connecting) return M.connecting;
  M.connecting = (async () => {
    try { return await connectOnce(15000); } catch (e) {
      if (e.message !== 'timeout' && e.message !== 'network') throw e;
      // ช้าหรือหลุด: เริ่มเครื่องเล่นใหม่อีกครั้งก่อนบอกว่าไม่สำเร็จ
      return connectOnce(20000);
    }
  })().finally(() => { M.connecting = null; });
  return M.connecting;
}
// เปิดแอปแล้วเชื่อม Spotify ไว้: เตรียมเครื่องเล่นตอนเครื่องว่าง
export function warmMusic() {
  if (!SPOTIFY_CLIENT_ID || !spotifyLinked() || M.player) return;
  const go = () => ensurePlayer().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
}
// เบราว์เซอร์ส่วนใหญ่ (โดยเฉพาะ Safari) เล่นเสียงได้หลังผู้ใช้แตะหน้าจอ: ปลดล็อกทุกครั้งที่แตะ
document.addEventListener('pointerdown', () => { try { M.player?.activateElement?.(); } catch { /* ไม่เป็นไร */ } }, { capture: true, passive: true });
// กลับมาที่แอป: เครื่องเล่นหลุดระหว่างพักแอป ต่อใหม่
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && M.player && !M.deviceId && spotifyLinked()) ensurePlayer().catch(() => {});
});
function askUnlock() {
  if (document.getElementById('muUnlock')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'muUnlock'; b.className = 'mu-unlock';
  b.innerHTML = `${svg('music', 20)}<span>แตะเพื่อเปิดเสียงเพลง</span>`;
  b.addEventListener('click', () => {
    try { M.player?.activateElement?.(); } catch { /* ไม่เป็นไร */ }
    M.player?.resume().catch(() => {});
    b.remove();
  });
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 30000);
}
// สั่งเล่นที่เครื่องนี้ Spotify ยังไม่รู้จักเครื่อง (เพิ่งต่อ) = โอนการเล่นมาก่อนแล้วลองใหม่
// เครื่องเล่นในเว็บหลุดจาก Spotify (เช่น เปิดแท็บทิ้งไว้นาน) แต่ยังถือรหัสเครื่องเก่า: เริ่มเครื่องเล่นใหม่
async function reconnect() {
  try { M.player?.disconnect(); } catch { /* ไม่เป็นไร */ }
  M.player = null; M.deviceId = ''; M.readyAt = 0;
  return ensurePlayer();
}
// ก่อนเล่น: ตรวจว่า Spotify ยังเห็นเครื่องนี้อยู่ (ต่อไว้นานแล้วเท่านั้น จะได้ไม่ช้า)
async function liveDevice() {
  let id = await ensurePlayer();
  if (now() - (M.readyAt || 0) < 120000) return id;
  try {
    const d = await sp('me/player/devices');
    if (Array.isArray(d?.devices) && !d.devices.some((x) => x.id === id)) id = await reconnect();
    else M.readyAt = now();
  } catch { /* ตรวจไม่ได้ ใช้เครื่องเดิมไปก่อน */ }
  return id;
}
// สั่งเล่นที่เครื่องนี้ Spotify ไม่รู้จักเครื่อง = โอนการเล่นมาแล้วลองใหม่ ยังไม่ได้ = เริ่มเครื่องเล่นใหม่แล้วลองอีกรอบ
async function playOn(id0, body) {
  let id = id0;
  let fresh = false;
  for (let i = 0; ; i += 1) {
    try { await sp(`me/player/play?device_id=${id}`, { method: 'PUT', body }); return id; } catch (e) {
      if (![404, 502, 503].includes(e.status)) throw e;
      if (i >= 2) {
        if (e.status !== 404 || fresh) { const err = new Error('device'); err.status = e.status; throw err; }
        fresh = true; i = -1;
        toast('เครื่องเล่น Spotify หลุด กำลังต่อใหม่...');
        id = await reconnect();
        await sleep(600);
        continue;
      }
      if (e.status === 404) await sp('me/player', { method: 'PUT', body: { device_ids: [id], play: false } }).catch(() => {});
      await sleep(700 * (i + 1));
    }
  }
}
// สั่งเล่นแล้วตรวจว่าเพลงเดินจริง: ไม่เดินก็ลองปลุก ยังไม่ได้อีกก็ขึ้นปุ่มให้แตะเปิดเสียง
let verifyT = 0;
function verifyPlaying(id, body) {
  clearTimeout(verifyT);
  verifyT = setTimeout(async () => {
    const st = await M.player?.getCurrentState().catch(() => null);
    if (M.paused) return;
    if (!st) { try { await playOn(id, body); } catch { /* ไม่เป็นไร */ } return; }
    if (st.paused) {
      await M.player.resume().catch(() => {});
      setTimeout(async () => {
        const st2 = await M.player?.getCurrentState().catch(() => null);
        if (st2?.paused && !M.paused) askUnlock();
      }, 1500);
    }
  }, 2500);
}
const ERR = {
  premium: 'บัญชีนี้ไม่ใช่ Spotify Premium แบบเต็ม (แพ็กเกจ Lite/Mini ใช้ไม่ได้)',
  PREMIUM_REQUIRED: 'บัญชีนี้ไม่ใช่ Spotify Premium แบบเต็ม',
  auth: 'การเชื่อม Spotify หมดอายุ กดเชื่อมใหม่ในตั้งค่า',
  refresh: 'การเชื่อม Spotify หมดอายุ กดเชื่อมใหม่ในตั้งค่า',
  browser: 'เบราว์เซอร์นี้เล่น Spotify ไม่ได้ ลอง Chrome หรือ Safari รุ่นล่าสุด',
  timeout: 'เน็ตช้า ต่อเครื่องเล่น Spotify ไม่ทัน ลองกดอีกครั้ง',
  device: 'Spotify ยังมองไม่เห็นเครื่องเล่นในเว็บ ลองรีเฟรชหน้าแล้วกดเพลงอีกครั้ง',
  network: 'เน็ตหลุด ต่อ Spotify ไม่ได้ ลองอีกครั้ง',
  nolink: 'ยังไม่ได้เชื่อม Spotify',
  notRegistered: 'บัญชี Spotify นี้ยังไม่ได้อยู่ในรายชื่อผู้ใช้ของแอป ไปที่ developer.spotify.com > แอป 2gether > Settings > User Management แล้วเพิ่มอีเมลบัญชีนี้',
  403: 'Spotify ไม่ให้สิทธิ์ ตรวจว่าเพิ่มอีเมลบัญชีนี้ใน User Management แล้ว และเจ้าของแอปยังเป็น Premium',
  404: 'ไม่พบเพลงหรือเพลย์ลิสต์นี้',
  429: 'เรียก Spotify ถี่เกินไป รอสักครู่แล้วลองใหม่',
};
const errText = (e) => `${ERR[e?.message] || 'Spotify ขัดข้อง ลองใหม่อีกครั้ง'}${ERR[e?.message] ? '' : ` (${[e?.message, e?.detail].filter(Boolean).join(': ')})`}`;

/* ---------- สุ่ม / วนเพลง (จำไว้ในเครื่อง) ---------- */
const MODE_KEY = '2gether.musicMode';
const mode = (() => { try { return { shuffle: true, repeat: 'context', ...JSON.parse(localStorage.getItem(MODE_KEY) || '{}') }; } catch { return { shuffle: true, repeat: 'context' }; } })();
const saveMode = () => { try { localStorage.setItem(MODE_KEY, JSON.stringify(mode)); } catch { /* ไม่เป็นไร */ } };
const REPEAT_NEXT = { context: 'track', track: 'off', off: 'context' };
async function applyMode({ spotifyShuffle = false } = {}) {
  if (!M.deviceId) return;
  await sp(`me/player/shuffle?state=${spotifyShuffle}&device_id=${M.deviceId}`, { method: 'PUT' }).catch(() => {});
  await sp(`me/player/repeat?state=${M.driver || !M.together ? mode.repeat : 'off'}&device_id=${M.deviceId}`, { method: 'PUT' }).catch(() => {});
}
const shuffled = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const trackOf = (t) => (t ? { id: t.id || t.uri, uri: t.uri, name: t.name, artist: (t.artists || []).map((a) => a.name).join(', '), art: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '', dur: t.duration_ms || 0 } : null);

// เล่นเพลงที่เครื่องนี้: เพลงเดียว / รายการเพลง (uris) / ทั้งเพลย์ลิสต์ (ctxUri)
async function playHere(tr, { ctxUri = '', uris = null, pos = 0, paused = false, wholeContext = false } = {}) {
  try { M.player?.activateElement?.(); } catch { /* ไม่เป็นไร */ }
  let slowT = 0;
  if (!M.deviceId) slowT = setTimeout(() => toast('กำลังเตรียมเครื่องเล่น Spotify...'), 700);
  const id0 = await liveDevice().finally(() => clearTimeout(slowT));
  const at = Math.max(0, Math.round(pos));
  let body;
  if (wholeContext) body = { context_uri: ctxUri };
  else if (uris?.length) body = { uris, offset: { uri: tr.uri }, position_ms: at };
  else if (ctxUri) body = { context_uri: ctxUri, offset: { uri: tr.uri }, position_ms: at };
  else body = { uris: [tr.uri], position_ms: at };
  const id = await playOn(id0, body);
  if (tr) M.track = tr;
  M.ctxUri = ctxUri; M.paused = false; M.pos = pos; M.at = now();
  if (paused) setTimeout(() => M.player?.pause(), 600);
  else verifyPlaying(id, body);
  M.ctx?.room?.track?.();
  paint();
}

// สถานะเปลี่ยนที่เครื่องเรา (เปลี่ยนเพลง หยุด เลื่อน) → ส่งให้อีกคน
let lastSent = 0;
function onLocalState(st) {
  if (!st) return;
  const cur = st.track_window?.current_track;
  const tr = cur ? { id: cur.id || cur.uri, uri: cur.uri, name: cur.name, artist: (cur.artists || []).map((a) => a.name).join(', '), art: cur.album?.images?.[0]?.url || '', dur: cur.duration_ms } : null;
  const changed = tr?.uri !== M.track?.uri || st.paused !== M.paused || Math.abs(st.position - (M.pos + (M.paused ? 0 : now() - M.at))) > 2500;
  const shown = tr?.uri !== M.track?.uri || st.paused !== M.paused;
  if (tr) M.track = tr;
  M.paused = st.paused; M.pos = st.position; M.dur = st.duration; M.at = now();
  // บอกอีกคนว่าเรากำลังฟังเพลงอะไร (ปุ่มเข้าร่วมฟังของเขา)
  if (shown) M.ctx?.room?.track?.();
  if (st.context?.uri) M.ctxUri = st.context.uri;
  paint();
  // พักเพลงเพราะดูหนังอยู่: ไม่บอกอีกคน (เขาไม่ได้ดูหนังด้วยก็ฟังต่อได้)
  if (changed && M.together && !pausedByTV && !inTV() && now() > M.applying && now() - lastSent > 300) { lastSent = now(); M.ctx.send('music', stateMsg()); }
  // ฟังคนเดียวหรือเป็นคนคุมคิว: เพลงสุดท้ายจบแล้ว (ไม่ได้ตั้งวน) ก็หยุดตามปกติ
}
let pausedByTV = false;
let pendingRemote = null;
const inTV = () => document.documentElement.classList.contains('tv-open');
const stateMsg = () => ({ t: 'state', tr: M.track, ctxUri: M.ctxUri, pos: M.pos + (M.paused ? 0 : now() - M.at), playing: !M.paused });

async function applyRemote(m) {
  if (!m?.tr?.uri) return;
  // อีกคนเลือกเพลง = เขาเป็นคนคุมคิว เครื่องเราเล่นตามทีละเพลง
  if (m.t === 'state' && m.pick) M.driver = false;
  M.applying = now() + 1800;
  try {
    const want = m.pos + (m.playing ? 250 : 0);
    if (M.track?.uri !== m.tr.uri || !M.deviceId) {
      await playHere(m.tr, { ctxUri: M.driver ? m.ctxUri : '', pos: want, paused: !m.playing });
      if (!M.driver) applyMode();
    }
    else {
      const st = await M.player?.getCurrentState();
      const cur = st?.position ?? 0;
      if (Math.abs(cur - want) > (m.t === 'tick' ? 2000 : 900)) await M.player.seek(Math.round(want));
      if (m.playing && st?.paused) await M.player.resume();
      if (!m.playing && st && !st.paused) await M.player.pause();
    }
  } catch (e) { M.error = e.message; paint(); toast(errText(e), 'error'); }
  M.applying = now() + 1200;
}

/* ---------- หน้าจอ ---------- */
function shell() {
  const { ov, body, withEl } = mediaOverlay('music', 'เครื่องเล่นเพลง');
  M.ov = ov; M.body = body; M.withEl = withEl;
  ov.querySelector('[data-close]').addEventListener('click', closeMusic);
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMusic(); });
  render();
}
function render() {
  if (!M.ov) return;
  if (!SPOTIFY_CLIENT_ID) {
    M.body.innerHTML = '<div class="mu-connect"><div class="mu-disc" aria-hidden="true"></div><h3>ยังไม่ได้ตั้งค่า Spotify</h3><p>ใส่ SPOTIFY_CLIENT_ID ใน config.js ตามขั้นตอนใน README หัวข้อ "ตั้งค่าดูทีวีและฟังเพลง"</p></div>';
    return;
  }
  if (!spotifyLinked()) {
    M.body.innerHTML = `<div class="mu-connect"><div class="mu-disc" aria-hidden="true"></div><h3>เชื่อม Spotify ครั้งเดียว</h3><p>ล็อกอินบัญชี Spotify Premium ของคุณ แล้วครั้งต่อไปเปิดเครื่องเล่นก็ฟังได้เลย ${esc(partnerName(M.ctx))} ต้องเชื่อมบัญชีของตัวเองด้วย</p><button type="button" class="btn primary" id="muLink">เชื่อม Spotify</button></div>`;
    M.body.querySelector('#muLink').addEventListener('click', spotifyConnect);
    return;
  }
  M.body.innerHTML = `
    <section class="mu-now" id="muNow"></section>
    <section class="mu-browse">
      <form class="tv-search" id="muSearch" role="search">${svg('search', 20)}<input type="search" id="muQ" placeholder="ค้นหาเพลงหรือศิลปิน" enterkeyhint="search" autocomplete="off" aria-label="ค้นหาเพลง"></form>
      <div class="tv-tabs" role="tablist">${[['lists', 'เพลย์ลิสต์'], ['liked', 'เพลงที่ชอบ'], ['hist', 'ฟังด้วยกัน']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === M.tab}">${l}</button>`).join('')}</div>
      <div class="mu-list" id="muList" aria-live="polite"></div>
    </section>`;
  M.body.querySelector('#muSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = M.body.querySelector('#muQ').value.trim();
    if (q) { M.body.querySelector('#muQ').blur(); tab('search', q); }
  });
  M.body.querySelector('.tv-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) tab(b.dataset.tab); });
  paint();
  tab(M.tab);
}

function paint() {
  paintMini();
  if (!M.ov) return;
  M.withEl.innerHTML = withChip(M.ctx, M.together, M.waiting);
  const box = M.ov.querySelector('#muNow');
  if (!box) return;
  const t = M.track;
  const pav = M.ctx.partnerPresence?.avatar || M.ctx.partner?.avatar;
  const tune = !M.together && !M.waiting ? partnerTune(M.ctx) : null;
  const joinBar = tune && tune.uri !== t?.uri || (tune && !t) ? `<div class="mu-joinbar"><span class="tc-av">${avatarSvg(pav)}</span><span class="mj-txt"><b>${esc(partnerName(M.ctx))} กำลังฟัง</b><span>${esc(tune.name)} · ${esc(tune.artist)}</span></span><button type="button" class="btn small primary" data-join>เข้าร่วม</button></div>` : '';
  box.innerHTML = joinBar + (t ? `
    <div class="mu-card">
      <div class="mu-art ${M.paused ? '' : 'spin'}">${t.art ? `<img src="${esc(t.art)}" alt="">` : ''}</div>
      <div class="mu-meta">
        <p class="mu-name">${esc(t.name)}</p><p class="mu-artist">${esc(t.artist)}</p>
        <div class="mu-time"><span id="muCur">${fmtTime(M.pos / 1000)}</span><div class="tv-progress"><i id="muProg" style="width:${M.dur ? Math.min(100, (M.pos / M.dur) * 100) : 0}%"></i></div><span>${fmtTime((M.dur || t.dur) / 1000)}</span></div>
        <div class="mu-ctrl">
          <button type="button" class="icon-btn mu-mode${mode.shuffle ? ' on' : ''}" data-c="shuffle" aria-pressed="${mode.shuffle}" aria-label="สุ่มเพลง">${svg('shuffle', 20)}</button>
          <button type="button" class="icon-btn" data-c="prev" aria-label="เพลงก่อนหน้า">${svg('prev')}</button>
          <button type="button" class="tv-play" data-c="toggle" aria-label="${M.paused ? 'เล่น' : 'หยุด'}">${svg(M.paused ? 'play' : 'pause', 26)}</button>
          <button type="button" class="icon-btn" data-c="next" aria-label="เพลงถัดไป">${svg('next')}</button>
          <button type="button" class="icon-btn mu-mode${mode.repeat !== 'off' ? ' on' : ''}" data-c="repeat" aria-label="${({ context: 'วนทั้งรายการ', track: 'วนเพลงเดียว', off: 'ไม่วน' })[mode.repeat]}">${svg(mode.repeat === 'track' ? 'repeat1' : 'repeat', 20)}</button>
        </div>
      </div>
      <div class="mu-listeners"><span class="tc-av">${avatarSvg(M.ctx.me.avatar)}</span>${M.together ? `<span class="tc-av">${avatarSvg(pav)}</span><span>ฟังอยู่ 2 คน</span>` : '<span>ฟังคนเดียว</span>'}
        ${tune && tune.uri === t.uri ? '<button type="button" class="btn small primary" data-join>เข้าร่วม</button>' : ''}
        ${!M.together && !tune && M.ctx.partner ? `<button type="button" class="btn small" id="muInvite" ${M.waiting ? 'disabled' : ''}>${M.waiting ? `รอ ${esc(partnerName(M.ctx))} กดรับ...` : `ชวน ${esc(partnerName(M.ctx))} ฟังด้วย`}</button>` : ''}
        ${M.together ? '<button type="button" class="btn small" id="muLeave">ฟังคนเดียว</button>' : ''}</div>
    </div>`
    : `<div class="mu-empty"><div class="mu-disc" aria-hidden="true"></div><p>${M.error ? esc(errText({ message: M.error })) : 'เลือกเพลงจากด้านล่างได้เลย'}</p></div>`);
  box.querySelectorAll('[data-join]').forEach((b) => b.addEventListener('click', () => joinMusic(M.ctx)));
  box.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => control(b.dataset.c)));
  box.querySelector('#muInvite')?.addEventListener('click', invite);
  box.querySelector('#muLeave')?.addEventListener('click', () => { M.ctx.send('music', { t: 'leave' }); M.together = false; paint(); });
}
function control(c) {
  const pl = M.player;
  if (!pl || !M.deviceId) { ensurePlayer().then(() => paint()).catch((e) => toast(errText(e), 'error')); if (!pl) return; }
  try { pl.activateElement?.(); } catch { /* ไม่เป็นไร */ }
  if (c === 'toggle') { pl.togglePlay(); return; }
  if (c === 'shuffle' || c === 'repeat') {
    if (c === 'shuffle') mode.shuffle = !mode.shuffle; else mode.repeat = REPEAT_NEXT[mode.repeat] || 'context';
    saveMode();
    if (M.together) M.ctx.send('music', { t: 'mode', shuffle: mode.shuffle, repeat: mode.repeat });
    if (c === 'repeat') applyMode({ spotifyShuffle: M.wholeContext && mode.shuffle });
    else if (M.wholeContext) applyMode({ spotifyShuffle: mode.shuffle });
    else if (M.list?.length && M.driver !== false) reorder();
    toast(c === 'shuffle' ? (mode.shuffle ? 'เปิดสุ่มเพลง' : 'ปิดสุ่มเพลง') : ({ context: 'วนทั้งรายการ', track: 'วนเพลงนี้เพลงเดียว', off: 'ไม่วน เล่นจบแล้วหยุด' })[mode.repeat]);
    paint();
    return;
  }
  // ฟังด้วยกันแล้วอีกคนคุมคิว: ขอให้เครื่องเขาข้ามเพลงแทน
  if (M.together && M.driver === false) { M.ctx.send('music', { t: 'ctl', c }); return; }
  if (c === 'next') pl.nextTrack();
  if (c === 'prev') pl.previousTrack();
}
// เปลี่ยนสุ่ม/ไม่สุ่มระหว่างเล่นรายการเพลง: เรียงคิวใหม่โดยเพลงที่เล่นอยู่ยังเล่นต่อ
async function reorder() {
  if (!M.track || !M.list?.length) return;
  const rest = M.list.filter((u) => u !== M.track.uri);
  const uris = [M.track.uri, ...(mode.shuffle ? shuffled(rest) : rest)];
  M.queue = uris;
  try { await playHere(M.track, { uris, pos: M.pos + (M.paused ? 0 : now() - M.at), paused: M.paused }); } catch { /* ไม่เป็นไร */ }
}

const row = (t, i) => `<button type="button" class="mu-row${t.kind === 'playlist' ? ' pl' : ''}" data-i="${i}"><span class="mu-thumb">${t.art ? `<img src="${esc(t.art)}" alt="" loading="lazy">` : ''}</span><span class="mu-rmeta"><span class="mu-rname">${esc(t.name)}</span><span class="mu-rsub">${esc(t.artist || t.sub || '')}</span></span>${t.dur ? `<span class="mu-rdur">${fmtTime(t.dur / 1000)}</span>` : ''}${t.kind === 'playlist' ? `<span class="mu-pplay" data-play role="button" aria-label="เล่นทั้งเพลย์ลิสต์ ${esc(t.name)}">${svg('play', 18)}</span>` : ''}</button>`;
const cur = { items: [], ctxUri: '' };
async function tab(k, arg) {
  if (!['search', 'playlist'].includes(k)) M.tab = k;
  M.ov?.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k || (k === 'playlist' && b.dataset.tab === 'lists'))));
  const box = M.ov?.querySelector('#muList'); if (!box) return;
  const tok = ++M.listToken;
  const show = (items, empty, ctxUri = '') => {
    if (tok !== M.listToken) return;
    cur.items = items; cur.ctxUri = ctxUri;
    box.innerHTML = items.length ? items.map(row).join('') : `<div class="tv-empty">${empty}</div>`;
    box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', (e) => {
      const it = cur.items[+b.dataset.i];
      if (e.target.closest('[data-play]')) playWhole(it); else pick(it, cur.ctxUri);
    }));
  };
  box.innerHTML = '<div class="mu-row sk"></div>'.repeat(6);
  try {
    if (k === 'hist') show(historyGet(HIST), 'ยังไม่เคยฟังด้วยกัน เลือกเพลงแล้วกดชวนได้เลย');
    else if (k === 'search') {
      const j = await sp(`search?${new URLSearchParams({ q: arg, type: 'track', limit: 10, market: 'from_token' })}`);
      show((j?.tracks?.items || []).map(trackOf), `ไม่เจอเพลงที่ตรงกับ "${esc(arg)}"`);
    } else if (k === 'liked') {
      const j = await sp('me/tracks?limit=50');
      show((j?.items || []).map((x) => trackOf(x.track)).filter(Boolean), 'ยังไม่มีเพลงที่กดหัวใจไว้');
    } else if (k === 'lists') {
      const j = await sp('me/playlists?limit=30');
      show((j?.items || []).filter(Boolean).map((p) => {
        const n = p.items?.total ?? p.tracks?.total;
        return { id: p.id, uri: p.uri, name: p.name, sub: n != null ? `${n} เพลง` : 'เพลย์ลิสต์ที่ติดตาม', art: p.images?.[0]?.url || '', kind: 'playlist', own: n != null };
      }), 'ยังไม่มีเพลย์ลิสต์');
    } else if (k === 'playlist') {
      // Spotify เปลี่ยนชื่อจุดดึงเพลงในเพลย์ลิสต์เป็น /items ปี 2026 ลองแบบใหม่ก่อน แล้วค่อยแบบเก่า
      // Spotify ให้ดูรายชื่อเพลงได้เฉพาะเพลย์ลิสต์ที่เราสร้างหรือร่วมแก้ เพลย์ลิสต์ที่ติดตามเล่นทั้งเพลย์ลิสต์แทน
      let j = null;
      try { j = await sp(`playlists/${arg.id}/items?limit=50`); } catch { j = null; }
      const list = (j?.items || []).map((x) => trackOf(x.item || x.track)).filter((t) => t?.uri?.startsWith('spotify:track'));
      if (!list.length) {
        if (tok === M.listToken) box.innerHTML = `<div class="tv-empty"><p>เปิดรายชื่อเพลงในเพลย์ลิสต์นี้ไม่ได้ (Spotify ให้ดูเฉพาะเพลย์ลิสต์ที่เราสร้างเอง)</p><button type="button" class="btn primary" id="muWhole">${svg('play', 18)} เล่นทั้งเพลย์ลิสต์</button></div>`;
        box.querySelector('#muWhole')?.addEventListener('click', () => playWhole(arg));
        return;
      }
      show(list, 'เพลย์ลิสต์นี้ว่าง', arg.uri);
    }
  } catch (e) { if (tok === M.listToken) box.innerHTML = `<div class="tv-empty">${esc(errText(e))}</div>`; }
}

// เลือกเพลง: เล่นรายการที่เห็นอยู่ต่อเนื่องจากเพลงนี้ (สุ่มตามที่ตั้ง) ฟังด้วยกันอยู่ = เปลี่ยนให้ทั้งคู่
async function pick(t, ctxUri) {
  if (!t) return;
  if (t.kind === 'playlist') { tab('playlist', t); return; }
  try {
    M.applying = now() + 1800;
    M.driver = true;
    const all = cur.items.filter((x) => x?.uri?.startsWith('spotify:track')).map((x) => x.uri);
    const rest = all.filter((u) => u !== t.uri);
    const uris = [t.uri, ...(mode.shuffle ? shuffled(rest) : rest)].slice(0, 100);
    M.list = all; M.queue = uris; M.wholeContext = false;
    await playHere(t, { ctxUri, uris });
    await applyMode({ spotifyShuffle: false });
    historyAdd(HIST, { id: t.uri, uri: t.uri, name: t.name, artist: t.artist, art: t.art, dur: t.dur });
    if (M.together) M.ctx.send('music', { t: 'state', pick: true, tr: t, ctxUri: '', pos: 0, playing: true });
    M.ov?.querySelector('.mo-body')?.scrollTo?.({ top: 0, behavior: 'smooth' });
  } catch (e) { M.error = e.message; paint(); toast(errText(e), 'error'); }
}
// เล่นทั้งเพลย์ลิสต์ (ใช้กับเพลย์ลิสต์ที่ติดตาม ซึ่ง Spotify ไม่ให้ดูรายชื่อเพลง)
async function playWhole(pl) {
  if (!pl?.uri) return;
  try {
    M.applying = now() + 1800;
    M.driver = true; M.list = null; M.queue = null; M.wholeContext = true;
    await playHere(null, { ctxUri: pl.uri, wholeContext: true });
    await applyMode({ spotifyShuffle: mode.shuffle });
    if (mode.shuffle) setTimeout(() => M.player?.nextTrack(), 500); // เริ่มที่เพลงสุ่ม ไม่ใช่เพลงแรกเสมอ
    toast(`กำลังเล่น ${pl.name}`);
    M.ov?.querySelector('.mo-body')?.scrollTo?.({ top: 0, behavior: 'smooth' });
  } catch (e) { M.error = e.message; paint(); toast(errText(e), 'error'); }
}

function invite() {
  if (!M.track || !M.ctx.partner) return;
  // อีกคนไม่ได้เปิดแอป: แจ้งเตือนบนมือถือ เปิดแอปแล้วกดเข้าร่วมฟังได้เลย
  if (!partnerOnline(M.ctx)) {
    sendPush('music', undefined, `${M.track.name} · ${M.track.artist}`).then((r) => {
      if (r.result === 'ok') toast(`ส่งแจ้งเตือนชวน${partnerName(M.ctx)}ฟังเพลงแล้ว`);
      else if (r.result === 'rate') toast('เพิ่งชวนไป รอสักครู่นะ');
      else if (r.result === 'no_sub') toast(`${partnerName(M.ctx)} ยังไม่ได้เปิดแจ้งเตือน`, 'error');
      else toast(pushFailText(r), 'error');
    });
    return;
  }
  M.waiting = true; paint();
  M.ctx.send('music', { t: 'invite', tr: M.track, from: M.ctx.me.nickname });
  clearTimeout(M.waitT);
  M.waitT = setTimeout(() => { if (M.waiting) { M.waiting = false; paint(); } }, 60000);
}

function closeMusic() {
  const ov = M.ov; M.ov = null;
  if (ov) { ov.classList.remove('on'); setTimeout(() => ov.remove(), 260); }
  paintMini();
}

/* ---------- แถบเพลงเล็กลอยบนห้อง ---------- */
function paintMini() {
  let bar = document.getElementById('musicMini');
  const show = Boolean(M.track && M.deviceId) && !M.ov;
  document.documentElement.classList.toggle('grooving', Boolean(M.track && !M.paused));
  document.documentElement.classList.toggle('grooving-both', Boolean(M.track && !M.paused && M.together));
  document.documentElement.classList.toggle('has-mini', show);
  if (!show) { bar?.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'musicMini';
    bar.className = 'music-mini';
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => {
      if (e.target.closest('[data-c]')) { control(e.target.closest('[data-c]').dataset.c); return; }
      openMusic(M.ctx);
    });
  }
  const t = M.track;
  bar.innerHTML = `<span class="mm-art">${t.art ? `<img src="${esc(t.art)}" alt="">` : ''}</span><span class="mm-meta"><b>${esc(t.name)}</b><small>${M.together ? 'ฟังอยู่ 2 คน' : esc(t.artist)}</small></span><button type="button" class="mm-btn" data-c="toggle" aria-label="${M.paused ? 'เล่น' : 'หยุด'}">${svg(M.paused ? 'play' : 'pause', 20)}</button>`;
}

// เดินเวลาบนหน้าจอเอง ไม่ต้องถาม Spotify ทุกวินาที
function startTicker() {
  clearInterval(M.tick);
  M.tick = setInterval(() => {
    if (!M.track || M.paused) return;
    const pos = M.pos + (now() - M.at);
    const c = M.ov?.querySelector('#muCur'); if (c) c.textContent = fmtTime(pos / 1000);
    const p = M.ov?.querySelector('#muProg'); if (p && M.dur) p.style.width = `${Math.min(100, (pos / M.dur) * 100)}%`;
  }, 1000);
  clearInterval(M.beat);
  M.beat = setInterval(() => {
    if (M.together && M.driver && M.track && !M.paused) M.ctx.send('music', { ...stateMsg(), t: 'tick' });
  }, 6000);
}

/* ---------- เข้าร่วมฟังโดยไม่ต้องขอ (เหมือนดูหนัง) ---------- */
// สิ่งที่ส่งไปในสถานะออนไลน์: เพลงที่กำลังเล่นอยู่ (หยุดอยู่ = ไม่ส่ง)
export function musicListening() {
  if (!M.track?.uri || M.paused || !M.deviceId) return null;
  const t = M.track;
  return { uri: t.uri, id: t.id, name: t.name, artist: t.artist, art: t.art, dur: t.dur };
}
export const musicTogether = () => M.together;
const partnerTune = (ctx) => {
  const pp = ctx?.partnerPresence;
  return pp?.listening?.uri && pp.page !== 'away' ? pp.listening : null;
};
export function joinMusic(ctx) {
  const tr = partnerTune(ctx);
  if (!tr) { openMusic(ctx); return; }
  if (!spotifyLinked()) { openMusic(ctx); toast('เชื่อม Spotify ของเราก่อน แล้วกดเข้าร่วมอีกครั้ง'); return; }
  try { M.player?.activateElement?.(); } catch { /* ไม่เป็นไร */ }
  openMusic(ctx, { join: { tr } });
}
// สถานะอีกคนเปลี่ยน: วาดปุ่มเข้าร่วมใหม่
export function musicPresence(ctx) { M.ctx = ctx; if (M.ov) paint(); }

/* ---------- เปิด / รับคำชวน ---------- */
export function openMusic(ctx, { join = null } = {}) {
  M.ctx = ctx;
  if (!M.ov) shell(); else render();
  startTicker();
  if (spotifyLinked()) ensurePlayer().then(() => paint()).catch((e) => { M.error = e.message; paint(); });
  if (join) {
    M.together = true; M.waiting = false; M.driver = false;
    historyAdd(HIST, { id: join.tr.uri, ...join.tr });
    ctx.send('music', { t: 'join' });
    paint();
  }
}

export function handleMusicEvent(ctx, p) {
  if (!p) return;
  M.ctx = ctx;
  const who = p.from || partnerName(ctx);
  if (p.t === 'invite' && p.tr?.uri) {
    if (!spotifyLinked()) {
      mediaInvite({
        modal,
        art: `<span class="mi-thumb sq">${p.tr.art ? `<img src="${esc(p.tr.art)}" alt="">` : ''}</span>`,
        title: `${who} ชวนฟังเพลงด้วยกัน`,
        sub: 'ต้องเชื่อม Spotify ของคุณก่อน ทำครั้งเดียว',
        yes: 'ไปเชื่อม Spotify',
        onYes: () => { ctx.send('music', { t: 'nolink' }); spotifyConnect(); },
        onNo: () => ctx.send('music', { t: 'no' }),
      });
      return;
    }
    mediaInvite({
      modal,
      art: `<span class="mi-thumb sq">${p.tr.art ? `<img src="${esc(p.tr.art)}" alt="">` : ''}<i>${svg('music', 24)}</i></span>`,
      title: `${who} ชวนฟังเพลงด้วยกัน`,
      sub: `${p.tr.name} · ${p.tr.artist}`,
      yes: 'ฟังด้วย',
      onYes: () => { M.player?.activateElement?.(); openMusic(ctx, { join: { tr: p.tr } }); },
      onNo: () => ctx.send('music', { t: 'no' }),
    });
  } else if (p.t === 'join') {
    M.together = true; M.waiting = false; M.driver = true; clearTimeout(M.waitT);
    if (M.track) historyAdd(HIST, { id: M.track.uri, ...M.track });
    toast(`${partnerName(ctx)} มาฟังด้วยแล้ว`);
    paint();
    setTimeout(() => ctx.send('music', stateMsg()), 300);
  } else if (p.t === 'no') { M.waiting = false; paint(); toast(`${partnerName(ctx)} ยังไม่สะดวกฟังตอนนี้`); }
  else if (p.t === 'nolink') { M.waiting = false; paint(); toast(`${partnerName(ctx)} กำลังไปเชื่อม Spotify รอสักครู่แล้วชวนใหม่นะ`); }
  else if (p.t === 'leave') { if (M.together) { M.together = false; paint(); toast(`${partnerName(ctx)} หยุดฟังด้วยกันแล้ว`); } }
  else if (p.t === 'ctl' && M.together && M.driver) { if (p.c === 'next') M.player?.nextTrack(); if (p.c === 'prev') M.player?.previousTrack(); }
  else if (p.t === 'mode') {
    mode.shuffle = Boolean(p.shuffle); mode.repeat = p.repeat || 'context'; saveMode();
    if (M.driver) { if (M.wholeContext) applyMode({ spotifyShuffle: mode.shuffle }); else if (M.list?.length) reorder(); else applyMode(); }
    paint();
  } else if ((p.t === 'state' || p.t === 'tick') && M.together) {
    if (p.tr && p.tr.uri !== M.track?.uri) historyAdd(HIST, { id: p.tr.uri, ...p.tr });
    // เรากำลังดูหนัง: จำเพลงของอีกคนไว้ก่อน ออกจากหนังแล้วค่อยเล่นตามให้ตรงเวลา
    if (inTV()) { pendingRemote = { ...p, t: p.t === 'state' && p.pick ? 'state' : p.t, at: now() }; return; }
    applyRemote(p);
  }
}

// ดูหนังอยู่: พักเพลงไว้ก่อน ปิดทีวีแล้วเล่นต่อ
export function pauseForTV() {
  if (!M.player || !M.track || M.paused) return;
  pausedByTV = true;
  M.player.pause().catch(() => {});
}
export function resumeAfterTV() {
  const p = pendingRemote;
  pendingRemote = null;
  if (p && M.together) {
    // ฟังด้วยกันอยู่: เล่นตามอีกคน ณ เวลาปัจจุบัน
    pausedByTV = false;
    applyRemote({ ...p, t: 'state', pos: p.pos + (p.playing ? now() - p.at : 0) });
    return;
  }
  if (!pausedByTV) return;
  pausedByTV = false;
  M.player?.resume().catch(() => {});
}

// ออกจากการฟังด้วยกัน (เช่น ออกจากระบบ)
export function leaveMusic() {
  if (M.together) M.ctx?.send('music', { t: 'leave' });
  M.together = false;
  try { M.player?.pause(); } catch { /* ไม่เป็นไร */ }
  paint();
}
