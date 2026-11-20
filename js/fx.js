// เอฟเฟกต์ตกแต่ง: ของลอยตามฤดูบนพื้นหลัง และพลุฉลอง
// ทั้งสองอย่างหยุดเองถ้าเครื่องตั้งค่า "ลดการเคลื่อนไหว" ไว้ และหยุดตอนสลับแอป
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- ของลอยตามฤดู ---------- */
// ร้อน = ประกายแดด, ฝน = เม็ดฝน, หนาว = เกล็ดหิมะ, ใบไม้ผลิ = กลีบซากุระ, ใบไม้ร่วง = ใบไม้
const KIND = {
  summer: { n: 16, color: ['#FFD27A', '#FFE7B0', '#FFB870'], speed: [6, 14], size: [2, 4.5] },
  rain: { n: 34, color: ['#8CCBEB', '#6FA8CF', '#B8DFF5'], speed: [170, 260], size: [10, 18] },
  cool: { n: 26, color: ['#FFFFFF', '#E8E0FF', '#D9E8FF'], speed: [14, 30], size: [2, 4.5] },
  spring: { n: 18, color: ['#FFB3C9', '#FF9BB9', '#FFD0DE'], speed: [18, 34], size: [5, 8] },
  autumn: { n: 16, color: ['#E8893A', '#C8612A', '#F2B25C', '#A8462A'], speed: [20, 38], size: [6, 10] },
};
const rnd = (a, b) => a + Math.random() * (b - a);

export function startAmbient() {
  const cv = document.getElementById('ambient');
  if (!cv) return;
  const g = cv.getContext('2d');
  let w = 0; let h = 0; let dpr = 1;
  let season = '';
  let parts = [];
  let raf = 0;
  let last = 0;

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (k, anywhere) => ({
    x: rnd(0, w), y: anywhere ? rnd(0, h) : rnd(-40, -10),
    v: rnd(...k.speed), s: rnd(...k.size), c: k.color[Math.floor(Math.random() * k.color.length)],
    a: rnd(0, Math.PI * 2), spin: rnd(-1.2, 1.2), sway: rnd(.4, 1.2), ph: rnd(0, 10), o: rnd(.35, .8),
  });
  const reset = () => {
    const k = KIND[season] || KIND.summer;
    const scale = Math.min(1, (w * h) / (1280 * 800)) * .6 + .4; // จอเล็กใช้ของน้อยลง
    parts = Array.from({ length: Math.round(k.n * scale) }, () => spawn(k, true));
  };

  function draw(p, t) {
    g.globalAlpha = p.o;
    g.fillStyle = p.c;
    g.strokeStyle = p.c;
    if (season === 'rain') {
      g.lineWidth = 1.4;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.s * .18, p.y + p.s); g.stroke();
    } else if (season === 'summer') {
      const r = p.s * (0.75 + 0.35 * Math.sin(t * 1.6 + p.ph));
      g.globalAlpha = p.o * (0.55 + 0.45 * Math.sin(t * 1.2 + p.ph));
      g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
    } else if (season === 'cool') {
      g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill();
    } else {
      g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      g.beginPath();
      if (season === 'spring') g.ellipse(0, 0, p.s, p.s * .6, 0, 0, Math.PI * 2);
      else { g.moveTo(0, -p.s); g.quadraticCurveTo(p.s * .8, 0, 0, p.s); g.quadraticCurveTo(-p.s * .8, 0, 0, -p.s); }
      g.fill(); g.restore();
    }
  }

  function frame(now) {
    raf = 0;
    const want = document.documentElement.dataset.season || 'summer';
    if (want !== season) { season = want; reset(); }
    const dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    const t = now / 1000;
    const k = KIND[season] || KIND.summer;
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      p.y += p.v * dt;
      p.x += Math.sin(t * p.sway + p.ph) * (season === 'rain' ? 6 : 14) * dt - (season === 'rain' ? 20 * dt : 0);
      p.a += p.spin * dt;
      if (p.y > h + 30 || p.x < -30 || p.x > w + 30) parts[i] = spawn(k, false);
      draw(parts[i], t);
    }
    g.globalAlpha = 1;
    loop();
  }
  const lite = () => document.documentElement.classList.contains('lite');
  const loop = () => {
    if (!raf && !document.hidden && !reduced.matches && !lite()) raf = requestAnimationFrame(frame);
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; if (reduced.matches) g.clearRect(0, 0, w, h); };

  resize();
  window.addEventListener('resize', () => { resize(); reset(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : loop()));
  reduced.addEventListener?.('change', () => (reduced.matches ? stop() : loop()));
  window.addEventListener('2gether:lite', (e) => { if (e.detail) { stop(); g.clearRect(0, 0, w, h); } else loop(); });
  loop();
}

