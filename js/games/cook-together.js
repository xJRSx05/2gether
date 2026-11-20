import { catSvg } from '../cat.js';
import { esc } from '../ui.js';
import { rand } from './util.js';
import { swipe, dragDrop, hold, ease } from './gestures.js';

const PANTRY = [
  { icon: '🍚', name: 'ข้าว' }, { icon: '🥚', name: 'ไข่' }, { icon: '🧅', name: 'หอม' },
  { icon: '🌶️', name: 'พริก' }, { icon: '🥬', name: 'ผัก' }, { icon: '🍤', name: 'กุ้ง' },
  { icon: '🍄', name: 'เห็ด' }, { icon: '🧄', name: 'กระเทียม' },
];
const DISHES = ['ข้าวผัด', 'ผัดกะเพรา', 'ไข่เจียว', 'ผัดผัก', 'ผัดพริกกุ้ง', 'ผัดเห็ด'];
const ZONE = [55, 80];      // ความร้อนที่พอดี
const COOK_NEED = 2.4;      // ต้องอยู่ในโซนรวมกี่วินาที
const BURN_AT = 92;         // ร้อนเกินเท่านี้นานเกินไปจะไหม้
const BURN_S = 0.8;
const QUEUE = 2;

// ทำอาหารด้วยกัน: คนที่ชวน (a) ลากวัตถุดิบตามใบสั่งลงชาม อีกคน (b) กดค้างคุมไฟให้อยู่โซนเขียวแล้วปัดขึ้นพลิก
export const cookTogether = {
  id: 'cooktog',
  title: 'ทำอาหารด้วยกัน',
  desc: 'คนหนึ่งลากวัตถุดิบตามใบสั่งลงชาม อีกคนกดค้างคุมไฟให้อยู่โซนเขียวแล้วปัดขึ้นพลิกกระทะ 90 วินาที',
  seconds: 90,
  unit: 'จาน',
  stars: [4, 7, 10],

  create({ el, role, seed, send, catColor, partnerName }) {
    let prepped = 0;   // จำนวนจานที่เตรียมเสร็จ (a เป็นเจ้าของค่า)
    let cooking = 0;   // จานที่กำลังผัดอยู่ (b เป็นเจ้าของค่า)
    let served = 0;
    let pick = 0;      // a: หยิบวัตถุดิบถูกไปกี่อย่างของจานปัจจุบัน
    let heat = 0; let cooked = 0; let over = 0; let heating = false; let ready = false;
    let shownHeat = 0; let shownCook = 0; let netHeat = 0; let netCook = 0;
    let live = false; let raf = 0; let last = 0; let lastSent = 0;

    const order = (d) => {
      const idx = [...PANTRY.keys()].sort((x, y) => rand(seed, d * 17 + x) - rand(seed, d * 17 + y));
      return { name: DISHES[Math.floor(rand(seed, d * 5 + 2) * DISHES.length)], need: idx.slice(0, 3), shelf: idx.slice(0, 6).sort((x, y) => rand(seed, d * 23 + x) - rand(seed, d * 23 + y)) };
    };

    el.innerHTML = `
      <div class="cg ct">
        <div class="kc-top">
          <div class="cg-cat" id="ctCat">${catSvg(catColor)}<span class="cg-bubble" id="ctSay"></span></div>
          <div><p class="cg-count"><b id="ctN">0</b> จานเสร็จแล้ว</p><p class="kc-dish" id="ctQ"></p></div>
        </div>
        <p class="cg-role" id="ctRole"></p>
        <div class="ct-stage" id="ctStage"></div>
      </div>`;
    const $ = (id) => el.querySelector(`#${id}`);
    const stage = $('ctStage');

    function say(t) {
      $('ctSay').textContent = t;
      setTimeout(() => { const n = $('ctSay'); if (n && n.textContent === t) n.textContent = ''; }, 1000);
    }

    function head() {
      $('ctN').textContent = String(served);
      $('ctQ').textContent = `จานรอผัด ${Math.max(0, prepped - cooking)} / ${QUEUE}`;
    }

    // ฝั่ง a: ใบสั่ง + ชั้นวาง + ชาม
    function buildPrep() {
      const d = prepped;
      const o = order(d);
      if (prepped - cooking >= QUEUE) {
        stage.innerHTML = `<p class="kc-wait">ชามเต็มแล้ว รอ ${esc(partnerName)} ผัดก่อน</p>`;
        $('ctRole').textContent = 'เตรียมได้ล่วงหน้า 2 จาน';
        return;
      }
      $('ctRole').textContent = 'ลากวัตถุดิบตามลำดับในใบสั่งลงชาม';
      stage.innerHTML = `
        <div class="ct-ticket"><b>${o.name}</b>${o.need.map((i, k) => `<span class="${k < pick ? 'ok' : k === pick ? 'now' : ''}">${PANTRY[i].icon}<small>${PANTRY[i].name}</small></span>`).join('')}</div>
        <div class="ct-bowl drop" id="ctBowl">${o.need.slice(0, pick).map((i) => `<i>${PANTRY[i].icon}</i>`).join('')}</div>
        <div class="kc-shelf six">${o.shelf.map((i) => `<button type="button" class="kc-ing" data-i="${i}">${PANTRY[i].icon}<small>${PANTRY[i].name}</small></button>`).join('')}</div>`;
      stage.querySelectorAll('.kc-ing').forEach((b) => dragDrop(b, {
        drop: '#ctBowl',
        onDrop: () => {
          if (!live) return;
          if (Number(b.dataset.i) === o.need[pick]) {
            pick += 1;
            if (pick >= 3) { pick = 0; const a = { k: 'prep', d }; send(a); apply(a); } else buildPrep();
          } else { b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); }
        },
      }));
    }

    // ฝั่ง b: กระทะ + เกจไฟ
    function buildFry() {
      heat = 0; cooked = 0; over = 0; ready = false; heating = false;
      if (cooking >= prepped) {
        stage.innerHTML = `<div class="ct-pan idle"><span class="ct-wok"></span></div><p class="kc-wait">รอ ${esc(partnerName)} เตรียมวัตถุดิบ...</p>`;
        $('ctRole').textContent = 'คุณเป็นคนผัด';
        return;
      }
      const o = order(cooking);
      $('ctRole').textContent = 'กดค้างที่เตาให้ไฟอยู่โซนเขียว พอสุกแล้วปัดขึ้นเพื่อพลิก';
      stage.innerHTML = `
        <div class="ct-pan" id="ctPan"><span class="ct-wok">${o.need.map((i) => `<i>${PANTRY[i].icon}</i>`).join('')}</span><span class="ct-fire" id="ctFire"></span><b class="ct-flip" id="ctFlip">ปัดขึ้นเพื่อพลิก!</b></div>
        ${gauges()}`;
      const pan = $('ctPan');
      hold(pan, (on) => { heating = on && live && !ready; });
      swipe(pan, { dir: 'up', min: 40, onSwipe: () => {
        if (!ready || !live) return;
        pan.classList.add('flip');
        const a = { k: 'done', d: cooking };
        setTimeout(() => { send(a); apply(a); }, 380);
        ready = false;
      } });
    }
    const gauges = () => `
      <div class="meter heat" aria-hidden="true"><i class="zone" style="left:${ZONE[0]}%;width:${ZONE[1] - ZONE[0]}%"></i><i class="danger" style="left:${BURN_AT}%"></i><i class="needle" id="ctHeat"></i></div>
      <div class="kc-prog"><i id="ctCook"></i></div>`;

    function buildWatch() {
      // a ดูความร้อนจากฝั่ง b แบบลื่น (ไว้ใต้ชามของตัวเอง)
      if (!$('ctHeat')) stage.insertAdjacentHTML('beforeend', `<p class="ct-mini">กระทะของ ${esc(partnerName)}</p>${gauges()}`);
    }

    function build() {
      head();
      if (!live) { stage.innerHTML = '<p class="kc-wait">รอเริ่ม...</p>'; return; }
      if (role === 'a') { buildPrep(); buildWatch(); } else buildFry();
    }

    function apply(a) {
      if (a.k === 'prep' && a.d === prepped) {
        prepped += 1;
        if (role === 'b' && !$('ctPan')) buildFry();
        else if (role === 'a') { buildPrep(); buildWatch(); }
        head();
      } else if (a.k === 'heat') { netHeat = a.h; netCook = a.c; }
      else if ((a.k === 'done' || a.k === 'burn') && a.d === cooking) {
        cooking += 1;
        if (a.k === 'done') { served += 1; say('น่ากิน!'); } else say('ไหม้แล้ว!');
        netHeat = 0; netCook = 0;
        if (role === 'b') buildFry();
        else if (prepped - cooking === QUEUE - 1 && $('ctBowl') === null) { buildPrep(); buildWatch(); }
        head();
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (role === 'b' && live && $('ctPan') && !ready) {
        heat = Math.max(0, Math.min(100, heat + (heating ? 46 : -30) * dt));
        if (heat >= ZONE[0] && heat <= ZONE[1]) cooked = Math.min(1, cooked + dt / COOK_NEED);
        over = heat > BURN_AT ? over + dt : Math.max(0, over - dt);
        $('ctFire').style.opacity = String(0.25 + heat / 130);
        if (over > BURN_S) { const a = { k: 'burn', d: cooking }; send(a); apply(a); }
        else if (cooked >= 1) { ready = true; heating = false; $('ctPan')?.classList.add('ready'); }
        if (now - lastSent > 120) { lastSent = now; send({ k: 'heat', h: Math.round(heat), c: Math.round(cooked * 100) / 100 }); }
      }
      const th = role === 'b' ? heat : netHeat;
      const tc = role === 'b' ? cooked : netCook;
      shownHeat = role === 'b' ? th : ease(shownHeat, th, dt, 12);
      shownCook = ease(shownCook, tc, dt, 12);
      const h = $('ctHeat'); if (h) { h.style.left = `${shownHeat}%`; h.classList.toggle('hot', shownHeat > BURN_AT); }
      const c = $('ctCook'); if (c) c.style.width = `${shownCook * 100}%`;
      raf = requestAnimationFrame(frame);
    }

    build();
    return {
      onAct: apply,
      start() { live = true; build(); last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { live = false; heating = false; cancelAnimationFrame(raf); },
      score: () => served,
    };
  },
};
