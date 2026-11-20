import { sb } from './supabase.js';
import { VAPID_PUBLIC_KEY } from './config.js';


const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// สถานะแจ้งเตือนของเครื่องนี้: unsupported | ios-install | denied | on | off
export async function pushState() {
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export async function enablePush(userId) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
  }
  const json = sub.toJSON();
  const { error } = await sb.from('push_subscriptions').upsert({
    user_id: userId, subscription: json, enabled: true, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  // แจ้งเตือนได้หลายเครื่อง (มือถือ + คอม): เก็บทุกเครื่องที่เปิดไว้ (ต้องรัน schema-push.sql)
  await sb.from('push_devices').upsert({
    endpoint: json.endpoint, user_id: userId, subscription: json, ua: navigator.userAgent.slice(0, 160), updated_at: new Date().toISOString(),
  }).then(() => {}, () => {});
  return 'on';
}

// เปิดแอปทุกครั้ง: ถ้าเครื่องนี้อนุญาตแจ้งเตือนอยู่ ส่งข้อมูลเครื่องให้เซิร์ฟเวอร์อีกรอบ
// รหัส VAPID ในแอปเปลี่ยน = สมัครใหม่ให้ตรง (ไม่งั้นส่งไม่ถึง)
export async function syncPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  const want = b64ToBytes(VAPID_PUBLIC_KEY);
  const have = sub?.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
  if (sub && have && (have.length !== want.length || have.some((v, i) => v !== want[i]))) { await sub.unsubscribe(); sub = null; }
  if (!sub) {
    // เคยเปิดไว้ในบัญชีนี้ ถึงสมัครใหม่ให้เอง
    const { data } = await sb.from('push_subscriptions').select('enabled').eq('user_id', userId).maybeSingle();
    if (!data?.enabled) return;
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: want });
  }
  const json = sub.toJSON();
  await sb.from('push_subscriptions').upsert({ user_id: userId, subscription: json, enabled: true, updated_at: new Date().toISOString() });
  await sb.from('push_devices').upsert({ endpoint: json.endpoint, user_id: userId, subscription: json, ua: navigator.userAgent.slice(0, 160), updated_at: new Date().toISOString() }).then(() => {}, () => {});
}

export async function disablePush(userId) {
  let endpoint = '';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    endpoint = sub?.endpoint || '';
    await sub?.unsubscribe();
  } catch { /* ไม่เป็นไร */ }
  // ปิดเฉพาะเครื่องนี้ ถ้าไม่เหลือเครื่องไหนเปิดอยู่ค่อยลบทั้งบัญชี
  let left = 0;
  try {
    if (endpoint) await sb.from('push_devices').delete().eq('endpoint', endpoint);
    const { count, error } = await sb.from('push_devices').select('endpoint', { count: 'exact', head: true }).eq('user_id', userId);
    left = error ? 0 : count || 0;
  } catch { /* ไม่เป็นไร */ }
  if (!left) await sb.from('push_subscriptions').delete().eq('user_id', userId);
  return 'off';
}

// เวลาพักของแต่ละชนิดแจ้งเตือน (นับในเครื่องนี้ เซิร์ฟเวอร์เช็กซ้ำอีกชั้น)
const COOLDOWNS = { comehome: 60 * 1000, wake: 10 * 60 * 1000, sleep: 10 * 60 * 1000, play: 10 * 60 * 1000, miss: 60 * 1000, tv: 60 * 1000, music: 60 * 1000 };
const keyOf = (kind) => `2gether.pushAt.${kind}`;

// เหลืออีกกี่วินาทีถึงจะส่งชนิดนี้ได้อีก
export function cooldownLeft(kind = 'comehome') {
  let at = 0;
  try { at = Number(localStorage.getItem(keyOf(kind))) || 0; } catch { /* ไม่เป็นไร */ }
  return Math.max(0, Math.ceil((COOLDOWNS[kind] - (Date.now() - at)) / 1000));
}

