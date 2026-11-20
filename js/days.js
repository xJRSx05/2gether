// วันนับตามเวลาไทย (ตรงกับฐานข้อมูลที่นับวันตาม Asia/Bangkok)
const bkkToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());

// วันที่ N ของการอยู่ด้วยกัน (วันเริ่มคบ = วันที่ 1) หรือ null ถ้ายังไม่ตั้ง/ยังไม่ถึงวัน
export function dayNumber(startDate) {
  if (!startDate) return null;
  const diff = Math.round((Date.parse(bkkToday()) - Date.parse(startDate)) / 86400000) + 1;
  return diff >= 1 ? diff : null;
}

// วันครบ 100, 200, 300 วัน และทุกครบปี (365, 730, ...)
export const isMilestone = (n) => n === 100 || n === 200 || n === 300 || (n > 0 && n % 365 === 0);

export const todayIso = bkkToday;

// ช่วงเวลาของวันตามเวลาไทย ใช้ทำแสงในห้อง
const bkkHourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: 'numeric', hourCycle: 'h23' });
export function timeOfDay(d = new Date()) {
  const h = Number(bkkHourFmt.format(d));
  if (h >= 6 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'evening';
  return 'night';
}
// ปิด/เปิดแสงตามเวลา (ตั้งค่าเฉพาะเครื่องนี้)
export const timeLightOn = () => { try { return localStorage.getItem('2gether.timelight') !== 'off'; } catch { return true; } };
export function setTimeLight(on) {
  try { localStorage.setItem('2gether.timelight', on ? 'on' : 'off'); } catch { /* ไม่เป็นไร */ }
  window.dispatchEvent(new Event('timelight'));
}
