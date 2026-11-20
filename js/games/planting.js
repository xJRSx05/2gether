import { rand } from './util.js';
import { pickSpecies, speciesInfo } from '../collection.js';
import { swipe, dragDrop, hold, ease } from './gestures.js';

const HOLES = 6;
const DIG = 2;            // ปัดลงกี่ครั้งถึงขุดเสร็จ
const WZONE = [70, 90];   // ระดับน้ำที่พอดี
const GROW = 4;           // วินาทีที่ใช้โต
const PEST_S = 3;         // ต้องไล่แมลงภายในกี่วินาที

// ปลูกดอกไม้: a ปัดขุดหลุม, b ลากเมล็ดลงหลุมแล้วกดค้างรดน้ำให้พอดี ระหว่างโตมีแมลงมา ใครก็ปัดไล่ได้
export const planting = {
  id: 'plant',
  kind: 'flower',
  title: 'ปลูกดอกไม้',
  desc: 'คนหนึ่งปัดขุดหลุม อีกคนลากเมล็ดลงหลุมแล้วกดค้างรดน้ำให้พอดี ระหว่างโตมีแมลงมากวน ช่วยกันปัดไล่ 60 วินาที',
  seconds: 60,
  unit: 'แปลง',
  collectAt: 'สวน',
  stars: [5, 8, 11],

  create({ el, role, seed, send, partnerName }) {
    const holes = Array.from({ length: HOLES }, () => ({ st: 'empty', n: -1, dig: 0, w: 0, shownW: 0, t: 0, pest: false, pestT: 0, pestDone: false }));
    const bloomed = [];
    let next = 0;          // เลขลำดับต้นไม้ถัดไป
    let watering = -1;
    let live = false; let raf = 0; let last = 0; let lastSent = 0;

    el.innerHTML = `
      <div class="cg pl">
        <p class="cg-count"><b id="plN">0</b> แปลงที่บานแล้ว</p>
        <p class="cg-role" id="plRole">${role === 'a' ? 'ปัดลงที่ดินเพื่อขุดหลุม (2 ครั้ง)' : `ลากเมล็ดลงหลุมที่ ${partnerName} ขุด แล้วกดค้างรดน้ำ ปล่อยตอนน้ำอยู่ในแถบเขียว`}</p>
        <div class="pl-bed" id="plBed">${holes.map((_, i) => `
          <div class="pl-hole" data-h="${i}" data-st="empty">
            <span class="pl-soil"></span><span class="pl-plant"></span>
            <span class="pl-water"><i class="zone" style="bottom:${WZONE[0]}%;height:${WZONE[1] - WZONE[0]}%"></i><i class="lvl"></i></span>
            <span class="pl-pest" aria-hidden="true">🐛</span>
          </div>`).join('')}</div>
        ${role === 'b' ? '<div class="pl-tools"><button type="button" class="kc-ing pl-seed" id="plSeed">🌰<small>ลากเมล็ด</small></button><span class="pl-can" aria-hidden="true">🚿<small>กดค้างที่หลุม</small></span></div>' : '<p class="pl-tip">เห็นแมลง 🐛 ปัดไล่ด้วยนะ</p>'}
      </div>`;
    const $ = (id) => el.querySelector(`#${id}`);
    const nodes = [...el.querySelectorAll('.pl-hole')];

    function paint(i) {
      const h = holes[i]; const n = nodes[i];
      n.dataset.st = h.st;
      n.classList.toggle('pest', h.pest);
      n.style.setProperty('--dig', String(h.dig / DIG));
      const p = n.querySelector('.pl-plant');
      p.textContent = h.st === 'bloom' ? (speciesInfo('flower', pickSpecies('flower', seed, h.n))?.icon || '🌸') : h.st === 'grow' ? '🌱' : h.st === 'seed' ? '🌰' : '';
    }
    const count = () => { $('plN').textContent = String(bloomed.length); };

    function apply(a) {
      const h = holes[a.h];
      if (!h) return;
      if (a.k === 'dig' && (h.st === 'empty' || h.st === 'bloom')) { Object.assign(h, { st: 'dug', n: a.n, dig: DIG, w: 0, pest: false, pestDone: false }); next = Math.max(next, a.n + 1); }
      else if (a.k === 'seed' && h.st === 'dug' && h.n === a.n) h.st = 'seed';
      else if (a.k === 'wl' && h.n === a.n) { h.w = a.w; return; }
      else if (a.k === 'water' && h.st === 'seed' && h.n === a.n) { h.st = 'grow'; h.t = performance.now(); h.w = 0; }
      else if (a.k === 'flood' && h.n === a.n && h.st === 'seed') { Object.assign(h, { st: 'empty', dig: 0, w: 0 }); flash(a.h, 'น้ำล้น!'); }
      else if (a.k === 'pest' && h.st === 'grow' && h.n === a.n) { h.pest = true; h.pestT = performance.now(); h.pestDone = true; }
      else if (a.k === 'shoo' && h.n === a.n) h.pest = false;
      else if (a.k === 'wilt' && h.n === a.n && h.st === 'grow') { Object.assign(h, { st: 'empty', dig: 0, pest: false }); flash(a.h, 'เหี่ยวแล้ว'); }
      else if (a.k === 'bloom' && h.n === a.n && h.st === 'grow') {
        h.st = 'bloom'; h.pest = false;
        if (!bloomed.includes(h.n)) bloomed.push(h.n);
        count();
        const n0 = h.n;
        setTimeout(() => { if (h.st === 'bloom' && h.n === n0) { Object.assign(h, { st: 'empty', dig: 0 }); paint(a.h); } }, 1600);
      } else return;
      paint(a.h);
    }
    const act = (a) => { send(a); apply(a); };
    function flash(i, t) {
      const b = document.createElement('b'); b.className = 'pl-flash'; b.textContent = t;
      nodes[i].appendChild(b); setTimeout(() => b.remove(), 900);
    }

    nodes.forEach((node, i) => {
      // ปัดบนหลุม: ไล่แมลงก่อน ถ้าไม่มีแมลงและเป็นคนขุดก็ขุด
      swipe(node, { dir: 'any', min: 30, onSwipe: (dir) => {
        if (!live) return;
        const h = holes[i];
        if (h.pest) { act({ k: 'shoo', h: i, n: h.n }); return; }
        if (role === 'a' && (h.st === 'empty' || h.st === 'bloom') && dir === 'any') {
          h.dig += 1;
          node.classList.remove('dug-fx'); void node.offsetWidth; node.classList.add('dug-fx');
          if (h.dig >= DIG) act({ k: 'dig', h: i, n: next }); else paint(i);
        }
      } });
      if (role === 'b') {
        hold(node, (on) => {
          if (!live) return;
          const h = holes[i];
          if (on && h.st === 'seed') { watering = i; node.classList.add('watering'); return; }
          if (!on && watering === i) {
            watering = -1; node.classList.remove('watering');
            if (h.st !== 'seed') return;
            if (h.w >= WZONE[0] && h.w <= WZONE[1]) act({ k: 'water', h: i, n: h.n });
            else send({ k: 'wl', h: i, n: h.n, w: Math.round(h.w) });
          }
        });
      }
    });
    if (role === 'b') {
      dragDrop($('plSeed'), { drop: '.pl-hole[data-st="dug"]', onDrop: (t) => {
        if (!live) return;
        const i = Number(t.dataset.h);
        act({ k: 'seed', h: i, n: holes[i].n });
      } });
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (live) {
        if (watering >= 0) {
          const h = holes[watering];
          h.w += 38 * dt;
          if (h.w > 100) { const i = watering; watering = -1; nodes[i].classList.remove('watering'); act({ k: 'flood', h: i, n: h.n }); }
          else if (now - lastSent > 120) { lastSent = now; send({ k: 'wl', h: watering, n: h.n, w: Math.round(h.w) }); }
        }
        // คนที่ชวนเป็นผู้คุมเวลา: แมลงมา, เหี่ยว, บาน
        if (role === 'a') {
          holes.forEach((h, i) => {
            if (h.st !== 'grow') return;
            const age = (now - h.t) / 1000;
            const r = rand(seed, h.n * 3 + 1);
            const pestAt = r < 0.65 ? 0.7 + r * 2 : Infinity;
            if (!h.pest && !h.pestDone && age > pestAt) act({ k: 'pest', h: i, n: h.n });
            else if (h.pest && (now - h.pestT) / 1000 > PEST_S) act({ k: 'wilt', h: i, n: h.n });
            else if (!h.pest && age >= GROW) act({ k: 'bloom', h: i, n: h.n });
          });
        }
      }
      holes.forEach((h, i) => {
        h.shownW = watering === i ? h.w : ease(h.shownW, h.st === 'seed' ? h.w : 0, dt, 12);
        const lv = nodes[i].querySelector('.lvl');
        lv.style.height = `${Math.min(100, h.shownW)}%`;
        lv.classList.toggle('good', h.shownW >= WZONE[0] && h.shownW <= WZONE[1]);
      });
      raf = requestAnimationFrame(frame);
    }

    nodes.forEach((_, i) => paint(i));
    return {
      onAct: apply,
      start() { live = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { live = false; watering = -1; cancelAnimationFrame(raf); },
      score: () => bloomed.length,
      items: () => bloomed.map((n) => pickSpecies('flower', seed, n)),
    };
  },
};
