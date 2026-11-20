import { toast } from './ui.js';
import { createRoomView } from './room-view.js';
import { BEDROOM } from './rooms.js';
import { cooldownLeft, sendPush, pushFailText } from './push.js';

let sending = false;

// ห้องนอน: ราตรีสวัสดิ์ (ขึ้นเตียง ไฟหรี่) สวัสดีตอนเช้า (ลุก) ปลุกเขา ชวนเข้านอน
// แมวมาอยู่ที่นี่เฉพาะตอนที่อีกคนอยู่ห้องนอนด้วย
export const bedroom = createRoomView({
  route: 'bedroom',
  room: BEDROOM,
  label: 'ห้องนอน',
  ariaLabel: 'ห้องนอน แตะพื้นเพื่อเดิน แตะเตียงเพื่อนอน',
  actionsHtml: `
    <div class="mn-cards">
      <section class="mn-card morning" aria-labelledby="mnMorning">
        <div class="mn-art" aria-hidden="true"><span class="sun"></span><span class="cloud c1"></span><span class="cloud c2"></span></div>
        <h2 id="mnMorning">Good Morning <span aria-hidden="true">☀</span></h2>
        <div class="mn-btns">
          <button class="btn small primary" id="btnMorning" type="button">สวัสดีตอนเช้า</button>
          <button class="btn small" id="btnWake" type="button"></button>
        </div>
      </section>
      <section class="mn-card night" aria-labelledby="mnNight">
        <div class="mn-art" aria-hidden="true"><span class="moon"></span><i></i><i></i><i></i><i></i><i></i></div>
        <h2 id="mnNight">Good Night <span aria-hidden="true">☾</span></h2>
        <div class="mn-btns">
          <button class="btn small primary" id="btnNight" type="button">ราตรีสวัสดิ์</button>
          <button class="btn small" id="btnInvite" type="button"></button>
        </div>
      </section>
    </div>`,
  musicProp: { x: 418, y: 300, w: 46, h: 17, table: false, walk: { x: 418, y: 368 } },
  catRule: (ctx) => ctx.partnerPresence?.page === 'bedroom',

  bind({ ctx, el, scene }) {
    el.btnWake = el.root.querySelector('#btnWake');
    el.btnInvite = el.root.querySelector('#btnInvite');

    el.root.querySelector('#btnNight').addEventListener('click', async () => {
      scene.rest();
      const awarded = await ctx.awardDaily('night');
      toast(awarded ? 'ราตรีสวัสดิ์ Bond +2' : 'ราตรีสวัสดิ์');
    });
    el.root.querySelector('#btnMorning').addEventListener('click', async () => {
      if (scene.isResting()) scene.stand();
      const awarded = await ctx.awardDaily('morning');
      toast(awarded ? 'สวัสดีตอนเช้า Bond +2' : 'สวัสดีตอนเช้า');
    });

    const ring = async (kind) => {
      const pp = ctx.partnerPresence;
      const name = pp?.nickname || ctx.partner?.nickname || 'อีกคน';
      if (!ctx.partner) return;
      // ออนไลน์อยู่ = เด้งข้อความสดในเว็บของเขา ไม่งั้นส่งแจ้งเตือนเข้าเครื่อง
      if (pp && pp.page !== 'away') {
        ctx.send(kind === 'wake' ? 'wake' : 'sleepinvite', { from: ctx.me.nickname });
        toast(kind === 'wake' ? `ปลุก ${name} แล้ว` : `ชวน ${name} เข้านอนแล้ว`);
        return;
      }
      const left = cooldownLeft(kind);
      if (left > 0) { toast(`ส่งได้อีกครั้งในอีก ${Math.ceil(left / 60)} นาที`, 'error'); return; }
      if (sending) return;
      sending = true;
      const r = await sendPush(kind);
      sending = false;
      if (r.result === 'ok') toast(kind === 'wake' ? `ปลุก ${name} แล้ว` : `ชวน ${name} เข้านอนแล้ว`);
      else if (r.result === 'rate') toast(`ส่งได้อีกครั้งในอีก ${Math.ceil(r.retryAfter / 60)} นาที`, 'error');
      else if (r.result === 'dnd') toast(`${name} พักแจ้งเตือนอยู่ชั่วคราว`, 'error');
      else if (r.result === 'no_sub') { ctx.partnerPush = false; toast(`${name} ยังไม่ได้เปิดแจ้งเตือน`, 'error'); }
      else toast(pushFailText(r), 'error');
      bedroom.update(ctx);
    };
    el.btnWake.addEventListener('click', () => ring('wake'));
    el.btnInvite.addEventListener('click', () => ring('sleep'));
  },

  refresh({ ctx, el }) {
    const name = ctx.partnerPresence?.nickname || ctx.partner?.nickname;
    el.btnWake.textContent = name ? `ปลุก ${name}` : 'ปลุกเขา';
    el.btnInvite.textContent = name ? `ชวน ${name} เข้านอน` : 'ชวนเข้านอน';
    el.btnWake.disabled = !ctx.partner;
    el.btnInvite.disabled = !ctx.partner;
    const offline = !ctx.partnerPresence || ctx.partnerPresence.page === 'away';
    el.hint.textContent = ctx.partner && offline && ctx.partnerPush === false
      ? `${name} ยังไม่ได้เปิดแจ้งเตือนในหน้าตั้งค่า ปุ่มปลุกและชวนจึงส่งถึงเขาไม่ได้ตอนเขาไม่ได้เปิดเว็บ`
      : 'ราตรีสวัสดิ์และสวัสดีตอนเช้าได้ Bond +2 คนละ 1 ครั้งต่อวัน';
  },
});
