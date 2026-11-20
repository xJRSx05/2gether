import { classic, other, layout, turnText } from './kit.js';

// พิกัดจริง: a อยู่ล่าง (แถว 5-7) เดินขึ้น b อยู่บน (แถว 0-2) เดินลง ตัวพิมพ์ใหญ่ = ฮอส (king)
export function newBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) {
    if ((r + c) % 2 === 1) { if (r < 3) b[r][c] = 'b'; else if (r > 4) b[r][c] = 'a'; }
  }
  return b;
}
const owner = (p) => (p ? p.toLowerCase() : null);
const isKing = (p) => p === 'A' || p === 'B';
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const dirsOf = (p) => {
  const fwd = owner(p) === 'a' ? -1 : 1;
  return isKing(p) ? [[1, -1], [1, 1], [-1, -1], [-1, 1]] : [[fwd, -1], [fwd, 1]];
};

const DIAG = [[1, -1], [1, 1], [-1, -1], [-1, 1]];

// ลำดับการกินต่อเนื่องทั้งหมดของหมากที่ (r,c): คืน [{path:[[r,c]...], caps:[[r,c]...]}]
// เบี้ย: กินได้เฉพาะข้างหน้า กระโดดข้าม 1 ตัวลงช่องถัดไป ถึงแถวสุดท้ายกลายเป็นฮอสแล้วจบตา
// ฮอส (กติกาไทย): มองไปตามแนวทแยงไกลแค่ไหนก็ได้ เจอหมากฝ่ายตรงข้ามตัวแรก ต้องลงช่องที่อยู่ถัดจากตัวนั้นพอดี
function jumps(b, r, c) {
  const p = b[r][c];
  const res = [];
  const walk = (cr, cc, path, caps, board, king) => {
    let any = false;
    const ds = king ? DIAG : dirsOf(p);
    for (const [dr, dc] of ds) {
      let mr = cr + dr; let mc = cc + dc;
      if (king) while (inb(mr, mc) && !board[mr][mc]) { mr += dr; mc += dc; }
      const lr = mr + dr; const lc = mc + dc;
      if (!inb(mr, mc) || !inb(lr, lc)) continue;
      const mid = board[mr][mc];
      if (mid && owner(mid) !== owner(p) && !board[lr][lc]) {
        any = true;
        const nb = board.map((row) => row.slice());
        nb[mr][mc] = null;
        const crown = !king && ((owner(p) === 'a' && lr === 0) || (owner(p) === 'b' && lr === 7));
        if (crown) res.push({ path: [...path, [lr, lc]], caps: [...caps, [mr, mc]] });
        else walk(lr, lc, [...path, [lr, lc]], [...caps, [mr, mc]], nb, king);
      }
    }
    if (!any && path.length > 1) res.push({ path, caps });
  };
  const nb0 = b.map((row) => row.slice());
  nb0[r][c] = null; // ตัวที่เดินออกจากช่องเดิมแล้ว
  walk(r, c, [[r, c]], [], nb0, isKing(p));
  return res;
}

export function legal(b, who) {
  const caps = [];
  const steps = [];
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) {
    const p = b[r][c];
    if (owner(p) !== who) continue;
    caps.push(...jumps(b, r, c));
    for (const [dr, dc] of dirsOf(p)) {
      let tr = r + dr; let tc = c + dc;
      // ฮอสเดินแนวทแยงได้ยาวจนกว่าจะเจอหมากหรือขอบกระดาน
      while (inb(tr, tc) && !b[tr][tc]) {
        steps.push({ path: [[r, c], [tr, tc]], caps: [] });
        if (!isKing(p)) break;
        tr += dr; tc += dc;
      }
    }
  }
  return caps.length ? caps : steps; // ต้องกินถ้ากินได้
}

export function play(b, mv) {
  const [sr, sc] = mv.path[0];
  const [er, ec] = mv.path[mv.path.length - 1];
  let p = b[sr][sc];
  b[sr][sc] = null;
  mv.caps.forEach(([r, c]) => { b[r][c] = null; });
  if (p === 'a' && er === 0) p = 'A';
  if (p === 'b' && er === 7) p = 'B';
  b[er][ec] = p;
}

export const checkers = classic({
  id: 'checkers',
  title: 'หมากฮอส',
  desc: 'เดินเฉียงและกระโดดข้ามกินหมากอีกฝ่าย ถ้ากินได้ต้องกิน ถึงขอบสุดกลายเป็นฮอส ฮอสเดินเฉียงได้ยาวไม่จำกัดช่อง ใครหมดตาเดินแพ้',
  create({ el, role, send, end, partnerName }) {
    const b = newBoard();
    let turn = 'a';
    let over = false;
    let sel = null;
    let options = [];
    const L = layout(el, { board: '<div class="ck-grid"></div>' });
    const grid = L.board.firstChild;
    const flip = role === 'b';
    const at = (i) => { const r = Math.floor(i / 8); const c = i % 8; return flip ? [7 - r, 7 - c] : [r, c]; };

    function draw() {
      const mine = turn === role && !over ? legal(b, role) : [];
      const movable = new Set(mine.map((m) => m.path[0].join(',')));
      const dests = new Set(options.map((m) => m.path[m.path.length - 1].join(',')));
      let h = '';
      for (let i = 0; i < 64; i += 1) {
        const [r, c] = at(i);
        const dark = (r + c) % 2 === 1;
        const p = b[r][c];
        const key = `${r},${c}`;
        const can = dark && (dests.has(key) || (!sel && movable.has(key)) || (sel && movable.has(key)));
        h += `<button class="ck-cell ${dark ? 'dk' : 'lt'} ${sel && sel[0] === r && sel[1] === c ? 'sel' : ''} ${dests.has(key) ? 'dest' : ''}" data-r="${r}" data-c="${c}" type="button" aria-label="แถว ${r + 1} หลัก ${c + 1}" ${can ? '' : 'disabled'}>${p ? `<i class="ck-p ${owner(p) === 'a' ? 'red' : 'blk'} ${isKing(p) ? 'king' : ''}"></i>` : ''}</button>`;
      }
      grid.innerHTML = h;
      L.status(over ? '' : `${turnText(turn, role, partnerName)} (คุณคือหมาก${role === 'a' ? 'แดง' : 'ดำ'})`);
    }
    function apply(a) {
      if (over || a.by !== turn) return;
      const ok = legal(b, turn).find((m) => JSON.stringify(m.path) === JSON.stringify(a.path));
      if (!ok) return;
      play(b, ok);
      sel = null; options = [];
      turn = other(turn);
      if (!legal(b, turn).length) { over = true; draw(); end({ winner: other(turn) }); return; }
      draw();
    }
    grid.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-r]');
      if (!c || turn !== role || over) return;
      const r = Number(c.dataset.r); const cc = Number(c.dataset.c);
      const hit = options.find((m) => { const e = m.path[m.path.length - 1]; return e[0] === r && e[1] === cc; });
      if (hit) { const a = { path: hit.path, by: role }; send(a); apply(a); return; }
      const all = legal(b, role).filter((m) => m.path[0][0] === r && m.path[0][1] === cc);
      sel = all.length ? [r, cc] : null;
      options = all;
      draw();
    });
    draw();
    return { onAct: apply };
  },
});
