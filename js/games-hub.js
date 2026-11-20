import { esc } from './ui.js';
import { createGameDirector, loadStats } from './game.js';
import { gameThumb } from './game-icons.js';
import { metaPills } from './game-room.js';
import { maybeStart } from './play-invite.js';
import { CLASSIC } from './games/classic/index.js';
import { invitePartner, inviteHint } from './invite.js';

const inRoom = (ctx) => ctx.partnerPresence?.page === 'games';

// ห้องเกม: เกมคลาสสิก 11 เกมที่เล่นพร้อมกันสองคน (ต้องอยู่ในห้องเกมทั้งคู่)
export const gamesHub = (() => {
  let director = null;
  let root = null;
  let stats;

  function paint(ctx) {
    if (!root) return;
    const name = ctx.partnerPresence?.nickname || ctx.partner?.nickname || '';
    const together = inRoom(ctx);
    if (!together) director?.partnerGone();
    maybeStart(ctx, 'games', director, together);
    root.querySelector('#hubHint').textContent = stats === null
      ? 'ยังไม่ได้รัน schema-final.sql ใน Supabase เกมจึงบันทึกผลไม่ได้'
      : inviteHint(ctx, 'ห้องเกม', together);
    root.querySelectorAll('.game-card').forEach((b) => {
      const id = b.dataset.game;
      b.querySelector('.game-meta').innerHTML = metaPills(stats, id, false);
      b.setAttribute('aria-label', `${b.querySelector('.game-name').textContent}: ${together ? 'กดเพื่อชวนเล่น' : name ? `ชวน ${name} มาเล่น` : 'ต้องมีอีกคน'}`);
      b.disabled = !ctx.partner;
    });
  }

  async function reload(ctx) {
    stats = await loadStats();
    paint(ctx);
  }

  return {
    mount(el, ctx) {
      root = el;
      el.innerHTML = `
      <section class="page games">
        <div>
          <h1 class="page-title">ห้องเกม</h1>
          <p class="lead">${CLASSIC.length} เกมคลาสสิก เล่นสดพร้อมกันสองคน ต้องอยู่ห้องนี้ทั้งคู่ เกมทำอาหาร ตกปลา และเกมกลางคืนอยู่ที่ห้องครัวกับสวน</p>
        </div>
        <p class="hub-hint" id="hubHint" aria-live="polite"></p>
        <div class="game-list">
          ${CLASSIC.map((g) => `<button class="game-card" type="button" data-game="${g.id}">${gameThumb(g.id, ctx.home?.cat_color)}<span class="game-name">${esc(g.title)}</span><span class="game-desc">${esc(g.desc)}</span><span class="game-meta"></span></button>`).join('')}
        </div>
      </section>`;
      director = createGameDirector(ctx, { roomLabel: 'ห้องเกม', onFinish: () => reload(ctx) });
      el.querySelectorAll('.game-card').forEach((b) => b.addEventListener('click', async () => {
        if (!ctx.partner || director.busy()) return;
        if (inRoom(ctx)) { director.ask(b.dataset.game); return; }
        await invitePartner(ctx, { id: b.dataset.game, route: 'games', label: 'ห้องเกม' });
        paint(ctx);
      }));
      reload(ctx);
    },
    update(ctx) { paint(ctx); },
    onEvent(event, p) { if (event === 'game') director?.onEvent(p); },
    unmount() {
      director?.destroy();
      director = null;
      root = null;
    },
  };
})();