/* ---------- พลุฉลอง ---------- */
export function confetti({ count = 140, duration = 2600 } = {}) {
  if (reduced.matches) return;
  if (document.documentElement.classList.contains('lite')) count = Math.round(count * 0.45);
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth; const h = window.innerHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const colors = ['--accent', '--accent2', '--accent-ink'].map((v) => css.getPropertyValue(v).trim()).filter(Boolean)
    .concat(['#FFD45C', '#7CC4EA', '#8BD17C']);
  const bits = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const ang = (fromLeft ? -60 : -120) * Math.PI / 180 + rnd(-.45, .45);
    const sp = rnd(520, 980);
    return {
      x: fromLeft ? -10 : w + 10, y: h * rnd(.55, .8),
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      s: rnd(6, 11), r: rnd(0, 6), vr: rnd(-12, 12), c: colors[i % colors.length], heart: i % 9 === 0,
    };
  });
  const t0 = performance.now();
  let last = t0;
  requestAnimationFrame(function f(now) {
    const dt = Math.min(.04, (now - last) / 1000);
    last = now;
    const life = (now - t0) / duration;
    g.clearRect(0, 0, w, h);
    g.globalAlpha = Math.max(0, 1 - Math.max(0, life - .7) / .3);
    for (const b of bits) {
      b.vy += 900 * dt; b.vx *= 1 - 1.4 * dt; b.vy *= 1 - .6 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c;
      if (b.heart) {
        const s = b.s * .9;
        g.beginPath(); g.moveTo(0, s * .35);
        g.bezierCurveTo(-s, -s * .3, -s * .45, -s, 0, -s * .45);
        g.bezierCurveTo(s * .45, -s, s, -s * .3, 0, s * .35); g.fill();
      } else g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      g.restore();
    }
    if (life < 1) requestAnimationFrame(f); else cv.remove();
  });
}

