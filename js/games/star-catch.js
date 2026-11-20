import { rand } from './util.js';
import { pickSpecies } from '../collection.js';
import { ease } from './gestures.js';

const GAP = 1.1;      // ดาวตกทุกกี่วินาที
const FALL = 4.2;     // ใช้เวลาตกกี่วินาที
const BASKET_R = 13;  // ครึ่งความกว้างตะกร้า (เปอร์เซ็นต์)

// เก็บดาว: ดาวตกจากฟ้า คนที่ชวน (a) เลื่อนตะกร้ารับ อีกคน (b) กดเสกลมซ้าย/ขวาให้ดาวเอียงเข้าตะกร้า
// ดาวทอง = 2 แต้ม (ตกเร็ว), อุกกาบาต = ลบ 1 แต้ม ต้องหลบ
const typeOf = (seed, j) => { const r = rand(seed, j * 5 + 9); return j < 3 ? 'star' : r < 0.14 ? 'gold' : r < 0.32 ? 'rock' : 'star'; };
const FALL_OF = { star: FALL, gold: 2.8, rock: 3.3 };
const ICON = { star: '⭐', gold: '🌟', rock: '☄️' };
const PTS = { star: 1, gold: 2, rock: -1 };
export const starCatch = {
  id: 'starcatch',
  kind: 'star',
  night: true,
  title: 'เก็บดาว',
  desc: 'ดาวตกจากฟ้า คนหนึ่งเลื่อนตะกร้ารับ อีกคนกดเสกลมให้ดาวเอียงเข้าตะกร้า ดาวทองได้ 2 แต้ม ระวังอุกกาบาต 60 วินาที',
  seconds: 60,
  unit: 'ดวง',
  collectAt: 'ท้องฟ้าดูดาวในสวน',
  stars: [12, 20, 28],

  create({ el, role, seed, send, partnerName }) {
    const caught = [];
    const gone = new Set();
    const dx = {};      // ลมที่สะสมต่อดาวแต่ละดวง
    const nodes = {};
    let wind = 0;
    let basket = 50;
    let netBasket = 50;
    let points = 0;
    let t0 = 0;
    let last = 0;
    let raf = 0;
    let live = false;
    let lastMove = 0;
    const total = Math.floor(60 / GAP);

    el.innerHTML = `
      <div class="cg">
        <p class="cg-count"><b id="scN">0</b> แต้ม <small class="sc-legend">⭐ 1 · 🌟 2 · ☄️ −1</small></p>
        <p class="cg-role">${role === 'a' ? 'ลากนิ้วบนท้องฟ้าเพื่อเลื่อนตะกร้า' : `${partnerName} เลื่อนตะกร้า คุณกดเสกลมให้ดาวเอียง`}</p>
        <div class="sc-field" id="scField"><i class="sc-basket" id="scBasket"></i></div>
        ${role === 'b' ? `<div class="sc-wind"><button class="cg-big" data-w="-1" type="button">ลมซ้าย ⬅️</button><button class="cg-big" data-w="1" type="button">ลมขวา ➡️</button></div>` : ''}
      </div>`;
    const field = el.querySelector('#scField');
    const bk = el.querySelector('#scBasket');
    const $n = el.querySelector('#scN');
    const place = () => { bk.style.left = `${basket}%`; };
    const pop = (txt, ty) => {
      const b = document.createElement('b'); b.className = `sc-pop ${ty}`; b.textContent = txt;
      b.style.left = `${basket}%`; field.appendChild(b); setTimeout(() => b.remove(), 800);
    };
    place();

    const at = (j) => 0.8 + j * GAP;
    const x0 = (j) => 10 + 80 * rand(seed, j);

    function apply(a) {
      if (a.k === 'move' && role === 'b') netBasket = a.x;
      else if (a.k === 'wind') wind = a.w;
      else if (a.k === 'got' && !gone.has(a.j)) {
        gone.add(a.j);
        const ty = typeOf(seed, a.j);
        points = Math.max(0, points + PTS[ty]);
        if (ty !== 'rock') caught.push(a.j);
        const n = nodes[a.j]; delete nodes[a.j];
        if (n) { n.classList.add(ty === 'rock' ? 'boom' : 'got'); setTimeout(() => n.remove(), 420); }
        bk.classList.remove('shake', 'glow'); void bk.offsetWidth; bk.classList.add(ty === 'rock' ? 'shake' : 'glow');
        if (ty !== 'star') pop(ty === 'rock' ? '-1' : '+2', ty);
        $n.textContent = String(points);
      }
    }

    if (role === 'a') {
      const move = (ev) => {
        const r = field.getBoundingClientRect();
        basket = Math.max(BASKET_R, Math.min(100 - BASKET_R, ((ev.clientX - r.left) / r.width) * 100));
        place();
        const now = performance.now();
        if (live && now - lastMove > 70) { lastMove = now; send({ k: 'move', x: Math.round(basket) }); }
      };
      field.addEventListener('pointerdown', (ev) => { field.setPointerCapture?.(ev.pointerId); move(ev); });
      field.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'touch') move(ev); });
    } else {
      el.querySelectorAll('[data-w]').forEach((b) => {
        const set = (w) => { if (!live || wind === w) return; wind = w; send({ k: 'wind', w }); };
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); set(Number(b.dataset.w)); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((e) => b.addEventListener(e, () => set(0)));
      });
    }

    function frame(now) {
      if (!live) return;
      const t = (now - t0) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (role === 'b') { basket = ease(basket, netBasket, dt, 16); place(); }
      for (let j = 0; j < total; j += 1) {
        if (gone.has(j)) continue;
        const age = t - at(j);
        if (age < 0) continue;
        const ty = typeOf(seed, j);
        const fall = FALL_OF[ty];
        if (age > fall) {
          gone.add(j);
          nodes[j]?.remove(); delete nodes[j];
          continue;
        }
        dx[j] = Math.max(-30, Math.min(30, (dx[j] || 0) + wind * 16 * dt));
        const x = x0(j) + dx[j];
        const y = (age / fall) * 100;
        let n = nodes[j];
        if (!n) { n = document.createElement('span'); n.className = `sc-star ${ty}`; n.textContent = ICON[ty]; field.appendChild(n); nodes[j] = n; }
        n.style.left = `${x}%`;
        n.style.top = `${y}%`;
        // คนที่ถือตะกร้าเป็นผู้ตัดสินว่ารับได้
        if (role === 'a' && y >= 86 && y <= 100 && Math.abs(x - basket) < BASKET_R) {
          const m = { k: 'got', j };
          send(m);
          apply(m);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    return {
      onAct: apply,
      start() { live = true; t0 = performance.now(); last = t0; raf = requestAnimationFrame(frame); },
      stop() { live = false; wind = 0; cancelAnimationFrame(raf); },
      score: () => points,
      items: () => caught.map((j) => pickSpecies('star', seed, j)),
    };
  },
};
