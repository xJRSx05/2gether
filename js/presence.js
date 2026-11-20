import { sb } from './supabase.js';

// ห้องเรียลไทม์แบบ private: ใช้ได้เฉพาะคนที่ล็อกอินแล้ว (ดู schema.sql ข้อ 4)
// presence = ใครออนไลน์อยู่ + อยู่หน้าไหน + ยืนตรงไหน
// broadcast = nudge (เรียก), go (เดินไปจุดนี้), cat (แมวเดิน), pet (ลูบแมว), bond (แต้มเปลี่ยน)
//   game (ชวนเล่น/จังหวะในเกม), wake/sleepinvite (ปลุก/ชวนนอน), msg (ข้อความใหม่), msgup (ลบ/รีแอ็กชัน), read (อ่านแล้ว), typing (กำลังพิมพ์)
const EVENTS = ['eco', 'admin', 'tv', 'music', 'nudge', 'miss', 'act', 'hand', 'go', 'cat', 'pet', 'bond', 'msg', 'msgup', 'read', 'typing', 'wake', 'sleepinvite', 'home', 'game'];

export function joinRoom({ userId, getMeta, onSync, onEvent, onStatus }) {
  const channel = sb.channel('2gether:room', {
    config: { private: true, presence: { key: userId }, broadcast: { self: false } },
  });

  channel.on('presence', { event: 'sync' }, () => onSync(channel.presenceState()));
  EVENTS.forEach((event) => {
    channel.on('broadcast', { event }, ({ payload }) => onEvent(event, payload));
  });
  channel.subscribe(async (status) => {
    onStatus(status);
    if (status === 'SUBSCRIBED') await channel.track(getMeta());
  });

  let timer = 0;
  let pending = false;
  // track ถี่เกินไปจะโดนจำกัด จึงรวมให้ไม่เกินราว 5 ครั้งต่อวินาที
  const track = () => {
    if (timer) { pending = true; return; }
    channel.track(getMeta());
    timer = setTimeout(() => {
      timer = 0;
      if (pending) { pending = false; track(); }
    }, 200);
  };

  return {
    track,
    send: (event, payload) => channel.send({ type: 'broadcast', event, payload }),
    nudge: (payload) => channel.send({ type: 'broadcast', event: 'nudge', payload }),
    leave: () => { clearTimeout(timer); sb.removeChannel(channel); },
  };
}
