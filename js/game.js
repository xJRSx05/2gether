import { toast, esc } from './ui.js';
import { confetti, celebrate, petals } from './fx.js';
import { avatarSvg } from './avatar.js';
import { gameThumb } from './game-icons.js';
import { catSvg } from './cat.js';
import { todayIso } from './days.js';
import { invitePopup } from './play-invite.js';
import { sb } from './supabase.js';
import { cookCat } from './games/cook-cat.js';
import { cookTogether } from './games/cook-together.js';
import { fishing } from './games/fishing.js';
import { planting } from './games/planting.js';
import { firefly } from './games/firefly.js';
import { starCatch } from './games/star-catch.js';
import { speciesInfo } from './collection.js';
import { CLASSIC } from './games/classic/index.js';

const CROWN = '<svg viewBox="0 0 40 26"><path d="M3 22 1 6l10 7 9-12 9 12 10-7-2 16z" fill="#F7C548" stroke="#9A6A10" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="14" r="2.6" fill="#E85A71"/><circle cx="10" cy="17" r="2" fill="#5AB2E8"/><circle cx="30" cy="17" r="2" fill="#5AB2E8"/></svg>';
const HANDSHAKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l2 2a1 1 0 1 0 3-3"/><path d="M14 14l2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="M21 3l1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/></svg>';
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z" fill="#F2617F"/></svg>';

export const GAMES = { cookcat: cookCat, cooktog: cookTogether, fish: fishing, plant: planting, firefly, starcatch: starCatch, ...Object.fromEntries(CLASSIC.map((g) => [g.id, g])) };

const COUNTDOWN = 3;
const ASK_TIMEOUT = 25000;

export const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

export const starsFor = (game, score) => game.stars.filter((t) => score >= t).length;

// สถิติของแต่ละเกม: ดาวสูงสุด จำนวนรอบที่เล่น และวันนี้ได้ Bond ของเกมนี้ไปแล้วหรือยัง
// (Bond ได้ครั้งแรกของวันที่ได้อย่างน้อย 1 ดาว นับวันตามเวลาไทย) คืน null ถ้ายังไม่ได้รัน schema-final.sql
const bkkDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' });
export async function loadStats() {
  const { data, error } = await sb.from('game_results').select('game, stars, created_at').limit(1000);
  if (error) return null;
  const today = todayIso();
  const out = {};
  for (const r of data) {
    const s = (out[r.game] ||= { best: 0, plays: 0, today: false });
    s.plays += 1;
    s.best = Math.max(s.best, r.stars);
    if (r.stars > 0 && r.created_at && bkkDay.format(new Date(r.created_at)) === today) s.today = true;
  }
  return out;
}

