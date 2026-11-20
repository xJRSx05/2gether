import { classic, firstTurn, other, layout, turnText } from './kit.js';

export const COLS = 7;
export const ROWS = 6;

export function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r -= 1) if (!b[r][c]) return r;
  return -1;
}
export function fourFrom(b, r, c) {
  const who = b[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let n = 1;
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === who) { n += 1; rr += dr * s; cc += dc * s; }
    }
    if (n >= 4) return true;
  }
  return false;
}

export const connect4 = classic({
  id: 'connect4',
  title: 'Connect 4',
  desc: 'หย่อนเหรียญลงช่อง เรียง 4 เม็ดติดกันก่อนชนะ',
  create({ el, role, seed, send, end, partnerName }) {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let turn = firstTurn(seed);
    let over = false;
    let last = null;
    const L = layout(el, { board: '<div class="c4-grid"></div>' });
    const grid = L.board.firstChild;

    function draw() {
      let html = '';
      for (let c = 0; c < COLS; c += 1) {
        html += `<button class="c4-col" data-c="${c}" type="button" aria-label="คอลัมน์ ${c + 1}" ${over || turn !== role || dropRow(b, c) < 0 ? 'disabled' : ''}>`;
        for (let r = 0; r < ROWS; r += 1) html += `<i class="c4-disc ${b[r][c] || ''} ${last && last[0] === r && last[1] === c ? 'last' : ''}"></i>`;
        html += '</button>';
      }
      grid.innerHTML = html;
      L.status(over ? '' : `${turnText(turn, role, partnerName)} (เหรียญของคุณคือสี${role === 'a' ? 'แดง' : 'เหลือง'})`);
    }
    function apply(a) {
      if (over || a.by !== turn) return;
      const r = dropRow(b, a.c);
      if (r < 0) return;
      b[r][a.c] = turn;
      last = [r, a.c];
      if (fourFrom(b, r, a.c)) { over = true; draw(); end({ winner: turn }); return; }
      if (b.every((row) => row.every(Boolean))) { over = true; draw(); end({ winner: 'draw' }); return; }
      turn = other(turn);
      draw();
    }
    grid.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-c]');
      if (!c || turn !== role) return;
      const a = { c: Number(c.dataset.c), by: role };
      send(a);
      apply(a);
    });
    draw();
    return { onAct: apply };
  },
});
