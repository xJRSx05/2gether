import { sb } from './supabase.js';
import { rand } from './games/util.js';

// ของสะสม: ปลา (ตู้ปลาในสวน) และดอกไม้ (สวน) r = ความหายาก 0 ธรรมดา 1 หายาก 2 หายากมาก
export const SPECIES = {
  fish: [
    { id: 'sprat', icon: '🐟', name: 'ปลาซิว', r: 0 },
    { id: 'clown', icon: '🐠', name: 'ปลาการ์ตูน', r: 0 },
    { id: 'puffer', icon: '🐡', name: 'ปลาปักเป้า', r: 0 },
    { id: 'crab', icon: '🦀', name: 'ปูน้อย', r: 0 },
    { id: 'shell', icon: '🐚', name: 'หอยสังข์', r: 0 },
    { id: 'shrimp', icon: '🦐', name: 'กุ้งแก้ว', r: 0 },
    { id: 'squid', icon: '🦑', name: 'หมึกกล้วย', r: 1 },
    { id: 'octo', icon: '🐙', name: 'ปลาหมึกยักษ์', r: 1 },
    { id: 'lobster', icon: '🦞', name: 'กุ้งมังกร', r: 1 },
    { id: 'dolphin', icon: '🐬', name: 'โลมา', r: 1 },
    { id: 'whale', icon: '🐳', name: 'วาฬน้อย', r: 2 },
    { id: 'shark', icon: '🦈', name: 'ฉลามหนู', r: 2 },
  ],
  star: [
    { id: 'north', icon: '⭐', name: 'ดาวเหนือ', r: 0 },
    { id: 'bright', icon: '🌟', name: 'ดาวสว่าง', r: 0 },
    { id: 'twinkle', icon: '✨', name: 'ดาวระยิบ', r: 0 },
    { id: 'spin', icon: '💫', name: 'ดาวหมุน', r: 0 },
    { id: 'crescent', icon: '🌙', name: 'เสี้ยวจันทร์', r: 0 },
    { id: 'drift', icon: '🌑', name: 'จันทร์เคียงคืน', r: 0 },
    { id: 'shoot', icon: '🌠', name: 'ดาวตก', r: 1 },
    { id: 'saturn', icon: '🪐', name: 'ดาวเสาร์', r: 1 },
    { id: 'comet', icon: '☄️', name: 'ดาวหาง', r: 1 },
    { id: 'full', icon: '🌕', name: 'พระจันทร์เต็มดวง', r: 1 },
    { id: 'galaxy', icon: '🌌', name: 'ทางช้างเผือก', r: 2 },
    { id: 'sun', icon: '🌞', name: 'ตะวันเที่ยงคืน', r: 2 },
  ],
  flower: [
    { id: 'daisy', icon: '🌼', name: 'เดซี่', r: 0 },
    { id: 'tulip', icon: '🌷', name: 'ทิวลิป', r: 0 },
    { id: 'sakura', icon: '🌸', name: 'ซากุระ', r: 0 },
    { id: 'sun', icon: '🌻', name: 'ทานตะวัน', r: 0 },
    { id: 'hibiscus', icon: '🌺', name: 'ชบา', r: 0 },
    { id: 'white', icon: '💮', name: 'ดอกขาว', r: 0 },
    { id: 'rose', icon: '🌹', name: 'กุหลาบ', r: 1 },
    { id: 'lavender', icon: '🪻', name: 'ลาเวนเดอร์', r: 1 },
    { id: 'lotus', icon: '🪷', name: 'บัว', r: 1 },
    { id: 'marigold', icon: '🏵️', name: 'ดาวเรือง', r: 1 },
    { id: 'bouquet', icon: '💐', name: 'ช่อดอกไม้', r: 2 },
    { id: 'clover', icon: '🍀', name: 'โคลเวอร์สี่แฉก', r: 2 },
  ],
};

export const speciesInfo = (kind, id) => SPECIES[kind]?.find((s) => s.id === id) || null;

// สุ่มชนิดจาก seed (สองเครื่องได้ตรงกัน) i = ลำดับของชิ้นนั้น
export function pickSpecies(kind, seed, i) {
  const roll = rand(seed, 5000 + i);
  const r = roll < 0.05 ? 2 : roll < 0.3 ? 1 : 0;
  const pool = SPECIES[kind].filter((s) => s.r === r);
  return pool[Math.floor(rand(seed, 7000 + i) * pool.length)].id;
}

// นับของที่สะสมได้ทั้งหมด คืน null ถ้ายังไม่ได้รัน schema-final.sql
export async function loadCollection() {
  const { data, error } = await sb.from('collection_items').select('kind, species').limit(5000);
  if (error) return null;
  const out = { fish: {}, flower: {}, star: {} };
  for (const r of data) if (out[r.kind]) out[r.kind][r.species] = (out[r.kind][r.species] || 0) + 1;
  return out;
}