/* ---------- หัวใจลอย (ปุ่มคิดถึง) ---------- */
const HEART_PATH = 'M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z';
export function floatHearts(n = 10) {
  const box = document.createElement('div');
  box.className = 'hearts-fly';
  box.setAttribute('aria-hidden', 'true');
  const count = reduced.matches ? 1 : n;
  for (let i = 0; i < count; i += 1) {
    const s = rnd(22, 46);
    box.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 24 24" style="left:${rnd(8, 92)}%;width:${s}px;animation-delay:${(i * 0.09).toFixed(2)}s;--dx:${rnd(-40, 40).toFixed(0)}px;--r:${rnd(-25, 25).toFixed(0)}deg"><path d="${HEART_PATH}"/></svg>`);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200 + count * 90);
}

/* ---------- ปุ่มคิดถึง: หัวใจหล่นกองเต็มจอ ค้าง 3 วิ แล้วไหลออก (แตะเพื่อข้าม) ---------- */
const HEART2D = typeof Path2D !== 'undefined' ? new Path2D(HEART_PATH) : null;
let raining = false;
// วาดหัวใจหนึ่งขนาด/สีเก็บไว้ล่วงหน้า แล้วแค่แปะรูปทุกเฟรม (เร็วกว่าวาดเส้นใหม่ทุกดวงมาก)
const heartSprites = new Map();
function heartSprite(color, size, dpr) {
  const key = `${color}|${size}|${dpr}`;
  let c = heartSprites.get(key);
  if (c) return c;
  const px = Math.ceil(size * dpr);
  c = document.createElement('canvas');
  c.width = px; c.height = px;
  const g = c.getContext('2d');
  g.scale(px / 24, px / 24);
  g.fillStyle = color; g.fill(HEART2D);
  g.lineWidth = 1.1; g.strokeStyle = 'rgba(120,20,50,.32)'; g.stroke(HEART2D);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(7.5, 8.5, 2.2, 1.4, -0.6, 0, Math.PI * 2); g.fill();
  heartSprites.set(key, c);
  return c;
}

// หัวใจหลายขนาดร่วงลงมากองจนเต็มจอ ค้างไว้ แล้วไหลออก (แตะเพื่อข้าม)
// ใบใหญ่ตกช้า ใบเล็กตกเร็ว กองตามความสูงจริงของแต่ละช่วงจอ
// ฝนหัวใจรวมไม่เกินราว 4 วินาที: ร่วง 1.8 วิ กองที่พื้นบางๆ แล้วจางหาย
export function heartRain({ hold = 500 } = {}) {
  if (raining || !HEART2D) return;
  if (reduced.matches) { floatHearts(3); return; }
  raining = true;
  const lite = document.documentElement.classList.contains('lite');
  const cv = document.createElement('canvas');
  cv.className = 'heart-rain';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const dpr = Math.min(lite ? 1.5 : 2, window.devicePixelRatio || 1);
  const w = window.innerWidth; const h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  const unit = Math.max(0.8, Math.min(1.25, Math.min(w, h) / 420));
  const MIN = 12 * unit * (lite ? 1.4 : 1);
  const MAX = 56 * unit * (lite ? 1.15 : 1);
  const COLORS = ['#F2617F', '#FF8FAB', '#E8456A', '#FFB3C6', '#D93A5E', '#FF7096', '#FFC2D1'];
  // กองหัวใจ: ความสูงของกองในแต่ละช่องกว้าง 6px
  const CELL = 6;
  const cols = Math.ceil(w / CELL) + 1;
  const pile = new Float32Array(cols);
  const hearts = [];
  let phase = 'fill';
  let holdUntil = 0;
  let spawnAcc = 0;
  const t0 = performance.now();
  const avg = (MIN + MAX) / 2;
  const CAP = h * 0.2; // กองสูงไม่เกิน 1 ใน 5 ของจอ
  const perSec = (w * CAP) / (avg * avg * 0.5) / 1.4;
  const pickSize = () => { const r = Math.random(); return MIN + (MAX - MIN) * r * r; }; // ใบเล็กเยอะกว่าใบใหญ่
  const spanMax = (x, d) => {
    const a = Math.max(0, Math.floor((x - d * 0.4) / CELL));
    const b = Math.min(cols - 1, Math.ceil((x + d * 0.4) / CELL));
    let m = 0;
    for (let i = a; i <= b; i += 1) if (pile[i] > m) m = pile[i];
    return [m, a, b];
  };
  const spawn = () => {
    const d = pickSize();
    // สุ่ม 3 ตำแหน่ง เลือกที่กองต่ำสุด ให้กองขึ้นเรียบๆ
    let best = null;
    for (let k = 0; k < 3; k += 1) {
      const x = Math.random() * w;
      const [m, a, b] = spanMax(x, d);
      if (!best || m < best.m) best = { x, m, a, b };
    }
    if (best.m >= CAP) return;
    const top = best.m + d * 0.62;
    for (let i = best.a; i <= best.b; i += 1) pile[i] = Math.max(pile[i], top);
    const big = (d - MIN) / (MAX - MIN || 1);
    hearts.push({
      x: best.x, y: -d - Math.random() * 60, ty: h - best.m - d * 0.42, d,
      vy: 120 + Math.random() * 60, vmax: 820 - big * 470, // ใบใหญ่ตกช้า ใบเล็กตกเร็ว
      r: (Math.random() - 0.5) * 0.8, vr: 0, vx: 0, rest: false, delay: 0,
      img: heartSprite(COLORS[Math.floor(Math.random() * COLORS.length)], Math.round(d), dpr),
    });
  };
  const skip = () => { if (phase !== 'drain') startDrain(); };
  cv.addEventListener('pointerdown', skip);
  let fadeAt = 0;
  function startDrain() { phase = 'drain'; fadeAt = performance.now(); }
  let last = performance.now();
  requestAnimationFrame(function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (phase === 'fill') {
      spawnAcc += perSec * dt;
      while (spawnAcc >= 1) { spawnAcc -= 1; spawn(); }
      if (now - t0 > 1800) { phase = 'hold'; holdUntil = now + hold; }
    } else if (phase === 'hold' && now > holdUntil) startDrain();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    let alive = 0;
    // จางออกทั้งชั้นใน 0.9 วินาที
    const fade = phase === 'drain' ? Math.max(0, 1 - (now - fadeAt) / 900) : 1;
    g.globalAlpha = fade;
    for (let i = 0; i < hearts.length; i += 1) {
      const p = hearts[i];
      if (!p.rest) {
        p.vy = Math.min(p.vmax, p.vy + 1100 * dt);
        p.y += p.vy * dt;
        if (p.y >= p.ty) { p.y = p.ty; p.rest = true; }
      }
      if (p.y > h + p.d) continue;
      alive += 1;
      const c = Math.cos(p.r) * dpr; const sn = Math.sin(p.r) * dpr;
      g.setTransform(c, sn, -sn, c, p.x * dpr, p.y * dpr);
      g.drawImage(p.img, -p.d / 2, -p.d / 2, p.d, p.d);
    }
    if (phase === 'drain' && (alive === 0 || fade <= 0)) { cv.remove(); raining = false; return; }
    requestAnimationFrame(frame);
  });
}