// ส่งแจ้งเตือนหาอีกคนตอนเขาไม่ได้เปิดเว็บ kind = comehome | wake | sleep | play | miss | tv | music
// ผลลัพธ์: ok | rate | no_sub | dnd | error
export async function sendPush(kind = 'comehome', room, text) {
  let data = null;
  let error = null;
  try { ({ data, error } = await sb.functions.invoke('nudge-push', { body: { kind, room, text } })); } catch (e) { error = e; }
  if (error || !data) {
    // อ่านสาเหตุจริงจากเซิร์ฟเวอร์ ให้บอกผู้ใช้ได้ว่าต้องแก้ตรงไหน
    let reason = 'error';
    const res = error?.context;
    if (res && typeof res.status === 'number') {
      try { reason = (await res.clone().json())?.reason || ''; } catch { reason = ''; }
      if (!reason) reason = res.status === 404 ? 'not_deployed' : res.status === 401 ? 'jwt' : `http_${res.status}`;
    } else if (error?.name === 'FunctionsFetchError' || /fetch|network|cors/i.test(error?.message || '')) reason = 'not_deployed';
    return { result: 'error', reason };
  }
  if (data.ok) {
    try { localStorage.setItem(keyOf(kind), String(Date.now())); } catch { /* ไม่เป็นไร */ }
    return { result: 'ok' };
  }
  if (data.reason === 'rate') {
    try { localStorage.setItem(keyOf(kind), String(Date.now() - COOLDOWNS[kind] + (data.retry_after || 0) * 1000)); } catch { /* ไม่เป็นไร */ }
    return { result: 'rate', retryAfter: data.retry_after || 0 };
  }
  return { result: ['no_sub', 'dnd'].includes(data.reason) ? data.reason : 'error', reason: data.reason };
}

// ข้อความบอกสาเหตุที่ส่งแจ้งเตือนไม่สำเร็จ (บอกว่าต้องแก้ตรงไหน)
const FAIL = {
  not_deployed: 'ส่งแจ้งเตือนไม่ได้: ยังไม่ได้ติดตั้งฟังก์ชัน nudge-push ใน Supabase (ดูคู่มือส่วนที่ 1.5)',
  jwt: 'ส่งแจ้งเตือนไม่ได้: ปิดสวิตช์ Verify JWT ของฟังก์ชัน nudge-push ใน Supabase ก่อน',
  no_vapid: 'ส่งแจ้งเตือนไม่ได้: ยังไม่ได้ใส่ Secrets VAPID ใน Supabase > Edge Functions > Secrets',
  vapid_mismatch: 'ส่งแจ้งเตือนไม่ได้: รหัส VAPID ไม่ตรงกัน ให้ปิดแล้วเปิดแจ้งเตือนใหม่ในตั้งค่าบนเครื่องที่รับ',
  send_failed: 'ส่งแจ้งเตือนไม่สำเร็จ บริการแจ้งเตือนของมือถือไม่ตอบ ลองใหม่อีกครั้ง',
  no_partner: 'ยังไม่มีอีกคนในบ้าน',
  unauthorized: 'ส่งแจ้งเตือนไม่ได้: การล็อกอินหมดอายุ ลองออกแล้วเข้าใหม่',
  no_service_key: 'ส่งแจ้งเตือนไม่ได้: ฟังก์ชันหากุญแจของโปรเจกต์ไม่เจอ ลองสร้าง Secret key ใน Settings > API Keys',
};
export const pushFailText = (r) => FAIL[r?.reason] || `ส่งแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง${r?.reason && r.reason !== 'error' ? ` (${r.reason})` : ''}`;

// แจ้งเตือนแชท: ชื่อ + ข้อความ ทุกข้อความ (ข้อความติดกันรวมเป็นอันเดียว แสดงข้อความล่าสุด)
export function pingChat(text = '') {
  sb.functions.invoke('nudge-push', { body: { kind: 'chat', text } }).catch(() => {});
}

// ตัวเลขบนไอคอนแอป (iPhone ที่เพิ่มไว้หน้าโฮม และเบราว์เซอร์ที่รองรับ)
export function setAppBadge(n) {
  try {
    if (!('setAppBadge' in navigator)) return;
    (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  } catch { /* ไม่เป็นไร */ }
}

// พักแจ้งเตือน: hours = จำนวนชั่วโมง หรือ null เพื่อกลับมาเปิดปกติ คืนเวลาที่พักถึง (หรือ null)
export async function setDnd(userId, hours) {
  const until = hours ? new Date(Date.now() + hours * 3600000).toISOString() : null;
  const { error } = await sb.from('push_subscriptions').update({ dnd_until: until }).eq('user_id', userId);
  if (error) throw error;
  return until;
}

export async function getDnd(userId) {
  const { data } = await sb.from('push_subscriptions').select('dnd_until').eq('user_id', userId).maybeSingle();
  const t = data?.dnd_until ? new Date(data.dnd_until) : null;
  return t && t > new Date() ? t : null;
}

export const partnerPushEnabled = async () => {
  const { data, error } = await sb.rpc('partner_push_enabled');
  return error ? null : Boolean(data);
};
