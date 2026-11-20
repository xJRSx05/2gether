// เครื่องมือกลางของเกม: สุ่มแบบกำหนด seed (สองเครื่องได้ผลเหมือนกัน) และ HTML ปุ่มแตะ
export function rand(seed, i) {
  let a = (seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
export const pick = (list, seed, i) => list[Math.floor(rand(seed, i) * list.length)];
