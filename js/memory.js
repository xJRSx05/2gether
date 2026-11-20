import { esc, toast } from './ui.js';
import { sb } from './supabase.js';
import { dayNumber, isMilestone } from './days.js';
import { bondInfo } from './bond.js';
import { loadCollection, SPECIES } from './collection.js';
import { avatarSvg } from './avatar.js';
import { catSvg } from './cat.js';

const EMOJIS = ['💛', '🥰', '😊', '🌙', '🎮', '🍜', '✨', '🐱'];
const thaiDate = (d, tz) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).format(d);

// วันที่ N ของการอยู่ด้วยกัน -> วันที่ปฏิทิน (วันเริ่มคบ = วันที่ 1)
const dateOfDay = (start, n) => thaiDate(new Date(Date.parse(start) + (n - 1) * 86400000), 'UTC');

function milestonesUpTo(n) {
  const out = [];
  for (let d = 1; d <= n; d += 1) if (isMilestone(d)) out.push(d);
  return out;
}
function nextMilestone(n) {
  for (let d = n + 1; d < n + 800; d += 1) if (isMilestone(d)) return d;
  return null;
}

// สมุดความทรงจำ: วันสำคัญ บันทึกของทั้งคู่ และสรุปของสะสม
export const memory = (() => {
  let root = null;
  let notes = [];
  let coll;
  let notesOk = true;
  let emoji = EMOJIS[0];
  let armed = null; // id บันทึกที่กดลบครั้งแรกแล้ว

  const who = (ctx, id) => (id === ctx.me.id ? ctx.me.nickname : ctx.partner?.nickname || 'อีกคน');

  function timeline(ctx) {
    const start = ctx.home?.start_date;
    const n = dayNumber(start);
    if (!start || !n) return '<p class="hint">ยังไม่ได้ตั้งวันเริ่มคบ ไปตั้งได้ที่หน้าตั้งค่า</p>';
    const done = milestonesUpTo(n);
    const next = nextMilestone(n);
    const bond = bondInfo(ctx.home?.bond);
    return `<ol class="mem-tl">
      <li><b>${thaiDate(new Date(Date.parse(start)), 'UTC')}</b><span>วันที่เราเริ่มต้นด้วยกัน (วันที่ 1)</span></li>
      ${done.map((d) => `<li><b>${dateOfDay(start, d)}</b><span>ครบ ${d} วัน</span></li>`).join('')}
      <li class="now"><b>วันนี้</b><span>วันที่ ${n} · Bond ระดับ ${bond.level}</span></li>
      ${next ? `<li class="next"><b>อีก ${next - n} วัน</b><span>ครบ ${next} วัน (${dateOfDay(start, next)})</span></li>` : ''}
    </ol>`;
  }

  function collections() {
    if (coll === undefined) return '<p class="hint">กำลังโหลด...</p>';
    if (coll === null) return '<p class="hint">ยังไม่ได้รัน schema-final.sql ใน Supabase</p>';
    const rows = [['fish', 'ปลาในตู้ปลา', 'สวน'], ['flower', 'ดอกไม้ในสวน', 'สวน'], ['star', 'ดวงดาวบนท้องฟ้า', 'สวน']];
    return `<ul class="mem-coll">${rows.map(([k, label, where]) => {
      const found = SPECIES[k].filter((s) => coll[k][s.id]).length;
      return `<li><span>${label}</span><b>${found}/${SPECIES[k].length} ชนิด</b><small>เล่นที่${where}</small></li>`;
    }).join('')}</ul>`;
  }

  function noteList(ctx) {
    if (!notesOk) return '<p class="hint">ยังไม่ได้รัน schema-final.sql ใน Supabase จึงเขียนบันทึกไม่ได้</p>';
    if (!notes.length) return '<p class="hint">ยังไม่มีบันทึก เขียนอะไรสักอย่างถึงกันได้เลย</p>';
    return notes.map((m) => `<article class="mem-note">
      <span class="mem-emoji" aria-hidden="true">${esc(m.emoji)}</span>
      <div><p>${esc(m.body)}</p><small>${esc(who(ctx, m.author))} · ${thaiDate(new Date(m.created_at), 'Asia/Bangkok')}</small></div>
      ${m.author === ctx.me.id ? `<button class="btn small ghost" data-del="${m.id}" type="button">${armed === m.id ? 'ลบจริงไหม' : 'ลบ'}</button>` : ''}
    </article>`).join('');
  }

  function paint(ctx) {
    if (!root) return;
    root.querySelector('#memTl').innerHTML = timeline(ctx);
    root.querySelector('#memColl').innerHTML = collections();
    root.querySelector('#memList').innerHTML = noteList(ctx);
  }

  async function load(ctx) {
    const [n, c] = await Promise.all([
      sb.from('memories').select('id, author, body, emoji, created_at').order('created_at', { ascending: false }).limit(100),
      loadCollection(),
    ]);
    notesOk = !n.error;
    notes = n.data || [];
    coll = c;
    paint(ctx);
  }

  return {
    mount(el, ctx) {
      root = el;
      emoji = EMOJIS[0];
      const n = dayNumber(ctx.home?.start_date);
      const pp = ctx.partnerPresence;
      el.innerHTML = `
      <section class="page memory">
        <h1 class="page-title">สมุดความทรงจำ</h1>
        <div class="book">
          <section class="book-page left" aria-label="วันสำคัญของเรา">
            <p class="book-day">${n ? `Day ${n}` : 'สมุดของเรา'}</p>
            <figure class="polaroid" aria-hidden="true">
              <div class="pol-pic">
                <span class="pol-av a">${avatarSvg(ctx.me.avatar)}</span>
                ${ctx.partner ? `<span class="pol-av b">${avatarSvg(pp?.avatar || ctx.partner.avatar)}</span>` : ''}
                <span class="pol-cat">${catSvg(ctx.home?.cat_color)}</span>
              </div>
              <figcaption>${esc(ctx.me.nickname)}${ctx.partner ? ` &amp; ${esc(pp?.nickname || ctx.partner.nickname)}` : ''} &amp; ${esc(ctx.home?.cat_name || 'แมว')}</figcaption>
            </figure>
            <h2>วันสำคัญของเรา</h2>
            <div id="memTl"></div>
          </section>
          <section class="book-page right" aria-label="บันทึกของเรา">
            <form id="memForm" novalidate>
              <h2>เขียนบันทึก</h2>
              <label class="field"><span class="sr-only">ข้อความ</span><textarea name="body" rows="3" maxlength="400" placeholder="วันนี้มีอะไรอยากจำไว้" required></textarea></label>
              <div class="opt-row" role="group" aria-label="อีโมจิ">${EMOJIS.map((e, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-e="${e}" aria-pressed="${i === 0}">${e}</button>`).join('')}</div>
              <button class="btn primary" type="submit">บันทึก</button>
            </form>
            <h2 class="notes-h">บันทึกของเรา</h2>
            <div id="memList"></div>
          </section>
        </div>
        <section class="block-section"><h2>ของสะสม</h2><div id="memColl"></div></section>
      </section>`;
      paint(ctx);
      load(ctx);
      el.querySelector('.opt-row').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-e]');
        if (!b) return;
        emoji = b.dataset.e;
        el.querySelectorAll('[data-e]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      });
      el.querySelector('#memForm').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const ta = ev.target.elements.body;
        const body = ta.value.trim();
        if (!body) { toast('พิมพ์ข้อความก่อนบันทึกนะ', 'error'); return; }
        const { error } = await sb.from('memories').insert({ body, emoji });
        if (error) { toast('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง', 'error'); return; }
        ta.value = '';
        toast('บันทึกแล้ว');
        load(ctx);
      });
      el.querySelector('#memList').addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-del]');
        if (!b) return;
        const id = Number(b.dataset.del);
        if (armed !== id) { armed = id; paint(ctx); return; }
        armed = null;
        const { error } = await sb.from('memories').delete().eq('id', id);
        if (error) toast('ลบไม่สำเร็จ', 'error');
        load(ctx);
      });
    },
    update(ctx) { paint(ctx); },
    unmount() { root = null; armed = null; },
  };
})();