/* ---------- ฉลองชนะแบบจัดเต็ม: พลุ + กระดาษสี + ถ้วยรางวัล + ตัวละครกระโดด + Bond วิ่งขึ้น ---------- */
const TROPHY = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset=".55" stop-color="#F5B940"/><stop offset="1" stop-color="#D98F1C"/></linearGradient></defs>
  <path d="M30 18h60v14c0 22-12 38-30 40-18-2-30-18-30-40z" fill="url(#tg)" stroke="#8A5A14" stroke-width="3"/>
  <path d="M30 26H14c0 16 8 26 20 28M90 26h16c0 16-8 26-20 28" fill="none" stroke="#D98F1C" stroke-width="6" stroke-linecap="round"/>
  <rect x="52" y="72" width="16" height="16" fill="#D98F1C" stroke="#8A5A14" stroke-width="3"/>
  <rect x="36" y="88" width="48" height="14" rx="4" fill="#B8742A" stroke="#8A5A14" stroke-width="3"/>
  <path d="M60 30l4.5 9 10 1.5-7.2 7 1.7 10-9-4.7-9 4.7 1.7-10-7.2-7 10-1.5z" fill="#FFF6D0"/>
  <path d="M40 24c2 14 6 22 12 28" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5" fill="none"/></svg>`;

function fireworks(cv, ms) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth; const h = window.innerHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const COLORS = ['#FFD45C', '#FF6F91', '#7CC4EA', '#8BD17C', '#C39BFF', '#FF9A4A'];
  const rockets = []; const sparks = [];
  let t0 = performance.now(); let last = t0; let nextLaunch = 0;
  requestAnimationFrame(function f(now) {
    const dt = Math.min(0.04, (now - last) / 1000); last = now;
    const age = now - t0;
    if (age < ms - 900 && now > nextLaunch) {
      nextLaunch = now + 260 + Math.random() * 280;
      rockets.push({ x: w * (0.15 + Math.random() * 0.7), y: h + 10, vy: -(h * 0.95 + Math.random() * h * 0.35), ty: h * (0.15 + Math.random() * 0.3), c: COLORS[Math.floor(Math.random() * COLORS.length)] });
    }
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, w, h); // หางแสง
    g.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i -= 1) {
      const r = rockets[i];
      r.y += r.vy * dt; r.vy *= 0.985;
      g.fillStyle = r.c; g.beginPath(); g.arc(r.x, r.y, 2.6, 0, Math.PI * 2); g.fill();
      if (r.y <= r.ty) {
        rockets.splice(i, 1);
        const n = 54 + Math.floor(Math.random() * 30);
        for (let k = 0; k < n; k += 1) {
          const a = (k / n) * Math.PI * 2; const sp = 140 + Math.random() * 190;
          sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: Math.random() < 0.2 ? '#FFFFFF' : r.c });
        }
      }
    }
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const p = sparks[i];
      p.vy += 160 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.75;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      g.globalAlpha = p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    if (age < ms || sparks.length) requestAnimationFrame(f);
  });
}

