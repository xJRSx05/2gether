import { catSvg } from '../cat.js';
import { esc } from '../ui.js';
import { pick, rand } from './util.js';
import { swipe, stir, dragDrop, ease } from './gestures.js';

const FOODS = [
  { icon: '🐟', name: 'ปลา' }, { icon: '🍗', name: 'ไก่' }, { icon: '🥩', name: 'เนื้อ' },
  { icon: '🦐', name: 'กุ้ง' }, { icon: '🥕', name: 'แครอท' }, { icon: '🥚', name: 'ไข่' },
];
// ขั้นตอนในสูตร: แต่ละขั้นเป็นการกระทำคนละแบบ
const STEP = {
  chop: { label: (f) => `หั่น${f.name}`, tip: 'ปัดลงบนเขียงเหมือนใช้มีด 4 ครั้ง', need: 4 },
  add: { label: (f) => `ใส่${f.name}ลงหม้อ`, tip: 'ลากวัตถุดิบที่ถูกต้องไปวางในหม้อ', need: 1 },
  stir: { label: () => 'คนในหม้อ', tip: 'วนนิ้วในหม้อให้ครบ 2 รอบ', need: 1 },
  shake: { label: () => 'เขย่าเครื่องปรุง', tip: 'ปัดซ้าย-ขวาสลับกัน 6 ครั้ง', need: 6 },
};
const ORDER = [['chop', 'add', 'stir', 'shake'], ['add', 'chop', 'shake', 'stir'], ['chop', 'stir', 'add', 'shake'], ['add', 'stir', 'chop', 'shake']];

