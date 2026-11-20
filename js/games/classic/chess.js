import { classic, other, layout, turnText } from './kit.js';

// กระดาน board[r][c] r=0 คือแถวบนสุดของฝั่งดำ ตัวหมาก 'wP','bK' ฯลฯ (w = ผู้เล่น a, b = ผู้เล่น b)
export function newState() {
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  back.forEach((p, c) => { board[0][c] = `b${p}`; board[7][c] = `w${p}`; board[1][c] = 'bP'; board[6][c] = 'wP'; });
  return { board, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, half: 0 };
}

const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const col = (p) => p[0];
const opp = (w) => (w === 'w' ? 'b' : 'w');

export function attacked(board, r, c, by) {
  const pd = by === 'w' ? 1 : -1; // ศัตรูที่เป็นเบี้ยโจมตีมาจากแถว r+pd
  for (const dc of [-1, 1]) if (inb(r + pd, c + dc) && board[r + pd][c + dc] === `${by}P`) return true;
  for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (inb(r + dr, c + dc) && board[r + dr][c + dc] === `${by}N`) return true;
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (inb(r + dr, c + dc) && board[r + dr][c + dc] === `${by}K`) return true;
    const diag = dr !== 0 && dc !== 0;
    let rr = r + dr; let cc = c + dc;
    while (inb(rr, cc)) {
      const p = board[rr][cc];
      if (p) { if (col(p) === by && (p[1] === 'Q' || p[1] === (diag ? 'B' : 'R'))) return true; break; }
      rr += dr; cc += dc;
    }
  }
  return false;
}

function findKing(board, w) {
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) if (board[r][c] === `${w}K`) return [r, c];
  return null;
}
export function inCheck(board, w) {
  const k = findKing(board, w);
  return k ? attacked(board, k[0], k[1], opp(w)) : false;
}

function pseudo(st, r, c) {
  const { board, castle, ep } = st;
  const p = board[r][c];
  const w = col(p);
  const t = p[1];
  const out = [];
  const add = (rr, cc, extra = {}) => out.push({ from: [r, c], to: [rr, cc], ...extra });
  if (t === 'P') {
    const d = w === 'w' ? -1 : 1;
    const start = w === 'w' ? 6 : 1;
    const last = w === 'w' ? 0 : 7;
    const push = (rr, cc, x) => { if (rr === last) add(rr, cc, { promo: 'Q', ...x }); else add(rr, cc, x); };
    if (inb(r + d, c) && !board[r + d][c]) {
      push(r + d, c, {});
      if (r === start && !board[r + 2 * d][c]) add(r + 2 * d, c, { dbl: true });
    }
    for (const dc of [-1, 1]) {
      if (!inb(r + d, c + dc)) continue;
      const q = board[r + d][c + dc];
      if (q && col(q) !== w) push(r + d, c + dc, {});
      else if (ep && ep[0] === r + d && ep[1] === c + dc) add(r + d, c + dc, { enpassant: true });
    }
  } else if (t === 'N') {
    for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
      if (inb(r + dr, c + dc) && (!board[r + dr][c + dc] || col(board[r + dr][c + dc]) !== w)) add(r + dr, c + dc);
    }
  } else if (t === 'K') {
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inb(r + dr, c + dc) && (!board[r + dr][c + dc] || col(board[r + dr][c + dc]) !== w)) add(r + dr, c + dc);
    }
    const row = w === 'w' ? 7 : 0;
    if (r === row && c === 4 && !attacked(board, row, 4, opp(w))) {
      if (castle[`${w}K`] && !board[row][5] && !board[row][6] && board[row][7] === `${w}R` && !attacked(board, row, 5, opp(w)) && !attacked(board, row, 6, opp(w))) add(row, 6, { castle: 'K' });
      if (castle[`${w}Q`] && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0] === `${w}R` && !attacked(board, row, 3, opp(w)) && !attacked(board, row, 2, opp(w))) add(row, 2, { castle: 'Q' });
    }
  } else {
    const dirs = t === 'B' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === 'R' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dr, dc] of dirs) {
      let rr = r + dr; let cc = c + dc;
      while (inb(rr, cc)) {
        const q = board[rr][cc];
        if (!q) add(rr, cc);
        else { if (col(q) !== w) add(rr, cc); break; }
        rr += dr; cc += dc;
      }
    }
  }
  return out;
}

