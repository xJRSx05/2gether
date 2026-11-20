import { createRoomView } from './room-view.js';
import { invitePartner, inviteHint } from './invite.js';
import { createGameDirector, loadStats, starText, GAMES } from './game.js';
import { loadCollection, SPECIES } from './collection.js';
import { gameThumb } from './game-icons.js';
import { maybeStart } from './play-invite.js';

// ป้ายใต้การ์ดเกม: Bond วันนี้ / ดาวที่ดีที่สุด / จำนวนรอบ
export function metaPills(stats, id, showStars = true) {
  if (stats === null || stats === undefined) return '';
  const s = stats[id];
  const bond = s?.today
    ? '<span class="pill pill-bond done">ได้ Bond วันนี้แล้ว</span>'
    : '<span class="pill pill-bond">+3 Bond วันนี้</span>';
  if (!s) return `${bond}<span class="pill">ยังไม่เคยเล่น</span>`;
  return `${bond}${showStars ? `<span class="pill stars" aria-label="ดีที่สุด ${s.best} ดาว">${starText(s.best)}</span>` : ''}<span class="pill">เล่นแล้ว ${s.plays} รอบ</span>`;
}

// ห้องเล่นเกมร่วมมือ (ครัว/สวน): ห้องเดินได้ + การ์ดเกม + พื้นที่โชว์ของสะสม
//   cfg = { route, room, label, ariaLabel, games: [id...], collects: [{ kind, title, css, empty }] }
export function createGameRoom(cfg) {
  let director = null;
  let stats; // undefined = ยังไม่โหลด, null = ยังไม่ได้รัน SQL
  let coll;
  const inRoom = (ctx) => ctx.partnerPresence?.page === cfg.route;

  const base = createRoomView({
    route: cfg.route,
    room: cfg.room,
    label: cfg.label,
    ariaLabel: cfg.ariaLabel,
    actionsHtml: `
      <div class="game-list">
        ${cfg.games.map((id) => `
          <button class="game-card" type="button" data-game="${id}">
            ${gameThumb(id)}
            <span class="game-name">${GAMES[id].title}</span>
            <span class="game-desc">${GAMES[id].desc || ''}</span>
            <span class="game-meta"></span>
          </button>`).join('')}
      </div>
      ${cfg.collects.map((c) => `<section class="coll ${c.css}" data-coll="${c.kind}" aria-label="${c.title}"></section>`).join('')}`,
    catRule: (ctx) => inRoom(ctx),

    bind({ ctx, el }) {
      director = createGameDirector(ctx, { roomLabel: cfg.label, onFinish: () => reload(ctx) });
      el.root.querySelectorAll('.game-card').forEach((b) => {
        b.addEventListener('click', () => play(ctx, b.dataset.game));
      });
      reload(ctx);
    },

    refresh({ ctx, el }) {
      if (!inRoom(ctx)) director?.partnerGone();
      const name = ctx.partnerPresence?.nickname || ctx.partner?.nickname || '';
      const together = inRoom(ctx);
      el.root.querySelectorAll('.game-card').forEach((b) => {
        const g = GAMES[b.dataset.game];
        b.querySelector('.game-meta').innerHTML = metaPills(stats, g.id);
        b.setAttribute('aria-label', `${g.title}: ${together ? 'กดเพื่อชวนเล่น' : name ? `ชวน ${name} มาเล่น` : 'ต้องมีอีกคน'}`);
        b.disabled = !ctx.partner;
      });
      cfg.collects.forEach((c) => { el.root.querySelector(`[data-coll=${c.kind}]`).innerHTML = collHtml(c); });
      maybeStart(ctx, cfg.route, director, together);
      el.hint.textContent = stats === null || coll === null
        ? 'ยังไม่ได้รัน schema-final.sql ใน Supabase เกมจึงบันทึกผลไม่ได้'
        : inviteHint(ctx, cfg.label, together);
    },
  });

  function collHtml(c) {
    const list = SPECIES[c.kind];
    const mine = coll?.[c.kind] || {};
    const found = list.filter((s) => mine[s.id]).length;
    const total = Object.values(mine).reduce((a, b) => a + b, 0);
    return `<h2 class="coll-title">${c.title}</h2>
      <p class="coll-sub">เจอแล้ว ${found}/${list.length} ชนิด · ทั้งหมด ${total}</p>
      <div class="coll-grid">${list.map((s, i) => mine[s.id]
        ? `<span class="coll-item r${s.r}" style="--d:${(i % 5) * 0.6}s" title="${s.name}"><b>${s.icon}</b><small>${s.name}${mine[s.id] > 1 ? ` ×${mine[s.id]}` : ''}</small></span>`
        : '<span class="coll-item none" title="ยังไม่เจอ"><b>?</b></span>').join('')}</div>
      ${found === 0 ? `<p class="coll-sub">${c.empty}</p>` : ''}`;
  }

  async function reload(ctx) {
    [stats, coll] = await Promise.all([loadStats(), loadCollection()]);
    base.update(ctx);
  }

  async function play(ctx, id) {
    if (!ctx.partner || director.busy()) return;
    if (inRoom(ctx)) { director.ask(id); return; }
    await invitePartner(ctx, { id, route: cfg.route, label: cfg.label });
    base.update(ctx);
  }

  return {
    ...base,
    unmount() {
      director?.destroy();
      director = null;
      base.unmount();
    },
    onEvent(event, p, ctx) {
      if (event === 'game') director?.onEvent(p);
      else base.onEvent(event, p, ctx);
    },
  };
}
