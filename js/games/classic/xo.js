import { classic, firstTurn, other, layout, turnText } from './kit.js';

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function xoWinner(b) {
  for (const [x, y, z] of LINES) if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
  return b.every(Boolean) ? 'draw' : null;
}

export const xo = classic({
  id: 'xo',
  title: 'XO',
  desc: 'เรียง 3 ตัวติดกันก่อนชนะ ผลัดกันวาง',
  create({ el, role, seed, send, end, partnerName }) {
    const b = Array(9).fill(null);
    let turn = firstTurn(seed);
    let over = false;
    const L = layout(el, { board: '<div class="xo-grid"></div>' });
    const grid = L.board.firstChild;
    const sym = { a: '✕', b: '◯' };

    function draw() {
      grid.innerHTML = b.map((v, i) => `<button class="xo-cell ${v || ''}" data-i="${i}" type="button" aria-label="ช่อง ${i + 1} ${v ? sym[v] : 'ว่าง'}" ${v || over || turn !== role ? 'disabled' : ''}>${v ? sym[v] : ''}</button>`).join('');
      L.status(over ? '' : `${turnText(turn, role, partnerName)} (คุณคือ ${sym[role]})`);
    }
    function apply(a) {
      if (over || b[a.i] || a.by !== turn) return;
      b[a.i] = turn;
      const w = xoWinner(b);
      if (w) { over = true; draw(); end({ winner: w }); return; }
      turn = other(turn);
      draw();
    }
    grid.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-i]');
      if (!c || turn !== role) return;
      const a = { i: Number(c.dataset.i), by: role };
      send(a);
      apply(a);
    });
    draw();
    return { onAct: apply };
  },
});
