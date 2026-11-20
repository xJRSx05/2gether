import { bump } from './eco.js';
import { sb } from './supabase.js';
import { toast } from './ui.js';
import { pingChat } from './push.js';
import { msgPreview } from './stickers.js';

// ข้อมูลแชทที่ใช้ร่วมกันทั้งแอป (หน้าแชท ป้ายตัวเลข กรอบคำพูดในห้อง)
// ข้อความถูกบันทึกใน Supabase แล้วบอกอีกคนทันทีผ่านห้องเรียลไทม์ ถ้าอีกคนไม่อยู่ก็ดึงตอนเปิดแอป
const PAGE = 100;
export const REACTIONS = ['❤️', '😂', '😮', '😢', '👍'];

export const chat = { messages: [], unread: 0, ready: false, missing: false, hasMore: false, typingUntil: 0 };

const subs = new Set();
export const onChat = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((fn) => fn());

const byId = (a, b) => a.id - b.id;
const recount = (me) => { chat.unread = chat.messages.filter((m) => m.sender !== me && !m.read_at && !m.deleted).length; };
function merge(rows) {
  const map = new Map(chat.messages.map((m) => [m.id, m]));
  rows.forEach((r) => map.set(r.id, r));
  chat.messages = [...map.values()].sort(byId);
}

export function resetChat() {
  Object.assign(chat, { messages: [], unread: 0, ready: false, missing: false, hasMore: false, typingUntil: 0 });
  emit();
}

export async function loadChat(ctx) {
  const { data, error } = await sb.from('messages').select('*').order('id', { ascending: false }).limit(PAGE);
  if (error) {
    chat.missing = /PGRST205|42P01|messages/i.test(`${error.code} ${error.message}`);
    chat.ready = true;
    emit();
    return;
  }
  chat.missing = false;
  if (!chat.ready) chat.hasMore = data.length === PAGE;
  merge(data);
  recount(ctx.me.id);
  chat.ready = true;
  emit();
}

export async function loadOlder(ctx) {
  const first = chat.messages[0]?.id;
  if (!first) return;
  const { data, error } = await sb.from('messages').select('*').lt('id', first).order('id', { ascending: false }).limit(PAGE);
  if (error) { toast('โหลดข้อความเก่าไม่สำเร็จ', 'error'); return; }
  chat.hasMore = data.length === PAGE;
  merge(data);
  recount(ctx.me.id);
  emit();
}

export async function sendMessage(ctx, text) {
  const body = text.trim().slice(0, 1000);
  if (!body) return false;
  const { data, error } = await sb.from('messages').insert({ body }).select().single();
  if (error || !data) { toast('ส่งข้อความไม่สำเร็จ ลองใหม่อีกครั้ง', 'error'); return false; }
  merge([data]);
  emit();
  ctx.send('msg', { row: data });
  bump(ctx, 'chat').catch(() => {});
  // อีกคนไม่ได้เปิดแอปอยู่ -> แจ้งเตือนบนมือถือ ชื่อ + ข้อความ
  const pp = ctx.partnerPresence;
  if (!pp || pp.page === 'away') pingChat(msgPreview(body));
  return true;
}

let marking = false;
export async function markRead(ctx) {
  if (!chat.ready || chat.missing || marking) return;
  recount(ctx.me.id);
  if (chat.unread === 0) { emit(); return; }
  marking = true;
  let data = null;
  try { ({ data } = await sb.rpc('mark_read')); } finally { marking = false; }
  if (!data) return;
  chat.messages.forEach((m) => { if (m.sender !== ctx.me.id && !m.read_at) m.read_at = data; });
  chat.unread = 0;
  emit();
  ctx.send('read', { at: data });
}

async function change(ctx, fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error || !data) { toast('ทำไม่สำเร็จ ลองใหม่อีกครั้ง', 'error'); return; }
  merge([data]);
  emit();
  ctx.send('msgup', { row: data });
}
export const react = (ctx, id, emoji) => change(ctx, 'react_message', { msg_id: id, emoji });
export const removeMessage = (ctx, id) => change(ctx, 'delete_message', { msg_id: id });

let typingSentAt = 0;
export function noteTyping(ctx) {
  const now = Date.now();
  if (now - typingSentAt < 2500) return;
  typingSentAt = now;
  ctx.send('typing', {});
}

// เหตุการณ์สดจากอีกคน
export function handleChatEvent(ctx, event, p) {
  if (event === 'msg' && p?.row) {
    merge([p.row]);
    chat.typingUntil = 0;
    if (ctx.chatVisible ? ctx.chatVisible() : ctx.route === 'chat' && !document.hidden) markRead(ctx);
    else { recount(ctx.me.id); emit(); }
  } else if (event === 'msgup' && p?.row) {
    merge([p.row]);
    recount(ctx.me.id);
    emit();
  } else if (event === 'read' && p?.at) {
    chat.messages.forEach((m) => { if (m.sender === ctx.me.id && !m.read_at) m.read_at = p.at; });
    emit();
  } else if (event === 'typing') {
    chat.typingUntil = Date.now() + 4000;
    emit();
    setTimeout(emit, 4100);
  }
}
