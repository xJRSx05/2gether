import { toast } from './ui.js';
import { createRoomView } from './room-view.js';
import { LIVING } from './rooms.js';
import { cooldownLeft, sendPush, pushFailText } from './push.js';

let sending = false;

// ห้องนั่งเล่น: นั่งโซฟา ลูบแมว เรียกอีกคน (ออนไลน์ = เรียกสด ออฟไลน์ = แจ้งเตือน "กลับบ้านกันเถอะ")
export const home = createRoomView({
  route: 'home',
  room: LIVING,
  label: 'ห้องนั่งเล่น',
  ariaLabel: 'ห้องนั่งเล่น แตะพื้นเพื่อเดิน แตะโซฟาเพื่อนั่ง แตะแมวเพื่อลูบ',
  actionsHtml: `
    <button class="btn small" id="btnRest" type="button">นั่งโซฟา</button>
    <button class="btn small" id="btnCat" type="button">ลูบแมว</button>
    <button class="btn small primary" id="nudge" type="button"></button>`,
  movie: true,
  // แถบปุ่มท่าทางมีเฉพาะห้องนั่งเล่น (ห้องอื่นแตะตัวอีกคน = กอด)
  actBar: true,
  musicProp: { x: 330, y: 348, w: 74, h: 67, table: true, walk: { x: 330, y: 372 } },
  catRule: () => true,

  bind({ ctx, el, scene }) {
    el.nudge = el.root.querySelector('#nudge');
    el.root.querySelector('#btnRest').addEventListener('click', () => scene.rest());
    el.root.querySelector('#btnCat').addEventListener('click', () => scene.petCat());
    el.nudge.addEventListener('click', async () => {
      const name = ctx.partnerPresence?.nickname || ctx.partner?.nickname || 'อีกคน';
      if (ctx.partnerPresence && ctx.partnerPresence.page !== 'away') {
        if (ctx.nudge()) {
          el.nudge.disabled = true;
          setTimeout(() => home.update(ctx), 3000);
        }
        return;
      }
      if (sending) return;
      sending = true;
      el.nudge.disabled = true;
      const r = await sendPush('comehome');
      sending = false;
      if (r.result === 'ok') toast(`ส่งแจ้งเตือนถึง ${name} แล้ว`);
      else if (r.result === 'rate') toast(`ส่งได้อีกครั้งในอีก ${Math.ceil(r.retryAfter / 60)} นาที`, 'error');
      else if (r.result === 'dnd') toast(`${name} พักแจ้งเตือนอยู่ชั่วคราว`, 'error');
      else if (r.result === 'no_sub') { ctx.partnerPush = false; toast(`${name} ยังไม่ได้เปิดแจ้งเตือน`, 'error'); }
      else toast(pushFailText(r), 'error');
      home.update(ctx);
    });
  },

  // ปุ่มเรียก: ออนไลน์ = เรียกสด, ออฟไลน์/สลับแอป = ส่งแจ้งเตือน
  refresh({ ctx, el }) {
    const { partner, partnerPresence: pp } = ctx;
    const name = pp?.nickname || partner?.nickname || '';
    if (!partner) {
      el.nudge.textContent = 'เรียก';
      el.nudge.disabled = true;
      el.hint.textContent = '';
    } else if (pp && pp.page !== 'away') {
      el.nudge.textContent = `เรียก ${name}`;
      el.nudge.disabled = false;
      el.hint.textContent = '';
    } else {
      const left = cooldownLeft('comehome');
      el.nudge.textContent = 'กลับบ้านกันเถอะ';
      el.nudge.disabled = sending || left > 0 || ctx.partnerPush === false;
      el.hint.textContent = ctx.partnerPush === false
        ? `${name} ยังไม่ได้เปิดแจ้งเตือนในหน้าตั้งค่า จึงยังส่งให้ไม่ได้`
        : left > 0
          ? `ส่งได้อีกครั้งในอีก ${Math.ceil(left / 60)} นาที`
          : `เครื่องของ${name}จะเด้งแจ้งเตือนให้กลับบ้าน ส่งซ้ำได้ทุก 1 นาที`;
    }
  },
});