// ตัวคุมเกมร่วมมือ: ชวน > ตอบรับ > นับถอยหลัง > เล่น > สรุปผล
// ทุกขั้นคุยกันผ่านเหตุการณ์ 'game' ในห้องเรียลไทม์ ({t: ask|yes|no|go|act|end|quit})
// ฝั่งที่ชวน (role a) เป็นผู้ตัดสินคะแนนสุดท้ายและเป็นคนบันทึกผล
export function createGameDirector(ctx, { onFinish, roomLabel = 'ห้องครัว' } = {}) {
  let phase = 'idle'; // idle | asking | invited | run | finishing | result
  let gid = null;
  let role = 'a';
  let game = null;
  let inst = null;
  let ov = null;
  let timers = [];
  let tick = 0;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; clearInterval(tick); tick = 0; };
  const pName = () => ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
  const send = (p) => ctx.send('game', { g: gid, ...p });

  function show(html, label) {
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'game-ov';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      // กดค้างในเกมไม่ให้ขึ้นเมนูของเบราว์เซอร์ (คัดลอก/ค้นหา)
      ov.addEventListener('contextmenu', (e) => e.preventDefault());
      document.body.appendChild(ov);
      document.documentElement.classList.add('game-open');
    }
    ov.setAttribute('aria-label', label || 'เกม');
    ov.classList.toggle('night', Boolean(game?.night));
    ov.innerHTML = `<div class="game-box">${html}</div>`;
    return ov;
  }
  let popClose = null;
  function close() {
    popClose?.();
    popClose = null;
    clearAll();
    inst?.stop?.();
    inst = null;
    game = null;
    gid = null;
    phase = 'idle';
    ov?.remove();
    ov = null;
    document.documentElement.classList.remove('game-open');
  }
  function abort(message) {
    if (phase === 'idle') return;
    close();
    if (message) toast(message, 'error');
  }

  /* ---------- ชวนและตอบรับ ---------- */
  function ask(id) {
    if (phase !== 'idle' || !GAMES[id]) return;
    gid = id;
    game = GAMES[id];
    phase = 'asking';
    show(`<h2 class="gm-title">${esc(game.title)}</h2>
      <p class="gm-lead">กำลังชวน ${esc(pName())} รอสักครู่...</p>
      <button class="btn" id="gmCancel" type="button">ยกเลิก</button>`, game.title);
    ov.querySelector('#gmCancel').addEventListener('click', () => { send({ t: 'quit' }); close(); });
    send({ t: 'ask' });
    later(() => { if (phase === 'asking') { send({ t: 'quit' }); abort(`${pName()} ยังไม่ตอบ ลองใหม่อีกครั้ง`); } }, ASK_TIMEOUT);
  }

  function invited(id) {
    gid = id;
    game = GAMES[id];
    phase = 'invited';
    // คำชวนในห้องเดียวกันเป็นป๊อปอัปเหมือนตอนชวนจากห้องอื่น (ยังไม่เปิดหน้าเกมจนกว่าจะกดรับ)
    popClose = invitePopup(ctx, {
      g: id,
      from: pName(),
      onYes: () => { popClose = null; send({ t: 'yes' }); },
      onNo: () => { popClose = null; send({ t: 'no' }); close(); },
    });
  }

  // คนที่ชวนเป็นคนสุ่ม seed แล้วบอกให้เริ่มพร้อมกัน
  function startAsAsker() {
    const seed = Math.floor(Math.random() * 1e9);
    send({ t: 'go', seed, first: ctx.me.id });
    begin(gid, seed, 'a');
  }

  /* ---------- เล่น ---------- */
  function begin(id, seed, myRole) {
    clearAll();
    gid = id;
    game = GAMES[id];
    role = myRole;
    phase = 'run';
    const classic = Boolean(game.classic);
    const box = show(`
      <header class="gm-head"><b>${esc(game.title)}</b><span class="gm-time" id="gmTime"></span>
        <button class="btn small ghost" id="gmQuit" type="button">ออก</button></header>
      ${classic ? '' : '<div class="gm-bar"><i id="gmBar"></i></div>'}
      <div class="gm-area" id="gmArea"></div>
      ${classic ? '' : '<div class="gm-count" id="gmCount" aria-live="assertive"></div>'}`, game.title);
    box.querySelector('#gmQuit').addEventListener('click', () => { send({ t: 'quit' }); close(); });
    inst = game.create({
      el: box.querySelector('#gmArea'),
      role,
      seed,
      send: (a) => send({ t: 'act', a }),
      end: finishClassic,
      catColor: ctx.home?.cat_color,
      catName: ctx.home?.cat_name || 'แมว',
      partnerName: pName(),
      myName: ctx.me?.nickname || 'คุณ',
    });
    if (classic) { inst.start?.(); return; }
    const count = box.querySelector('#gmCount');
    let n = COUNTDOWN;
    count.textContent = String(n);
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) { count.textContent = String(n); return; }
      clearInterval(t);
      count.textContent = 'เริ่ม!';
      later(() => { count.textContent = ''; count.hidden = true; }, 500);
      run();
    }, 1000);
    timers.push(t);
  }

  // เกมคลาสสิกจบเมื่อเกมเรียก end({ winner: 'a'|'b'|'draw'|'win'|'lose', text? })
  // ทั้งสองเครื่องคำนวณผลเหมือนกัน คนที่ชวน (a) บันทึกผลและประกาศ
  async function finishClassic(res) {
    if (phase !== 'run') return;
    phase = 'finishing';
    if (role === 'a') {
      const r = await Promise.race([
        ctx.awardGame(gid, 1, 0),
        new Promise((resolve) => setTimeout(() => resolve(false), 3000)),
      ]);
      send({ t: 'end', score: 0, stars: 1, awarded: r === true, res });
      result(0, 1, r === true, [], res);
    } else {
      later(() => { if (phase === 'finishing') result(0, 1, false, [], res); }, 5000);
    }
  }

  function run() {
    inst.start();
    const t0 = performance.now();
    const total = game.seconds * 1000;
    tick = setInterval(() => {
      const left = Math.max(0, total - (performance.now() - t0));
      const bar = ov?.querySelector('#gmBar');
      const time = ov?.querySelector('#gmTime');
      if (bar) bar.style.width = `${(left / total) * 100}%`;
      if (time) time.textContent = `${Math.ceil(left / 1000)} วิ`;
      if (left <= 0) finish();
    }, 200);
  }

  async function finish() {
    if (phase !== 'run') return;
    clearInterval(tick);
    inst.stop();
    phase = 'finishing';
    const own = inst.score();
    if (role === 'a') {
      const stars = starsFor(game, own);
      const items = (inst.items?.() || []).slice(0, 10);
      const r = await Promise.race([
        ctx.awardGame(gid, stars, own),
        new Promise((res) => setTimeout(() => res(false), 3000)),
      ]);
      if (items.length) await Promise.race([ctx.addItems(game.kind, items), new Promise((res) => setTimeout(res, 3000))]);
      send({ t: 'end', score: own, stars, awarded: r === true, items });
      result(own, stars, r === true, items);
    } else {
      later(() => { if (phase === 'finishing') result(own, starsFor(game, own), false, (inst.items?.() || []).slice(0, 10)); }, 5000);
    }
  }

  function result(score, stars, awarded, items = [], res = null) {
    clearAll();
    inst?.stop?.();
    phase = 'result';
    const bondText = awarded ? 'Bond +3 (ครั้งแรกของวันสำหรับเกมนี้)' : stars === 0 ? 'ยังไม่ถึงดาวแรก ลองอีกรอบนะ' : 'Bond ของเกมนี้วันนี้ได้ไปแล้ว';
    const itemsHtml = items.length
      ? `<p class="gm-items" aria-label="ของที่ได้">${items.map((sp) => { const i = speciesInfo(game.kind, sp); return i ? `<span title="${esc(i.name)}">${i.icon}</span>` : ''; }).join('')}</p><p class="gm-desc">ได้ของสะสมใหม่ ดูที่${esc(game.collectAt)}</p>`
      : '';
    // ฉลอง: ชนะเกมคลาสสิก (หรือทายคำถูกด้วยกัน) / ได้ 3 ดาว = จัดเต็ม, 1-2 ดาว = กระดาษสี, แพ้/เสมอ = กลีบดอกไม้
    const won = res ? (res.winner === role || res.winner === 'win') : stars === 3;
    const cast = `<span class="cc-av">${avatarSvg(ctx.me.avatar)}</span>${ctx.partner ? `<span class="cc-av b">${avatarSvg(ctx.partnerPresence?.avatar || ctx.partner.avatar)}</span>` : ''}<span class="cc-cat">${catSvg(ctx.home?.cat_color)}</span>`;
    if (won) setTimeout(() => celebrate({ title: res ? 'ชนะ!' : '3 ดาว!', sub: res ? (res.winner === 'win' ? 'ช่วยกันจนสำเร็จ' : `เก่งมาก ชนะ${esc(pName())}ได้`) : `${esc(game.title)} ได้ ${score} ${esc(game.unit)}`, bond: awarded ? 3 : 0, cast }), 200);
    else if (!res && stars > 0) setTimeout(confetti, 250);
    else petals();
    // การ์ดสรุปผล: ตัวละครสองคน คนชนะมีมงกุฎ คนแพ้ยิ้มแห้ง เสมอจับมือกัน
    const meAv = ctx.me.avatar;
    const pAv = ctx.partnerPresence?.avatar || ctx.partner?.avatar;
    const teamLose = res?.winner === 'lose';
    const outcome = res ? (res.winner === 'draw' ? 'draw' : (res.winner === role || res.winner === 'win') ? 'win' : 'lose') : 'coop';
    const crownMe = outcome === 'win' || (outcome === 'coop' && stars === 3) || res?.winner === 'win';
    const crownP = (outcome === 'lose' && !teamLose) || (outcome === 'coop' && stars === 3) || res?.winner === 'win';
    const face = (av, state) => avatarSvg({ ...(av || {}), eyes: state === 'lose' ? 'smile' : state === 'win' ? 'sparkle' : (av?.eyes || 'round') });
    const meState = outcome === 'lose' ? 'lose' : crownMe ? 'win' : 'neutral';
    const pState = (outcome === 'win' && res?.winner !== 'win') || teamLose ? 'lose' : crownP ? 'win' : 'neutral';
    const fig = (av, state, crown, label) => `<figure class="rc-p ${state}">
        ${crown ? `<span class="rc-crown" aria-hidden="true">${CROWN}</span>` : ''}
        <span class="rc-av">${face(av, state)}${state === 'lose' ? '<span class="rc-sweat" aria-hidden="true"></span>' : ''}</span>
        <figcaption>${esc(label)}</figcaption></figure>`;
    const mid = outcome === 'draw' ? `<span class="rc-mid draw" aria-label="เสมอ">${HANDSHAKE}</span>`
      : outcome === 'coop' || teamLose || res?.winner === 'win' ? `<span class="rc-mid" aria-hidden="true">${HEART}</span>` : '<span class="rc-mid vs" aria-hidden="true">VS</span>';
    const title = res ? (outcome === 'win' ? (res.winner === 'win' ? 'สำเร็จด้วยกัน!' : 'คุณชนะ!') : outcome === 'draw' ? 'เสมอกัน' : teamLose ? 'เกือบแล้ว!' : `${pName()} ชนะ`) : `ได้ ${score} ${game.unit}`;
    const sub = res?.text || (res ? (outcome === 'lose' ? 'รอบหน้าเอาคืนนะ' : outcome === 'draw' ? 'สูสีกันสุดๆ' : '') : '');
    show(`<div class="rc" data-outcome="${outcome}">
        <div class="rc-head">${gameThumb(gid, ctx.home?.cat_color)}<span>${esc(game.title)}</span></div>
        <div class="rc-cast">${fig(meAv, meState, crownMe, 'คุณ')}${mid}${ctx.partner ? fig(pAv, pState, crownP, pName()) : ''}</div>
        ${res ? '' : `<p class="gm-stars" aria-label="${stars} ดาว">${starText(stars)}</p>`}
        <h2 class="rc-title">${esc(title)}</h2>
        ${sub ? `<p class="rc-sub">${esc(sub)}</p>` : ''}
        ${itemsHtml}
        <p class="rc-bond ${awarded ? 'got' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg>${awarded ? 'Bond +3' : esc(bondText)}</p>
        <div class="gm-row rc-row">
          <button class="btn primary" id="gmAgain" type="button">เล่นอีกรอบ</button>
          <button class="btn" id="gmClose" type="button">กลับ${esc(roomLabel)}</button>
        </div>
      </div>`, 'สรุปผล');
    ov.querySelector('#gmAgain').addEventListener('click', () => { const id = gid; close(); ask(id); });
    ov.querySelector('#gmClose').addEventListener('click', close);
    onFinish?.();
  }

  /* ---------- รับเหตุการณ์จากอีกคน ---------- */
  function onEvent(p) {
    if (!p) return;
    if (p.t === 'ask') {
      if (phase === 'idle' && GAMES[p.g]) {
        // กดรับจากการ์ดคำชวนมาแล้ว: เริ่มเลยไม่ต้องถามซ้ำ
        const pg = ctx.pendingGame;
        if (pg && !pg.asker && pg.g === p.g) {
          ctx.pendingGame = null;
          gid = p.g; game = GAMES[p.g]; phase = 'invited';
          show(`<h2 class="gm-title">${esc(game.title)}</h2><p class="gm-lead">กำลังเริ่มเกม...</p>`, game.title);
          send({ t: 'yes' });
        } else invited(p.g);
      }
      else if (phase === 'asking' && p.g === gid) {
        // ชวนพร้อมกัน: คนที่ id น้อยกว่าเป็นผู้เริ่ม
        if (String(ctx.me.id) < String(ctx.partner?.id || '')) startAsAsker();
      } else send({ t: 'no' });
    } else if (p.t === 'yes') {
      if (phase === 'asking' && p.g === gid) startAsAsker();
    } else if (p.t === 'no') {
      if (phase === 'asking') abort(`${pName()} ยังไม่พร้อมเล่น`);
    } else if (p.t === 'go') {
      if ((phase === 'invited' || phase === 'asking') && p.g === gid) begin(gid, p.seed, p.first === ctx.me.id ? 'a' : 'b');
    } else if (p.t === 'act') {
      if (phase === 'run' && p.g === gid) inst?.onAct(p.a);
    } else if (p.t === 'end') {
      if ((phase === 'finishing' || phase === 'run') && p.g === gid) result(p.score, p.stars, Boolean(p.awarded), p.items || [], p.res || null);
    } else if (p.t === 'quit') {
      if (phase === 'asking' || phase === 'invited') abort();
      else if (phase === 'run' || phase === 'finishing') abort(`${pName()} ออกจากเกมแล้ว`);
    }
  }

  return {
    ask,
    onEvent,
    busy: () => phase !== 'idle',
    // อีกคนออกจากห้องครัวระหว่างเกม
    partnerGone() {
      if (['asking', 'invited', 'run', 'finishing'].includes(phase)) abort(`${pName()} ออกจาก${roomLabel}แล้ว`);
    },
    destroy() {
      if (['run', 'finishing', 'asking'].includes(phase)) send({ t: 'quit' });
      close();
    },
  };
}
