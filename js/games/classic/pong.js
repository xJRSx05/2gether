import { classic, layout } from './kit.js';

const W = 100;
const H = 150;
const PAD = 22;      // ความกว้างไม้
const GOAL = 5;

// ปิงปอง: เครื่องของคนที่ชวน (a) คำนวณลูกบอลและส่งตำแหน่งให้ b ทุก 50 ms; b ส่งตำแหน่งไม้ของตัวเอง
export const pong = classic({
  id: 'pong',
  title: 'ปิงปอง',
  desc: 'ลากนิ้วเลื่อนไม้ตีลูกกลับ ใครพลาดอีกฝ่ายได้แต้ม ใครได้ 5 แต้มก่อนชนะ (เล่นสดต้องเน็ตดีทั้งคู่)',
  create({ el, role, send, end, partnerName }) {
    const L = layout(el, { board: '<div class="pg-field" id="pgField"><i class="pg-ball" id="pgBall"></i><i class="pg-pad top" id="pgTop"></i><i class="pg-pad bot" id="pgBot"></i></div><p class="cl-score" id="pgScore"></p>' });
    const field = el.querySelector('#pgField');
    const $ball = el.querySelector('#pgBall');
    const $top = el.querySelector('#pgTop');
    const $bot = el.querySelector('#pgBot');
    let myX = 50;       // ไม้ของเรา (ล่างจอ) 0-100
    let oppX = 50;      // ไม้ของอีกฝั่ง (บนจอ)
    let ball = { x: 50, y: 75 };
    let vel = { x: 0, y: 0 };
    let score = { me: 0, op: 0 };
    let live = false;
    let over = false;
    let raf = 0;
    let last = 0;
    let lastSend = 0;
    let serving = 0;
    // พิกัดจริง (ฝั่ง a): a ล่าง b บน; ฝั่ง b แสดงกลับด้าน

    // ฝั่งที่รับข้อมูลทางเน็ต: เกลี่ยการเคลื่อนไหวให้ลื่น (ทำนายลูกจากความเร็ว + ค่อยๆ ไล่ตาม)
    let oppShow = oppX;
    let ballShow = { ...ball };
    let net = null; // { x, y, vx, vy, at }
    function smooth(dt) {
      const k = 1 - Math.exp(-dt * 16);
      oppShow += (oppX - oppShow) * k;
      if (role === 'b' && net) {
        const age = Math.min(0.15, (performance.now() - net.at) / 1000);
        const px = net.x + net.vx * age;
        const py = net.y + net.vy * age;
        const far = Math.abs(px - ballShow.x) > 18 || Math.abs(py - ballShow.y) > 18;
        ballShow = far ? { x: px, y: py } : { x: ballShow.x + (px - ballShow.x) * k * 1.6, y: ballShow.y + (py - ballShow.y) * k * 1.6 };
      } else ballShow = ball;
    }
    function render() {
      $bot.style.left = `${myX}%`;
      $top.style.left = `${oppShow}%`;
      $ball.style.left = `${ballShow.x}%`;
      $ball.style.top = `${(ballShow.y / H) * 100}%`;
      el.querySelector('#pgScore').textContent = `คุณ ${score.me} · ${partnerName} ${score.op}`;
      L.status(over ? '' : serving > 0 ? 'เตรียมตัว...' : 'ลากนิ้วเพื่อเลื่อนไม้');
    }
    function serve(dir) {
      ball = { x: 50, y: H / 2 };
      const ang = (Math.random() - 0.5) * 0.9;
      vel = { x: Math.sin(ang) * 55, y: dir * Math.cos(ang) * 55 };
      serving = 1;
      setTimeout(() => { serving = 0; }, 900);
    }

    function stepHost(dt) {
      if (serving > 0) return;
      ball.x += vel.x * dt;
      ball.y += vel.y * dt;
      if (ball.x < 2) { ball.x = 2; vel.x = Math.abs(vel.x); }
      if (ball.x > W - 2) { ball.x = W - 2; vel.x = -Math.abs(vel.x); }
      // ในพิกัดจริง ไม้ a อยู่ y=H-6 ไม้ b อยู่ y=6; myX เป็นของ a, oppX เป็นของ b
      if (vel.y > 0 && ball.y >= H - 8 && ball.y <= H - 3 && Math.abs(ball.x - myX) <= PAD / 2 + 2) {
        vel.y = -Math.abs(vel.y) * 1.06; vel.x += (ball.x - myX) * 2.2; ball.y = H - 8;
      } else if (vel.y < 0 && ball.y <= 8 && ball.y >= 3 && Math.abs(ball.x - oppX) <= PAD / 2 + 2) {
        vel.y = Math.abs(vel.y) * 1.06; vel.x += (ball.x - oppX) * 2.2; ball.y = 8;
      }
      const cap = 130;
      vel.y = Math.max(-cap, Math.min(cap, vel.y));
      vel.x = Math.max(-cap, Math.min(cap, vel.x));
      if (ball.y > H + 2) { score.op += 1; point(false); }
      else if (ball.y < -2) { score.me += 1; point(true); }
    }
    function point(aWon) {
      send({ k: 'pt', sa: score.me, sb: score.op });
      if (score.me >= GOAL || score.op >= GOAL) {
        over = true; live = false; cancelAnimationFrame(raf); render();
        end({ winner: score.me > score.op ? 'a' : 'b' });
        return;
      }
      serve(aWon ? -1 : 1);
    }

    function frame(now) {
      if (!live) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (role === 'a') {
        stepHost(dt);
        if (now - lastSend > 50) { lastSend = now; send({ k: 's', x: ball.x, y: ball.y, vx: serving > 0 ? 0 : vel.x, vy: serving > 0 ? 0 : vel.y, p: myX }); }
      } else if (now - lastSend > 50) { lastSend = now; send({ k: 'p', x: myX }); }
      smooth(dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function apply(a) {
      if (role === 'a' && a.k === 'p') oppX = 100 - a.x;       // b ส่งในมุมมองของเขา (กลับด้าน)
      if (role === 'b' && a.k === 's') {
        ball = { x: 100 - a.x, y: H - a.y };
        net = { x: ball.x, y: ball.y, vx: -(a.vx || 0), vy: -(a.vy || 0), at: performance.now() };
        oppX = 100 - a.p;
      }
      if (role === 'b' && a.k === 'pt') score = { me: a.sb, op: a.sa };
    }

    const move = (ev) => {
      const r = field.getBoundingClientRect();
      myX = Math.max(PAD / 2, Math.min(100 - PAD / 2, ((ev.clientX - r.left) / r.width) * 100));
    };
    field.addEventListener('pointerdown', (ev) => { field.setPointerCapture?.(ev.pointerId); move(ev); });
    field.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'touch') move(ev); });

    render();
    return {
      onAct: apply,
      start() {
        live = true;
        last = performance.now();
        if (role === 'a') { score = { me: 0, op: 0 }; serve(Math.random() < 0.5 ? 1 : -1); }
        raf = requestAnimationFrame(frame);
      },
    };
  },
});
