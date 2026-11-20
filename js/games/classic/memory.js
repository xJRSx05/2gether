import { classic, firstTurn, other, layout, turnText } from './kit.js';
import { rand } from '../util.js';

const ICONS = ['🐱', '🐶', '🐰', '🦊', '🐼', '🐸', '🦄', '🐙', '🌸', '🍓'];

export function shuffled(seed) {
  const deck = [...ICONS, ...ICONS];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand(seed, i) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const memory = classic({
  id: 'memory',
  title: 'จับคู่ภาพ',
  desc: 'ผลัดกันเปิดการ์ดทีละ 2 ใบ เจอคู่เหมือนได้แต้มและเปิดต่อ ใครเก็บคู่ได้มากกว่าชนะ',
  create({ el, role, seed, send, end, partnerName }) {
    const deck = shuffled(seed);
    const up = new Set();      // เปิดค้างอยู่ (ยังไม่ตัดสิน)
    const done = {};           // index -> ผู้เก็บ
    let turn = firstTurn(seed);
    let first = null;
    let lock = false;
    let over = false;
    const queue = [];
    const L = layout(el, { board: '<div class="mm-grid"></div>', extra: '<p class="cl-score"></p>' });
    const grid = L.board.firstChild;
    const pairs = (who) => Object.values(done).filter((x) => x === who).length / 2;

    function draw() {
      grid.innerHTML = deck.map((ic, i) => {
        const open = up.has(i) || done[i];
        return `<button class="mm-card ${open ? 'open' : ''} ${done[i] ? `got-${done[i] === role ? 'me' : 'op'}` : ''}" data-i="${i}" type="button" aria-label="การ์ด ${i + 1}" ${open || lock || over || turn !== role ? 'disabled' : ''}>${open ? ic : ''}</button>`;
      }).join('');
      L.extra.firstChild.textContent = `คุณ ${pairs(role)} คู่ · ${partnerName} ${pairs(other(role))} คู่`;
      L.status(over ? '' : turnText(turn, role, partnerName));
    }
    function flip(a) {
      if (over || a.by !== turn || up.has(a.i) || done[a.i] !== undefined) return;
      if (lock) { queue.push(a); return; }
      up.add(a.i);
      if (first === null) { first = a.i; draw(); return; }
      const second = a.i;
      const match = deck[first] === deck[second];
      lock = true;
      draw();
      setTimeout(() => {
        up.delete(first); up.delete(second);
        if (match) { done[first] = turn; done[second] = turn; } else turn = other(turn);
        first = null;
        lock = false;
        if (Object.keys(done).length === deck.length) {
          over = true;
          draw();
          const x = pairs('a'); const y = pairs('b');
          end({ winner: x === y ? 'draw' : x > y ? 'a' : 'b' });
          return;
        }
        draw();
        while (queue.length && !lock) flip(queue.shift());
      }, 900);
    }
    grid.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-i]');
      if (!c || turn !== role || lock) return;
      const a = { i: Number(c.dataset.i), by: role };
      send(a);
      flip(a);
    });
    draw();
    return { onAct: flip };
  },
});
