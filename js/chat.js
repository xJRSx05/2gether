import { esc } from './ui.js';
import { avatarSvg } from './avatar.js';
import { catSvg } from './cat.js';
import { STICKERS, stickerOf, stickerSvg, stickerCode } from './stickers.js';
import { chat, onChat, REACTIONS, loadOlder, sendMessage, markRead, react, removeMessage, noteTyping } from './chat-store.js';


const CAT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 20c-1-2-1.5-4-1-7L4 4l4.5 3.5h7L20 4l.1 9c.4 3-0 5-1.1 7z"/><circle cx="9.5" cy="13" r=".9" fill="currentColor"/><circle cx="14.5" cy="13" r=".9" fill="currentColor"/><path d="M11 16q1 1 2 0"/></svg>';
const SEND_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-7z"/></svg>';
const timeOf = (iso) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = (iso) => new Date(iso).toDateString();
function dayLabel(iso) {
  const d = new Date(iso);
  const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'เมื่อวาน';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function messageHtml(m, ctx, lastMineId, selected, showFace) {
  const mine = m.sender === ctx.me.id;
  const st = m.deleted ? null : stickerOf(m.body);
  const rx = Object.entries(m.reactions || {});
  const counts = {};
  rx.forEach(([, e]) => { counts[e] = (counts[e] || 0) + 1; });
  const myRx = (m.reactions || {})[ctx.me.id];
  const chips = Object.entries(counts).map(([e, n]) =>
    `<span class="rx${e === myRx ? ' mine' : ''}" aria-label="รีแอ็กชัน ${e} ${n} คน">${e}${n > 1 ? ` ${n}` : ''}</span>`).join('');
  const actions = selected === m.id && !m.deleted ? `
    <div class="msg-actions" role="group" aria-label="จัดการข้อความ">
      ${REACTIONS.map((e) => `<button type="button" class="rx-btn${e === myRx ? ' on' : ''}" data-act="react" data-emoji="${e}" aria-label="รีแอ็กชัน ${e}" aria-pressed="${e === myRx}">${e}</button>`).join('')}
      ${mine ? '<button type="button" class="del-btn" data-act="delete">ลบข้อความ</button>' : ''}
    </div>` : '';
  const status = mine && m.id === lastMineId ? (m.read_at ? ' · อ่านแล้ว' : ' · ส่งแล้ว') : '';
  return `
  <div class="msg ${mine ? 'mine' : 'theirs'}${showFace ? ' first' : ''}" data-id="${m.id}">
    ${!mine && showFace ? `<span class="msg-face" aria-hidden="true">${avatarSvg(ctx.partnerPresence?.avatar || ctx.partner?.avatar)}</span>` : ''}
    <button type="button" class="bt${m.deleted ? ' gone' : ''}${st ? ' is-sticker' : ''}" data-act="select" aria-expanded="${selected === m.id}">${m.deleted ? 'ลบข้อความแล้ว' : st ? stickerSvg(st.id, ctx.home?.cat_color) : esc(m.body).replace(/\n/g, '<br>')}</button>
    ${chips ? `<div class="rxs">${chips}</div>` : ''}
    ${actions}
    <span class="meta">${timeOf(m.created_at)}${status}</span>
  </div>`;
}

// หน้าแชท: ใช้ได้ทั้งเป็นหน้าเต็ม (มือถือ/แท็บเล็ต) และแผงข้างขวา (จอคอม) แต่ละอันมีสถานะของตัวเอง
export function createChatView({ panel = false } = {}) {
  let off = null;
  let selected = null;
  return {
  mount(root, ctx) {
    const other = ctx.partner?.nickname || 'อีกคน';
    root.innerHTML = `
    <section class="chat${panel ? ' in-panel' : ''}">
      ${panel ? `<header class="chat-head"><h2>แชทกับ ${esc(other)}</h2><p class="chat-head-sub" id="chatHeadSub"></p></header>` : ''}
      <div class="chat-list" id="chatList" role="log" aria-label="ข้อความของเรา"></div>
      <p class="typing" id="typing" aria-live="polite" hidden></p>
      <div class="sticker-tray" id="stTray" role="group" aria-label="สติกเกอร์แมว" hidden>
        ${STICKERS.map((s) => `<button type="button" class="st-pick" data-st="${s.id}" aria-label="ส่งสติกเกอร์ ${s.label}">${stickerSvg(s.id, ctx.home?.cat_color)}</button>`).join('')}
      </div>
      <form class="composer" id="composer">
        <span class="chat-cat" aria-hidden="true">${catSvg(ctx.home?.cat_color)}</span>
        <button class="st-btn" type="button" id="stBtn" aria-label="สติกเกอร์" aria-expanded="false" aria-controls="stTray">${CAT_ICON}</button>
        <label class="sr-only" for="msg">ข้อความ</label>
        <textarea id="msg" rows="1" maxlength="1000" placeholder="พิมพ์ข้อความถึง ${esc(other)}..." autocomplete="off"></textarea>
        <button class="send" type="submit" aria-label="ส่งข้อความ">${SEND_ICON}</button>
      </form>
    </section>`;
    const list = root.querySelector('#chatList');
    const typing = root.querySelector('#typing');
    const form = root.querySelector('#composer');
    const input = root.querySelector('#msg');
    selected = null;
    let stick = true;

    const render = () => {
      if (!list.isConnected) return;
      const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 90;
      if (chat.missing) {
        list.innerHTML = '<p class="chat-empty">ยังไม่ได้รันไฟล์ schema-step4.sql ใน Supabase จึงยังแชทไม่ได้ ทำตาม README ส่วนที่ 1 แล้วโหลดหน้านี้ใหม่</p>';
        form.hidden = true;
        return;
      }
      form.hidden = false;
      if (!chat.ready) { list.innerHTML = '<p class="chat-empty">กำลังโหลดข้อความ...</p>'; return; }
      const mineIds = chat.messages.filter((m) => m.sender === ctx.me.id && !m.deleted).map((m) => m.id);
      const lastMineId = mineIds.at(-1);
      let html = chat.hasMore ? '<button type="button" class="older" data-act="older">โหลดข้อความเก่า</button>' : '';
      let day = '';
      let prev = null;
      chat.messages.forEach((m) => {
        let newDay = false;
        if (dayKey(m.created_at) !== day) {
          day = dayKey(m.created_at);
          html += `<div class="day">${dayLabel(m.created_at)}</div>`;
          newDay = true;
        }
        html += messageHtml(m, ctx, lastMineId, selected, newDay || prev !== m.sender);
        prev = m.sender;
      });
      if (!chat.messages.length) html += `<p class="chat-empty">ยังไม่มีข้อความ ลองทักทาย ${esc(other)} ดูสิ</p>`;
      const prevHeight = list.scrollHeight;
      list.innerHTML = html;
      if (stick || nearBottom) list.scrollTop = list.scrollHeight;
      else list.scrollTop += list.scrollHeight - prevHeight;
      stick = false;
      // เปิดแชทอยู่ตอนข้อความโหลดเสร็จ: นับว่าอ่านแล้ว
      if (chat.unread > 0 && (ctx.chatVisible ? ctx.chatVisible() : !document.hidden)) markRead(ctx);
      const isTyping = chat.typingUntil > Date.now();
      typing.hidden = !isTyping;
      typing.textContent = isTyping ? `${other} กำลังพิมพ์...` : '';
      paintSub();
    };
    // หัวแผงแชท: สถานะของอีกคน (อัปเดตบ่อยตามห้องเรียลไทม์ จึงไม่วาดรายการข้อความใหม่ทั้งหมด)
    const paintSub = () => {
      const sub = root.querySelector('#chatHeadSub');
      if (!sub) return;
      const pp = ctx.partnerPresence;
      const on = Boolean(pp && pp.page !== 'away');
      sub.textContent = chat.typingUntil > Date.now() ? 'กำลังพิมพ์...' : on ? 'ออนไลน์อยู่' : 'ไม่ได้ออนไลน์';
      sub.classList.toggle('on', on);
    };
    this.paintSub = paintSub;

    stick = true;
    off = onChat(render);
    render();
    markRead(ctx);

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = Number(btn.closest('.msg')?.dataset.id);
      const act = btn.dataset.act;
      if (act === 'older') { stick = false; loadOlder(ctx); }
      else if (act === 'select') { selected = selected === id ? null : id; render(); }
      else if (act === 'react') { react(ctx, id, btn.dataset.emoji); selected = null; }
      else if (act === 'delete') { removeMessage(ctx, id); selected = null; }
    });

    // ถาดสติกเกอร์
    const tray = root.querySelector('#stTray');
    const stBtn = root.querySelector('#stBtn');
    const toggleTray = (open) => {
      tray.hidden = !open;
      stBtn.setAttribute('aria-expanded', String(open));
      stBtn.classList.toggle('on', open);
    };
    stBtn.addEventListener('click', () => toggleTray(tray.hidden));
    tray.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-st]');
      if (!b) return;
      toggleTray(false);
      stick = true;
      await sendMessage(ctx, stickerCode(b.dataset.st));
    });

    const grow = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; };
    input.addEventListener('input', () => { grow(); if (input.value.trim()) noteTyping(ctx); });
    const submit = async () => {
      const text = input.value;
      if (!text.trim()) return;
      input.value = '';
      grow();
      stick = true;
      const ok = await sendMessage(ctx, text);
      if (!ok) { input.value = text; grow(); }
      input.focus();
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    // คอม: Enter ส่ง Shift+Enter ขึ้นบรรทัดใหม่ มือถือ: Enter ขึ้นบรรทัดใหม่ ส่งด้วยปุ่ม
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer: fine)').matches) {
        e.preventDefault();
        submit();
      }
    });
  },

  update() { this.paintSub?.(); },

  unmount() {
    off?.();
    off = null;
    selected = null;
    this.paintSub = null;
  },
  };
}

export const chatPage = createChatView();
