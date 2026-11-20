import { classic, firstTurn, other, layout, turnText } from './kit.js';

const B = 5; // กล่อง 5x5 (จุด 6x6)
const S = 50;
const O = 25;

export function boxDone(h, v, r, c) { return h[r][c] && h[r + 1][c] && v[r][c] && v[r][c + 1]; }

export const dots = classic({
  id: 'dots',
  title: 'จุดต่อจุด',
  desc: 'ผลัดกันลากเส้นเชื่อมจุด ใครปิดกล่องได้จะได้กล่องนั้นและเล่นต่อ ปิดได้มากกว่าชนะ',
  create({ el, role, seed, send, end, partnerName }) {
    const h = Array.from({ length: B + 1 }, () => Array(B).fill(false));
    const v = Array.from({ length: B }, () => Array(B + 1).fill(false));
    const own = Array.from({ length: B }, () => Array(B).fill(null));
    let turn = firstTurn(seed);
    let over = false;
    const L = layout(el, { board: '<svg class="dt-svg" viewBox="0 0 300 300" role="group" aria-label="กระดานจุดต่อจุด"></svg>', extra: '<p class="cl-score"></p>' });
    const svg = L.board.firstChild;
    const sc = (who) => own.flat().filter((x) => x === who).length;

    function draw() {
      let s = '';
      for (let r = 0; r < B; r += 1) for (let c = 0; c < B; c += 1) {
        if (own[r][c]) s += `<rect x="${O + c * S + 3}" y="${O + r * S + 3}" width="${S - 6}" height="${S - 6}" rx="6" class="dt-box ${own[r][c]}"/>`;
      }
      for (let r = 0; r <= B; r += 1) for (let c = 0; c < B; c += 1) {
        const x1 = O + c * S; const y = O + r * S;
        s += `<line x1="${x1 + 6}" y1="${y}" x2="${x1 + S - 6}" y2="${y}" class="dt-edge ${h[r][c] ? 'on' : ''}"/>`;
        if (!h[r][c] && !over && turn === role) s += `<rect x="${x1}" y="${y - 12}" width="${S}" height="24" class="dt-hit" data-t="h" data-r="${r}" data-c="${c}"/>`;
      }
      for (let r = 0; r < B; r += 1) for (let c = 0; c <= B; c += 1) {
        const x = O + c * S; const y1 = O + r * S;
        s += `<line x1="${x}" y1="${y1 + 6}" x2="${x}" y2="${y1 + S - 6}" class="dt-edge ${v[r][c] ? 'on' : ''}"/>`;
        if (!v[r][c] && !over && turn === role) s += `<rect x="${x - 12}" y="${y1}" width="24" height="${S}" class="dt-hit" data-t="v" data-r="${r}" data-c="${c}"/>`;
      }
      for (let r = 0; r <= B; r += 1) for (let c = 0; c <= B; c += 1) s += `<circle cx="${O + c * S}" cy="${O + r * S}" r="4" class="dt-dot"/>`;
      svg.innerHTML = s;
      L.extra.firstChild.textContent = `คุณ ${sc(role)} · ${partnerName} ${sc(other(role))}`;
      L.status(over ? '' : turnText(turn, role, partnerName));
    }
    function apply(a) {
      if (over || a.by !== turn) return;
      const arr = a.t === 'h' ? h : v;
      if (!arr[a.r] || arr[a.r][a.c] !== false) return;
      arr[a.r][a.c] = true;
      let got = 0;
      for (let r = 0; r < B; r += 1) for (let c = 0; c < B; c += 1) {
        if (!own[r][c] && boxDone(h, v, r, c)) { own[r][c] = turn; got += 1; }
      }
      if (own.flat().every(Boolean)) {
        over = true;
        draw();
        const x = sc('a'); const y = sc('b');
        end({ winner: x === y ? 'draw' : x > y ? 'a' : 'b' });
        return;
      }
      if (!got) turn = other(turn);
      draw();
    }
    svg.addEventListener('click', (ev) => {
      const e = ev.target.closest('[data-t]');
      if (!e || turn !== role) return;
      const a = { t: e.dataset.t, r: Number(e.dataset.r), c: Number(e.dataset.c), by: role };
      send(a);
      apply(a);
    });
    draw();
    return { onAct: apply };
  },
});
