// ชุดเครื่องมือกลางของเกมคลาสสิก (ไม่แตะ DOM นอกที่ได้รับมา เพื่อให้ทดสอบ logic ด้วย node ได้)
export const other = (r) => (r === 'a' ? 'b' : 'a');

// ใครเดินก่อน: สุ่มจาก seed เดียวกันทั้งสองเครื่อง
export const firstTurn = (seed) => (seed % 2 === 0 ? 'a' : 'b');

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// โครงหน้าเกม: บรรทัดสถานะ + กระดาน + ส่วนเสริม
export function layout(el, { board = '', extra = '' } = {}) {
  el.innerHTML = `<div class="cl"><p class="cl-status" aria-live="polite"></p><div class="cl-board">${board}</div><div class="cl-extra">${extra}</div></div>`;
  const q = (s) => el.querySelector(s);
  return {
    status: (t) => { q('.cl-status').textContent = t; },
    board: q('.cl-board'),
    extra: q('.cl-extra'),
  };
}

export const turnText = (turn, role, name) => (turn === role ? 'ตาของคุณ' : `ตาของ ${name}`);

// ข้อมูลที่ทุกเกมคลาสสิกต้องมี
export const classic = (meta) => ({ classic: true, seconds: 0, stars: [1, 1, 1], ...meta });
