import { classic, firstTurn, other, layout, turnText } from './kit.js';
import { rand } from '../util.js';

const N = 8;
const SHIPS = [4, 3, 3, 2, 2];

// วางเรือแบบสุ่มจาก seed ย่อย (กดสุ่มใหม่ได้) คืน { grid: id ของเรือ|-1, ships: [{cells:[[x,y]]}] }
export function placeFleet(seed) {
  const grid = Array.from({ length: N }, () => Array(N).fill(-1));
  const ships = [];
  let k = 0;
  SHIPS.forEach((len, id) => {
    for (let tries = 0; tries < 200; tries += 1) {
      const horiz = rand(seed, k++) < 0.5;
      const x = Math.floor(rand(seed, k++) * (horiz ? N - len + 1 : N));
      const y = Math.floor(rand(seed, k++) * (horiz ? N : N - len + 1));
      const cells = Array.from({ length: len }, (_, i) => (horiz ? [x + i, y] : [x, y + i]));
      if (cells.every(([cx, cy]) => grid[cy][cx] === -1)) {
        cells.forEach(([cx, cy]) => { grid[cy][cx] = id; });
        ships.push({ cells, hits: 0 });
        return;
      }
    }
  });
  return { grid, ships };
}

export const battleship = classic({
  id: 'battleship',
  title: 'เรือรบ',
  desc: 'เรือถูกวางสุ่มบนกระดาน 8x8 ผลัดกันยิงช่องของอีกฝ่าย ยิงโดนได้ยิงต่อ จมครบทุกลำก่อนชนะ',
  create({ el, role, seed, send, end, partnerName }) {
    let layoutSeed = seed + (role === 'a' ? 1 : 2);
    let fleet = placeFleet(layoutSeed);
    let ready = false;
    let theirReady = false;
    let turn = firstTurn(seed);
    let over = false;
    const shots = Array.from({ length: N }, () => Array(N).fill(null)); // ที่เรายิงไป: hit|miss
    const taken = Array.from({ length: N }, () => Array(N).fill(false)); // ที่เขายิงมาที่เรา
    const L = layout(el, {
      board: '<div class="bs-wrap"><p class="cl-cap">น่านน้ำของ <span id="bsOpp"></span></p><div class="bs-grid" id="bsT"></div><p class="cl-cap">กองเรือของคุณ</p><div class="bs-grid small" id="bsM"></div></div>',
      extra: '<div class="gm-row"><button class="btn" id="bsRe" type="button">สุ่มวางใหม่</button><button class="btn primary" id="bsGo" type="button">พร้อมแล้ว</button></div>',
    });
    const T = el.querySelector('#bsT');
    const M = el.querySelector('#bsM');
    el.querySelector('#bsOpp').textContent = partnerName;
    const btnRe = el.querySelector('#bsRe');
    const btnGo = el.querySelector('#bsGo');

    function draw() {
      let t = '';
      for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
        const s = shots[y][x];
        t += `<button class="bs-cell ${s || ''}" data-x="${x}" data-y="${y}" type="button" aria-label="ยิงแถว ${y + 1} หลัก ${x + 1}" ${ready && theirReady && !over && turn === role && !s ? '' : 'disabled'}>${s === 'hit' ? '💥' : s === 'miss' ? '·' : ''}</button>`;
      }
      T.innerHTML = t;
      let m = '';
      for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
        const ship = fleet.grid[y][x] >= 0;
        m += `<i class="bs-cell ${ship ? 'ship' : ''} ${taken[y][x] ? (ship ? 'hit' : 'miss') : ''}"></i>`;
      }
      M.innerHTML = m;
      btnRe.hidden = ready;
      btnGo.hidden = ready;
      if (!ready) L.status('จัดกองเรือของคุณ แล้วกด "พร้อมแล้ว"');
      else if (!theirReady) L.status(`รอ ${partnerName} จัดเรือ...`);
      else L.status(over ? '' : turnText(turn, role, partnerName));
    }

    function incoming(a) {
      const { x, y } = a;
      if (taken[y][x]) return;
      taken[y][x] = true;
      const id = fleet.grid[y][x];
      let r = 'miss';
      if (id >= 0) {
        const ship = fleet.ships[id];
        ship.hits += 1;
        r = ship.hits >= ship.cells.length ? 'sunk' : 'hit';
      }
      const over2 = fleet.ships.every((s) => s.hits >= s.cells.length);
      send({ k: 'res', x, y, r, over: over2 });
      if (r === 'miss') turn = role; // เราตัวรับ: เมื่อเขายิงพลาดถึงตาเรา
      draw();
      if (over2) { over = true; draw(); end({ winner: other(role) }); }
    }
    function result(a) {
      shots[a.y][a.x] = a.r === 'miss' ? 'miss' : 'hit';
      if (a.r === 'miss') turn = other(role);
      if (a.over) { over = true; draw(); end({ winner: role }); return; }
      draw();
    }
    function apply(a) {
      if (a.k === 'ready') { theirReady = true; draw(); }
      else if (a.k === 'shot' && !over && turn === other(role)) incoming(a);
      else if (a.k === 'res') result(a);
    }

    btnRe.addEventListener('click', () => { layoutSeed += 7; fleet = placeFleet(layoutSeed); draw(); });
    btnGo.addEventListener('click', () => { ready = true; send({ k: 'ready' }); draw(); });
    T.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-x]');
      if (!c || turn !== role || over || !ready || !theirReady) return;
      send({ k: 'shot', x: Number(c.dataset.x), y: Number(c.dataset.y) });
      c.disabled = true; // รอผลจากอีกฝั่ง
    });
    draw();
    return { onAct: apply };
  },
});