// เดินจริงบนสำเนาของ state คืน state ใหม่
export function apply(st, mv) {
  const board = st.board.map((row) => row.slice());
  const [fr, fc] = mv.from;
  const [tr, tc] = mv.to;
  const p = board[fr][fc];
  const w = col(p);
  const captured = Boolean(board[tr][tc]) || Boolean(mv.enpassant);
  board[fr][fc] = null;
  if (mv.enpassant) board[fr][tc] = null;
  board[tr][tc] = mv.promo ? `${w}${mv.promo}` : p;
  if (mv.castle === 'K') { board[tr][5] = board[tr][7]; board[tr][7] = null; }
  if (mv.castle === 'Q') { board[tr][3] = board[tr][0]; board[tr][0] = null; }
  const castle = { ...st.castle };
  if (p[1] === 'K') { castle[`${w}K`] = false; castle[`${w}Q`] = false; }
  const touch = (r, c) => {
    if (r === 7 && c === 0) castle.wQ = false;
    if (r === 7 && c === 7) castle.wK = false;
    if (r === 0 && c === 0) castle.bQ = false;
    if (r === 0 && c === 7) castle.bK = false;
  };
  touch(fr, fc); touch(tr, tc);
  // นับตาเดินที่ไม่มีการเดินเบี้ยหรือกินหมาก (กติกา 50 ตา)
  const half = p[1] === 'P' || captured ? 0 : (st.half || 0) + 1;
  return { board, turn: opp(st.turn), castle, ep: mv.dbl ? [(fr + tr) / 2, fc] : null, half };
}

export function legalMoves(st) {
  const out = [];
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) {
    const p = st.board[r][c];
    if (!p || col(p) !== st.turn) continue;
    for (const mv of pseudo(st, r, c)) {
      const next = apply(st, mv);
      if (!inCheck(next.board, st.turn)) out.push(mv);
    }
  }
  return out;
}

// ใช้รูปหมากแบบทึบทั้งสองฝ่ายแล้วเปลี่ยนสีด้วย CSS + \uFE0E กัน iPhone แสดงเบี้ยเป็นอีโมจิ
const SOLID = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const GLYPH = Object.fromEntries(['w', 'b'].flatMap((w) => Object.entries(SOLID).map(([t, g]) => [`${w}${t}`, `${g}\uFE0E`])));
const NAME = { K: 'ขุน', Q: 'ราชินี', R: 'เรือ', B: 'บิชอป', N: 'ม้า', P: 'เบี้ย' };

// หมากเหลือไม่พอให้รุกจน: ขุนเปล่า, ขุน+ม้า, ขุน+บิชอป, หรือบิชอปทั้งหมดอยู่ช่องสีเดียวกัน
export function insufficient(board) {
  const rest = [];
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) {
    const p = board[r][c];
    if (p && p[1] !== 'K') rest.push({ t: p[1], sq: (r + c) % 2 });
  }
  if (!rest.length) return true;
  if (rest.length === 1 && (rest[0].t === 'N' || rest[0].t === 'B')) return true;
  return rest.every((x) => x.t === 'B') && rest.every((x) => x.sq === rest[0].sq);
}
// ตำแหน่งเดียวกัน (ไว้นับซ้ำ 3 ครั้ง)
export const posKey = (st) => `${st.board.map((row) => row.map((p) => p || '.').join('')).join('/')}|${st.turn}|${Object.values(st.castle).join('')}|${st.ep || ''}`;