// ทำอาหารให้แมว: ทำตามสูตรทีละขั้น สลับกันคนละขั้น แต่ละขั้นใช้ท่าต่างกัน
export const cookCat = {
  id: 'cookcat',
  title: 'ทำอาหารให้แมว',
  desc: 'ทำตามสูตรทีละขั้น สลับกันคนละขั้น: ปัดหั่น ลากใส่หม้อ วนนิ้วคน เขย่าเครื่องปรุง ใน 75 วินาที',
  seconds: 75,
  unit: 'จาน',
  stars: [4, 7, 10],

  create({ el, role, seed, send, catColor, catName, partnerName }) {
    let d = 0; let s = 0; let served = 0; let live = false;
    let prog = 0; let partnerProg = 0; let shown = 0; let lastSent = 0; let raf = 0; let last = 0;
    const food = (dish) => pick(FOODS, seed, dish * 7 + 1);
    const steps = (dish) => ORDER[Math.floor(rand(seed, dish * 13 + 3) * ORDER.length)];
    const owner = (dish, step) => ((dish + step) % 2 === 0 ? 'a' : 'b');
    const mine = () => owner(d, s) === role;

    el.innerHTML = `
      <div class="cg ck">
        <div class="kc-top">
          <div class="cg-cat" id="ckCat">${catSvg(catColor)}<span class="cg-bubble" id="ckSay"></span></div>
          <div><p class="cg-count"><b id="ckN">0</b> จานที่${esc(catName)}กินแล้ว</p><p class="kc-dish" id="ckDish"></p></div>
        </div>
        <ol class="kc-steps" id="ckSteps"></ol>
        <p class="cg-role" id="ckRole"></p>
        <div class="kc-pad" id="ckPad"></div>
        <div class="kc-prog"><i id="ckBar"></i></div>
      </div>`;
    const $ = (id) => el.querySelector(`#${id}`);
    let pad = $('ckPad');

    function cheer() {
      const c = $('ckCat');
      c.classList.remove('eat'); void c.offsetWidth; c.classList.add('eat');
      $('ckSay').textContent = 'อร่อย!';
      setTimeout(() => { const n = $('ckSay'); if (n) n.textContent = ''; }, 900);
    }

    function drawSteps() {
      $('ckN').textContent = String(served);
      $('ckDish').textContent = `จานที่ ${d + 1}: ${food(d).icon} เมนู${food(d).name}`;
      $('ckSteps').innerHTML = steps(d).map((k, i) => {
        const me = owner(d, i) === role;
        return `<li class="${i < s ? 'ok' : i === s ? 'now' : ''}"><span>${STEP[k].label(food(d))}</span><small>${me ? 'คุณ' : esc(partnerName)}</small></li>`;
      }).join('');
    }

    // สร้างแผงท่าทางตามขั้นปัจจุบัน
    function buildPad() {
      prog = 0; partnerProg = 0; shown = 0;
      // เปลี่ยนเป็นแผงใหม่ทุกขั้น ท่าทางของขั้นก่อนจะได้ไม่ติดมา
      const fresh = pad.cloneNode(false);
      pad.replaceWith(fresh);
      pad = fresh;
      const k = steps(d)[s];
      const f = food(d);
      if (!live) { pad.innerHTML = '<p class="kc-wait">รอเริ่ม...</p>'; return; }
      if (!mine()) {
        pad.className = 'kc-pad wait';
        pad.innerHTML = `<p class="kc-wait">ตาของ ${esc(partnerName)}<br><b>${STEP[k].label(f)}</b></p>`;
        $('ckRole').textContent = 'ช่วยเชียร์ไปก่อน ขั้นต่อไปเป็นตาคุณ';
        return;
      }
      $('ckRole').textContent = STEP[k].tip;
      pad.className = `kc-pad ${k}`;
      if (k === 'chop') {
        pad.innerHTML = `<div class="kc-board"><span class="kc-food">${f.icon}</span><span class="kc-knife" aria-hidden="true"></span><span class="kc-cuts" id="ckCuts"></span></div>`;
        swipe(pad, { dir: 'down', min: 34, onSwipe: () => bump(1 / STEP.chop.need, () => { pad.querySelector('.kc-knife')?.classList.remove('cut'); void pad.offsetWidth; pad.querySelector('.kc-knife')?.classList.add('cut'); $('ckCuts').textContent = '/'.repeat(Math.round(prog * STEP.chop.need)); }) });
      } else if (k === 'shake') {
        pad.innerHTML = '<div class="kc-shaker"><span>🧂</span></div>';
        swipe(pad, { dir: 'h', min: 30, onSwipe: (dir) => bump(1 / STEP.shake.need, () => { const x = pad.querySelector('.kc-shaker'); x.style.rotate = dir === 'left' ? '-18deg' : '18deg'; }) });
      } else if (k === 'stir') {
        pad.innerHTML = '<div class="kc-pot"><span class="kc-spoon" id="ckSpoon"></span><span class="kc-soup"></span></div>';
        stir(pad, { turns: 2, onTurn: (p) => { prog = p; $('ckSpoon').style.rotate = `${p * 720}deg`; report(); if (p >= 1) complete(); } });
      } else {
        // ลากของที่ถูกต้อง (1 ใน 3) ลงหม้อ
        const opts = [f, pick(FOODS.filter((x) => x !== f), seed, d * 7 + 2), pick(FOODS.filter((x) => x !== f), seed, d * 7 + 5)];
        const order = [0, 1, 2].sort((x, y) => rand(seed, d * 31 + x) - rand(seed, d * 31 + y));
        pad.innerHTML = `<div class="kc-add"><div class="kc-pot drop" id="ckPot"><span class="kc-soup"></span></div>
          <div class="kc-shelf">${order.map((i) => `<button type="button" class="kc-ing" data-ok="${i === 0}">${opts[i].icon}<small>${opts[i].name}</small></button>`).join('')}</div></div>`;
        pad.querySelectorAll('.kc-ing').forEach((b) => dragDrop(b, {
          drop: '#ckPot',
          onDrop: () => {
            if (b.dataset.ok === 'true') { prog = 1; complete(); } else { b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); }
          },
        }));
      }
    }
    function bump(n, fx) {
      prog = Math.min(1, prog + n);
      fx?.();
      report();
      if (prog >= 1) complete();
    }
    function report(force) {
      const now = performance.now();
      if (force || now - lastSent > 140) { lastSent = now; send({ k: 'prog', p: Math.round(prog * 100) / 100, d, s }); }
    }
    function complete() {
      const a = { k: 'done', d, s };
      send(a);
      apply(a);
    }

    function apply(a) {
      if (a.k === 'prog') { if (a.d === d && a.s === s) partnerProg = a.p; return; }
      if (a.k !== 'done' || a.d !== d || a.s !== s) return;
      s += 1;
      if (s >= 4) { s = 0; d += 1; served += 1; cheer(); }
      drawSteps();
      buildPad();
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      shown = ease(shown, mine() ? prog : partnerProg, dt, 18);
      $('ckBar').style.width = `${shown * 100}%`;
      raf = requestAnimationFrame(frame);
    }

    drawSteps();
    buildPad();
    return {
      onAct: apply,
      start() { live = true; buildPad(); last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { live = false; cancelAnimationFrame(raf); pad.innerHTML = ''; },
      score: () => served,
    };
  },
};
