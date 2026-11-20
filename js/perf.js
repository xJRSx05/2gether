// โหมดประหยัด: ปิดเอฟเฟกต์พื้นหลัง ลดอนุภาค ลดเงาและเบลอ ให้เครื่องแรงน้อยลื่นขึ้น
// ค่า: 'auto' (เปิดเองถ้าเครื่องแรงน้อย) | 'on' | 'off' เก็บเฉพาะเครื่องนี้
const KEY = '2gether.lite';

export function liteSetting() {
  try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; }
}

// เครื่องแรงน้อย: CPU ไม่เกิน 4 คอร์ หรือ RAM ไม่เกิน 4GB หรือเปิดโหมดประหยัดเน็ต
export function weakDevice() {
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 4 || Boolean(navigator.connection?.saveData);
}

export function isLite() {
  const v = liteSetting();
  return v === 'on' || (v === 'auto' && weakDevice());
}

export function setLite(v) {
  try { localStorage.setItem(KEY, v); } catch { /* ไม่เป็นไร */ }
  applyLite();
}

export function applyLite() {
  const on = isLite();
  document.documentElement.classList.toggle('lite', on);
  window.dispatchEvent(new CustomEvent('2gether:lite', { detail: on }));
  return on;
}