export const chess = classic({
  id: 'chess',
  title: 'หมากรุก',
  desc: 'หมากรุกสากลเต็มกติกา (รุกจน เข้าป้อม จับเบี้ยผ่าน เบี้ยเลื่อนขั้นเป็นราชินี เสมอเมื่อหมากไม่พอ ซ้ำ 3 ครั้ง หรือครบ 50 ตา) คนที่ชวนเป็นฝ่ายขาว',
  create({ el, role, send, end, partnerName }) {
    let st = newState();
    let over = false;
    let sel = null;
    let moves = [];
    const mine = role === 'a' ? 'w' : 'b';
    const L = layout(el, { board: '<div class="ch-grid"></div>' });
    const grid = L.board.firstChild;
    const flip = role === 'b';
    const at = (i) => { const r = Math.floor(i / 8); const c = i % 8; return flip ? [7 - r, 7 - c] : [r, c]; };
    let lastMove = null;
    const seen = new Map([[posKey(st), 1]]);

    function status() {
      if (over) { L.status(''); return; }
      const chk = inCheck(st.board, st.turn) ? ' · รุก!' : '';
      L.status(`${turnText(st.turn === 'w' ? 'a' : 'b', role, partnerName)} (คุณคือฝ่าย${mine === 'w' ? 'ขาว' : 'ดำ'})${chk}`);
    }
    function draw() {
      const canMove = !over && st.turn === mine;
      const all = canMove ? legalMoves(st) : [];
      const movable = new Set(all.map((m) => m.from.join(',')));
      const dests = new Set(moves.map((m) => m.to.join(',')));
      let h = '';
      for (let i = 0; i < 64; i += 1) {
        const [r, c] = at(i);
        const p = st.board[r][c];
        const key = `${r},${c}`;
        const isLast = lastMove && (lastMove.from.join(',') === key || lastMove.to.join(',') === key);
        h += `<button class="ch-cell ${(r + c) % 2 ? 'dk' : 'lt'} ${sel && sel.join(',') === key ? 'sel' : ''} ${dests.has(key) ? 'dest' : ''} ${isLast ? 'last' : ''}" data-r="${r}" data-c="${c}" type="button" aria-label="${p ? `${col(p) === 'w' ? 'ขาว' : 'ดำ'} ${NAME[p[1]]}` : 'ว่าง'} ${'abcdefgh'[c]}${8 - r}" ${canMove && (movable.has(key) || dests.has(key)) ? '' : 'disabled'}>${p ? `<span class="ch-p ${col(p)}">${GLYPH[p]}</span>` : ''}</button>`;
      }
      grid.innerHTML = h;
      status();
    }
    function doMove(a) {
      if (over || !a.f || !a.t) return;
      const mv = legalMoves(st).find((m) => m.from[0] === a.f[0] && m.from[1] === a.f[1] && m.to[0] === a.t[0] && m.to[1] === a.t[1]);
      if (!mv || (st.turn === 'w' ? 'a' : 'b') !== a.by) return;
      st = apply(st, mv);
      lastMove = mv;
      sel = null; moves = [];
      const key = posKey(st);
      seen.set(key, (seen.get(key) || 0) + 1);
      let res = null;
      if (!legalMoves(st).length) {
        res = inCheck(st.board, st.turn)
          ? { winner: st.turn === 'w' ? 'b' : 'a', text: undefined }
          : { winner: 'draw', text: 'เสมอ (อับ: ไม่มีทางเดินแต่ไม่โดนรุก)' };
      } else if (insufficient(st.board)) res = { winner: 'draw', text: 'เสมอ (หมากเหลือไม่พอรุกจน)' };
      else if (seen.get(key) >= 3) res = { winner: 'draw', text: 'เสมอ (ตำแหน่งเดิมซ้ำ 3 ครั้ง)' };
      else if (st.half >= 100) res = { winner: 'draw', text: 'เสมอ (ครบ 50 ตาโดยไม่มีการกินหรือเดินเบี้ย)' };
      if (res) {
        over = true;
        draw();
        end(res);
        return;
      }
      draw();
    }
    grid.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-r]');
      if (!c || over || st.turn !== mine) return;
      const r = Number(c.dataset.r); const cc = Number(c.dataset.c);
      const hit = moves.find((m) => m.to[0] === r && m.to[1] === cc);
      if (hit) { const a = { f: hit.from, t: hit.to, by: role }; send(a); doMove(a); return; }
      sel = [r, cc];
      moves = legalMoves(st).filter((m) => m.from[0] === r && m.from[1] === cc);
      draw();
    });
    draw();
    return { onAct: doMove };
  },
});
