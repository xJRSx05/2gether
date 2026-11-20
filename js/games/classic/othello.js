import { classic, other, layout, turnText } from './kit.js';

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
export const newBoard = () => {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  b[3][3] = 'b'; b[4][4] = 'b'; b[3][4] = 'a'; b[4][3] = 'a';
  return b;
};

// ตัวที่จะถูกพลิกถ้าวาง who ที่ (x,y)
export function flips(b, x, y, who) {
  if (b[y][x]) return [];
  const out = [];
  for (const [dx, dy] of DIRS) {
    const line = [];
    let xx = x + dx;
    let yy = y + dy;
    while (xx >= 0 && xx < 8 && yy >= 0 && yy < 8 && b[yy][xx] && b[yy][xx] !== who) { line.push([xx, yy]); xx += dx; yy += dy; }
    if (line.length && xx >= 0 && xx < 8 && yy >= 0 && yy < 8 && b[yy][xx] === who) out.push(...line);
  }
  return out;
}
export function moves(b, who) {
  const out = [];
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) if (flips(b, x, y, who).length) out.push([x, y]);
  return out;
}
export const count = (b, who) => b.flat().filter((v) => v === who).length;

export const othello = classic({
  id: 'othello',
  title: 'โอเทลโล',
  desc: 'วางหมากให้ล้อมตัวของอีกฝ่ายแล้วพลิกเป็นสีเรา จบเกมใครมีหมากมากกว่าชนะ',
  create({ el, role, send, end, partnerName }) {
    const b = newBoard();
    let turn = 'a'; // ดำ (a) เดินก่อนตามกติกา
    let over = false;
    const L = layout(el, { board: '<div class="ot-grid"></div>', extra: '<p class="cl-score"></p>' });
    const grid = L.board.firstChild;

    function draw() {
      const legal = turn === role && !over ? moves(b, role) : [];
      let h = '';
      for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
        const v = b[y][x];
        const ok = legal.some(([lx, ly]) => lx === x && ly === y);
        h += `<button class="ot-cell ${ok ? 'ok' : ''}" data-x="${x}" data-y="${y}" type="button" aria-label="แถว ${y + 1} หลัก ${x + 1}" ${ok ? '' : 'disabled'}>${v ? `<i class="ot-disc ${v === 'a' ? 'blk' : 'wht'}"></i>` : ''}</button>`;
      }
      grid.innerHTML = h;
      L.extra.firstChild.textContent = `ดำ ${count(b, 'a')} · ขาว ${count(b, 'b')} (คุณคือหมาก${role === 'a' ? 'ดำ' : 'ขาว'})`;
      L.status(over ? '' : turnText(turn, role, partnerName));
    }
    function apply(a) {
      if (over || a.by !== turn) return;
      const f = flips(b, a.x, a.y, turn);
      if (!f.length) return;
      b[a.y][a.x] = turn;
      f.forEach(([x, y]) => { b[y][x] = turn; });
      const next = other(turn);
      if (moves(b, next).length) turn = next;
      else if (!moves(b, turn).length) {
        over = true;
        draw();
        const ca = count(b, 'a');
        const cb = count(b, 'b');
        end({ winner: ca === cb ? 'draw' : ca > cb ? 'a' : 'b' });
        return;
      }
      draw();
    }
    grid.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-x]');
      if (!c || turn !== role) return;
      const a = { x: Number(c.dataset.x), y: Number(c.dataset.y), by: role };
      send(a);
      apply(a);
    });
    draw();
    return { onAct: apply };
  },
});
