import { rand } from './util.js';
import { pickSpecies, speciesInfo } from '../collection.js';
import { hold, ease } from './gestures.js';

const HOOK_MS = 1300;
const ZONE = [40, 70];    // แรงตึงที่พอดี
const NET = [38, 62];     // ตำแหน่งสวิงที่ช้อนได้
const NET_S = 3;          // ต้องช้อนภายในกี่วินาที

// ตกปลา: a เหวี่ยงเบ็ด กระตุก แล้วกดค้างม้วนรอกให้แรงตึงอยู่โซนเขียว พอปลาโผล่ b แตะสวิงช้อนตอนเงาปลาผ่านกรอบ
export const fishing = {
  id: 'fish',
  kind: 'fish',
  title: 'ตกปลา',
  desc: 'คนหนึ่งเหวี่ยงเบ็ด กระตุก แล้วกดค้างม้วนรอกให้แรงตึงอยู่โซนเขียว พอปลาโผล่ อีกคนแตะสวิงช้อนให้ทัน 75 วินาที',
  seconds: 75,
  unit: 'ตัว',
  collectAt: 'ตู้ปลาในสวน',
  stars: [3, 5, 7],

  create({ el, role, seed, send, partnerName }) {
    let id = 0;
    let phase = 'idle'; // idle | wait | bite | reel | surface
    const caught = [];
    let t = 20; let p = 0; let reeling = false;
    let netT = 20; let netP = 0; let showT = 20; let showP = 0;
    let surfAt = 0; let msg = '';
    let live = false; let raf = 0; let last = 0; let lastSent = 0;
    let timers = [];
    const later = (fn, ms) => { const x = setTimeout(fn, ms); timers.push(x); };

    el.innerHTML = `
      <div class="cg fs">
        <p class="cg-count"><b id="fsN">0</b> ตัวที่ตกได้</p>
        <div class="fs-pond" id="fsPond">
          <span class="fs-line" id="fsLine"></span><span class="fs-bob" id="fsBob"></span>
          <span class="fs-netzone" style="left:${NET[0]}%;width:${NET[1] - NET[0]}%"></span>
          <span class="fs-shadow" id="fsShadow"></span>
        </div>
        <p class="cg-role" id="fsMsg" aria-live="polite"></p>
        <div class="meter" aria-hidden="true"><i class="zone" style="left:${ZONE[0]}%;width:${ZONE[1] - ZONE[0]}%"></i><i class="danger" style="left:100%"></i><i class="needle" id="fsT"></i></div>
        <div class="kc-prog"><i id="fsP"></i></div>
        <div class="fs-caught" id="fsC"></div>
        <button class="cg-big" id="fsBtn" type="button"></button>
      </div>`;
    const $ = (x) => el.querySelector(`#${x}`);
    const btn = $('fsBtn');
    const pond = $('fsPond');

    const shadowX = (now) => {
      const age = (now - surfAt) / 1000;
      return 50 + 40 * Math.sin(age * (2.2 + rand(seed, id * 7 + 3) * 1.6) + rand(seed, id * 7 + 4) * 6.28);
    };

    function draw() {
      $('fsN').textContent = String(caught.length);
      $('fsC').textContent = caught.map((s) => speciesInfo('fish', s)?.icon || '').join(' ');
      pond.dataset.phase = phase;
      $('fsMsg').textContent = msg;
      let label = ''; let off = true;
      if (phase === 'surface') {
        if (role === 'b') { label = 'ช้อนสวิง! 🥅'; off = false; } else label = `${partnerName} กำลังช้อน...`;
      } else if (role === 'a') {
        if (phase === 'idle') { label = 'เหวี่ยงเบ็ด 🎣'; off = false; }
        else if (phase === 'wait') label = 'รอปลากินเหยื่อ...';
        else if (phase === 'bite') { label = 'กระตุก!'; off = false; }
        else { label = 'กดค้างเพื่อม้วนรอก'; off = false; }
      } else label = phase === 'reel' ? `${partnerName} กำลังม้วนรอก เตรียมสวิงไว้` : phase === 'bite' ? 'ปลากินเหยื่อแล้ว!' : phase === 'wait' ? 'รอปลากินเหยื่อ...' : `รอ ${partnerName} เหวี่ยงเบ็ด`;
      btn.textContent = label;
      btn.disabled = off || !live;
      btn.classList.toggle('hot', (phase === 'bite' && role === 'a') || (phase === 'surface' && role === 'b'));
    }

    function endFish(good, text) {
      if (good) { caught.push(pickSpecies('fish', seed, id)); msg = `ได้ ${speciesInfo('fish', caught.at(-1))?.name || 'ปลา'}!`; pond.classList.remove('splash'); void pond.offsetWidth; pond.classList.add('splash'); }
      else msg = text;
      id += 1; phase = 'idle'; reeling = false; t = 20; p = 0; netT = 20; netP = 0;
      draw();
    }

    function apply(a) {
      if (a.id !== id) return;
      if (a.k === 'cast' && phase === 'idle') {
        phase = 'wait'; msg = '';
        if (role === 'a') later(() => { if (phase === 'wait' && live && a.id === id) act({ k: 'bite', id }); }, 1400 + rand(seed, id) * 2400);
      } else if (a.k === 'bite' && phase === 'wait') {
        phase = 'bite';
        if (role === 'a') later(() => { if (phase === 'bite' && live && a.id === id) act({ k: 'miss', id }); }, HOOK_MS);
      } else if (a.k === 'hook' && phase === 'bite') { phase = 'reel'; t = 20; p = 0; msg = ''; }
      else if (a.k === 'miss' && phase === 'bite') { endFish(false, 'ปลาหนีไปแล้ว'); return; }
      else if (a.k === 'reel' && phase === 'reel') { netT = a.t; netP = a.p; return; }
      else if (a.k === 'snap' && phase === 'reel') { endFish(false, 'สายขาด!'); return; }
      else if (a.k === 'surface' && phase === 'reel') {
        phase = 'surface'; surfAt = performance.now(); p = 1; netP = 1; msg = 'ปลาโผล่แล้ว!';
        if (role === 'b') later(() => { if (phase === 'surface' && live && a.id === id) act({ k: 'net', id, ok: false }); }, NET_S * 1000);
      } else if (a.k === 'net' && phase === 'surface') { endFish(a.ok, 'ช้อนพลาด ปลาหนีไป'); return; }
      draw();
    }
    const act = (a) => { send(a); apply(a); };

    hold(btn, (on) => { reeling = on && role === 'a' && phase === 'reel'; });
    btn.addEventListener('pointerdown', () => {
      if (btn.disabled || !live) return;
      if (role === 'a') {
        if (phase === 'idle') act({ k: 'cast', id });
        else if (phase === 'bite') act({ k: 'hook', id });
      } else if (phase === 'surface') {
        const x = shadowX(performance.now());
        if (x >= NET[0] && x <= NET[1]) act({ k: 'net', id, ok: true });
        else { pond.classList.remove('whiff'); void pond.offsetWidth; pond.classList.add('whiff'); }
      }
    });

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (live && role === 'a' && phase === 'reel') {
        const jerk = (rand(seed, id * 100 + (Math.floor(now / 380) % 97)) - 0.5) * 80;
        t = Math.max(0, Math.min(110, t + (reeling ? 46 : -32) * dt + jerk * dt));
        const inZone = t >= ZONE[0] && t <= ZONE[1];
        p = Math.max(0, Math.min(1, p + (inZone ? 0.3 : -0.1) * dt));
        if (t > 100) act({ k: 'snap', id });
        else if (p >= 1) act({ k: 'surface', id });
        else if (now - lastSent > 110) { lastSent = now; send({ k: 'reel', id, t: Math.round(t), p: Math.round(p * 100) / 100 }); }
      }
      const tt = role === 'a' ? t : netT;
      const tp = role === 'a' ? p : netP;
      showT = role === 'a' ? tt : ease(showT, tt, dt, 12);
      showP = ease(showP, tp, dt, 12);
      $('fsT').style.left = `${Math.min(100, showT)}%`;
      $('fsT').classList.toggle('hot', showT > ZONE[1] + 18);
      $('fsP').style.width = `${showP * 100}%`;
      $('fsLine').style.setProperty('--tense', String(Math.min(1, showT / 100)));
      const sh = $('fsShadow');
      if (phase === 'surface') { const x = shadowX(now); sh.style.left = `${x}%`; sh.classList.toggle('in', x >= NET[0] && x <= NET[1]); }
      raf = requestAnimationFrame(frame);
    }

    draw();
    return {
      onAct: apply,
      start() { live = true; draw(); last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { live = false; reeling = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; draw(); },
      score: () => caught.length,
      items: () => caught,
    };
  },
};
