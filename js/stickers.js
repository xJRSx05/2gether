// สติกเกอร์แมว: ส่งในแชทเป็นข้อความรหัส [sticker:id] (ไม่ต้องแก้ฐานข้อมูล)
// วาดจากแมวชิบิสีเดียวกับแมวของบ้าน + ของประกอบแต่ละท่า
import { catSvg } from './cat.js';

export const STICKERS = [
  { id: 'love', label: 'รักนะ', pose: 'happy' },
  { id: 'miss', label: 'คิดถึง', pose: 'idle' },
  { id: 'happy', label: 'ดีใจ', pose: 'happy' },
  { id: 'hungry', label: 'หิวแล้ว', pose: 'idle' },
  { id: 'sleepy', label: 'ง่วงจัง', pose: 'sleep' },
  { id: 'sulk', label: 'งอนแล้ว', pose: 'sleep' },
  { id: 'sorry', label: 'ขอโทษนะ', pose: 'sleep' },
  { id: 'night', label: 'ฝันดี', pose: 'sleep' },
];
const BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
const RE = /^\[sticker:([a-z]+)\]$/;

export const stickerCode = (id) => `[sticker:${id}]`;
export const stickerOf = (body) => {
  const m = RE.exec(String(body || '').trim());
  return m && BY_ID[m[1]] ? BY_ID[m[1]] : null;
};
// ข้อความสั้นสำหรับแสดงนอกหน้าแชท (กรอบคำพูดในห้อง แถบข้อความบนฉาก)
export const msgPreview = (body) => {
  const s = stickerOf(body);
  return s ? `ส่งสติกเกอร์ "${s.label}"` : body;
};

const H = 'M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z';
const heart = (x, y, s, c = '#F2617F', o = 1) => `<path d="${H}" transform="translate(${x} ${y}) scale(${s})" fill="${c}" opacity="${o}" stroke="#2B2024" stroke-width="${1.6 / s}"/>`;
const PROPS = {
  love: heart(98, 6, 1.5) + heart(124, 36, 0.8, '#FF9BB5'),
  miss: heart(100, 18, 0.9, '#FF9BB5', 0.9) + heart(118, 4, 0.7, '#F2617F', 0.8) + '<path d="M104 52 q6 -8 12 0" fill="none" stroke="#2B2024" stroke-width="2" stroke-linecap="round"/>',
  happy: '<g fill="#FFD45C" stroke="#2B2024" stroke-width="1.6" stroke-linejoin="round"><path d="M112 14 l4 9 9 2 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -2z"/><path d="M14 30 l2.5 5 5 1 -4 3.5 1 5 -4.5 -3 -4.5 3 1 -5 -4 -3.5 5 -1z"/></g>',
  hungry: '<g stroke="#2B2024" stroke-width="2" stroke-linejoin="round"><path d="M96 104 h40 a20 12 0 0 1 -40 0z" fill="#8FB3E0"/><path d="M104 96 c6 -8 18 -8 24 0 l6 -5 v12 l-6 -5 c-6 8 -18 8 -24 0z" fill="#F4B26E"/></g><text x="118" y="38" font-size="26" font-family="Itim, sans-serif" fill="#E8508A" stroke="#2B2024" stroke-width="1">!</text>',
  sleepy: '<text x="100" y="34" font-size="22" font-family="Itim, sans-serif" fill="#7EA6E0" stroke="#2B2024" stroke-width=".8">z</text><text x="114" y="20" font-size="28" font-family="Itim, sans-serif" fill="#7EA6E0" stroke="#2B2024" stroke-width=".8">Z</text>',
  sulk: '<path d="M106 20 q6 -2 6 6 M118 14 q2 6 8 6 M108 34 q6 2 6 -4 M122 32 q-2 -6 4 -8" fill="none" stroke="#E8508A" stroke-width="3.2" stroke-linecap="round"/><path d="M8 64 q8 -8 18 -2" fill="none" stroke="#2B2024" stroke-width="2" stroke-linecap="round"/>',
  sorry: '<path d="M112 26 q-8 12 0 16 q8 -4 0 -16z" fill="#8FD3F0" stroke="#2B2024" stroke-width="1.8"/><path d="M96 58 q4 -4 8 0 M104 64 q4 -4 8 0" fill="none" stroke="#2B2024" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>',
  night: '<path d="M120 10 a16 16 0 1 0 10 28 a12 12 0 1 1 -10 -28z" fill="#FFE08A" stroke="#2B2024" stroke-width="1.8"/><g fill="#FFE08A" stroke="#2B2024" stroke-width="1.2"><path d="M98 12 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1z"/><path d="M14 22 l1.6 3 3 .8 -2.4 2 .8 3 -3 -1.6 -3 1.6 .8 -3 -2.4 -2 3 -.8z"/></g>',
};

export function stickerSvg(id, catColor) {
  const s = BY_ID[id] || STICKERS[0];
  const cat = catSvg(catColor).replace('<svg class="cat chibi"', '<svg class="cat chibi" x="10" y="8" width="112" height="116"');
  return `<span class="sticker pose-${s.pose}" role="img" aria-label="สติกเกอร์ ${s.label}"><svg viewBox="0 0 150 132">${cat}${PROPS[s.id] || ''}</svg><span class="sticker-cap">${s.label}</span></span>`;
}