// { title, sub, bond (ตัวเลข), cast: html ตัวละคร/แมว, ms }
export function celebrate({ title = 'ชนะ!', sub = '', bond = 0, cast = '', ms = 4800 } = {}) {
  if (reduced.matches) { confetti({ count: 60 }); return; }
  const ov = document.createElement('div');
  ov.className = 'celebrate';
  ov.setAttribute('role', 'status');
  ov.innerHTML = `<canvas class="fw" aria-hidden="true"></canvas>
    <div class="cel-box">
      <div class="cel-rays" aria-hidden="true"></div>
      <div class="cel-trophy">${TROPHY}</div>
      <p class="cel-title">${title.split('').map((ch, i) => `<span style="animation-delay:${0.35 + i * 0.06}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</p>
      ${sub ? `<p class="cel-sub">${sub}</p>` : ''}
      ${bond ? '<p class="cel-bond">Bond <b>+0</b></p>' : ''}
      ${cast ? `<div class="cel-cast" aria-hidden="true">${cast}</div>` : ''}
      <p class="cel-tap">แตะเพื่อไปต่อ</p>
    </div>`;
  document.body.appendChild(ov);
  fireworks(ov.querySelector('.fw'), ms);
  confetti({ count: 160 });
  setTimeout(() => confetti({ count: 120 }), 900);
  setTimeout(() => confetti({ count: 100 }), 1900);
  navigator.vibrate?.([40, 30, 40, 30, 120]);
  const b = ov.querySelector('.cel-bond b');
  if (b) {
    const t0 = performance.now() + 900;
    requestAnimationFrame(function up(now) {
      const k = Math.min(1, Math.max(0, (now - t0) / 900));
      b.textContent = `+${Math.round(bond * k)}`;
      if (k < 1) requestAnimationFrame(up);
    });
  }
  const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 450); };
  const t = setTimeout(close, ms);
  ov.addEventListener('pointerdown', () => { clearTimeout(t); close(); });
}

// แพ้/เสมอ: กลีบดอกไม้โปรยเบาๆ ไม่บังหน้าจอ
export function petals(ms = 2600) {
  if (reduced.matches) return;
  const box = document.createElement('div');
  box.className = 'petals';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 26; i += 1) box.insertAdjacentHTML('beforeend', `<i style="left:${rnd(0, 100)}%;animation-delay:${rnd(0, 1.2).toFixed(2)}s;animation-duration:${rnd(2.2, 3.4).toFixed(2)}s;--dx:${rnd(-60, 60).toFixed(0)}px;--r:${rnd(120, 480).toFixed(0)}deg"></i>`);
  document.body.appendChild(box);
  setTimeout(() => box.remove(), ms + 2200);
}

// พลุบนฟ้า (รางวัล Bond Lv.10) ราว 5 วินาที เครื่องแรงน้อยลดจำนวนประกาย
export function skyFireworks({ bursts = 9 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lite = document.documentElement.classList.contains('lite');
  const cv = document.createElement('canvas');
  cv.className = 'fireworks';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth; const h = innerHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const COLORS = ['#FF8FB1', '#FFD36E', '#9FD8FF', '#B9A4FF', '#8FE3B0', '#FFFFFF'];
  const parts = [];
  const per = lite ? 26 : 54;
  const boom = (x, y) => {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < per; i += 1) {
      const a = (i / per) * Math.PI * 2 + Math.random() * 0.2;
      const v = 110 + Math.random() * 120;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c, r: 1.6 + Math.random() * 1.6 });
    }
  };
  for (let i = 0; i < bursts; i += 1) setTimeout(() => boom(w * (0.15 + Math.random() * 0.7), h * (0.12 + Math.random() * 0.35)), i * 480 + Math.random() * 200);
  const t0 = performance.now();
  let last = t0;
  (function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 70 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.75;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      g.globalAlpha = p.life;
      g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    }
    if (now - t0 < bursts * 480 + 2200 || parts.length) requestAnimationFrame(tick);
    else cv.remove();
  }(t0));
}
