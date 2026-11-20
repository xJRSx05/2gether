// ตัวละครชิบิ: วาดเป็น SVG จากค่าที่เลือก (ปรับได้ไม่จำกัดโดยไม่ต้องมีไฟล์ภาพ)
// ค่าทั้งหมดเก็บใน profiles.avatar (jsonb) ตัวละครเก่าที่มีแค่ hair/hairColor/skin/top/acc ใช้ต่อได้เลย
export const HAIR_STYLES = ['สั้น', 'บ็อบ', 'ยาว', 'หางม้า', 'มวย', 'หยิก', 'ดังโงะ', 'ยาวลอน', 'ชี้ฟู', 'แสกข้าง', 'หน้าม้าเต่อ', 'ถักเปีย',
  'รองทรง', 'อันเดอร์คัต', 'ผมตั้ง', 'มัดจุก', 'หน้าม้าเกาหลี', 'หยิกสั้น', 'ทวินเทล', 'ฮิเมะ', 'บ็อบสั้น', 'มวยต่ำ', 'ยาวแสกกลาง', 'เปียข้างเดียว',
  'เกรียน', 'เสยหลัง', 'ม็อบฟู', 'แสกกลาง', 'วูล์ฟคัต', 'มัดครึ่งหัว'];
// ทรงที่เอาออกแล้ว: ตัวละครที่เคยใช้จะถูกเปลี่ยนเป็นทรงใกล้เคียง
const FEM_HAIR = new Set([1, 2, 3, 4, 6, 7, 11, 18, 19, 20, 21, 22, 23]);
const HAIR_RETIRED = { 5: 26, 8: 28, 9: 25, 10: 1, 13: 25, 14: 25, 17: 26 };
// ลำดับที่แสดงในหน้าแต่งตัว (ชายก่อน แล้วหญิง)
export const HAIR_ORDER = [0, 12, 24, 25, 26, 27, 28, 29, 15, 16, 1, 20, 2, 22, 19, 3, 4, 21, 6, 18, 7, 11, 23];
export const BODIES = ['m', 'f'];
export const BODY_LABEL = { m: 'ชาย', f: 'หญิง' };
// ชุดตั้งต้นตอนกดเลือกแบบตัว (เลือกต่อเองได้ทุกอย่าง ไม่ล็อกตามเพศ)
export const BODY_PRESET = {
  m: { hair: 12, topStyle: 'tee', bottom: 'pants', accHead: 'none' },
  f: { hair: 22, topStyle: 'tee', bottom: 'skirt', accHead: 'clip' },
};
export const HAIR_COUNT = HAIR_STYLES.length;
export const HAIR_COLORS = ['#2B2118', '#5A3A22', '#8A5A2B', '#C9953A', '#E8C872', '#B33A3A', '#6B4FA0', '#8FA3B8', '#F2A2BE', '#86CDB8', '#D6D9E0', '#5C8BD6'];
export const SKINS = ['#FBE0CC', '#F2C9A5', '#E3AE82', '#C98B5E', '#9C6440', '#6E4329'];
export const EYES = ['round', 'sparkle', 'smile', 'sleepy', 'wink'];
export const EYE_LABEL = { round: 'กลม', sparkle: 'วิบวับ', smile: 'ยิ้ม', sleepy: 'ง่วง', wink: 'ขยิบตา' };
export const TOP_STYLES = ['tee', 'hoodie', 'sweater', 'shirt', 'dress', 'suit', 'jacket', 'stripe', 'cardigan', 'uniform',
  'polo', 'plaid', 'baseball', 'hawaii', 'vest', 'crop', 'offshoulder', 'blouse', 'floral', 'pinafore',
  'catpj', 'thai', 'groom', 'bride', 'yukata', 'couple'];
export const TOP_LABEL = {
  tee: 'เสื้อยืด', hoodie: 'ฮู้ด', sweater: 'สเวตเตอร์', shirt: 'เชิ้ต', dress: 'เดรส', suit: 'สูท', jacket: 'แจ็กเก็ต', stripe: 'ลายทาง', cardigan: 'คาร์ดิแกน', uniform: 'ชุดนักเรียน',
  polo: 'โปโล', plaid: 'เชิ้ตสก็อต', baseball: 'เสื้อเบสบอล', hawaii: 'เสื้อฮาวาย', vest: 'เสื้อกั๊ก',
  crop: 'เสื้อครอป', offshoulder: 'เสื้อปาดไหล่', blouse: 'เบลาส์ผูกโบว์', floral: 'เดรสลายดอก', pinafore: 'เอี๊ยมกระโปรง',
  catpj: 'ชุดนอนลายแมว', thai: 'ชุดไทย', groom: 'ชุดเจ้าบ่าว', bride: 'ชุดเจ้าสาว', yukata: 'ยูกาตะ', couple: 'เสื้อคู่ (Bond Lv.10)',
};
// ชุดที่คลุมถึงขา (ไม่ต้องใส่ท่อนล่าง) และชุดทั้งตัวที่มีกางเกงในตัว
const DRESSY = new Set(['dress', 'floral', 'pinafore', 'thai', 'bride', 'yukata']);
const FULL_PANTS = { catpj: null, groom: '#2E2A30' };
export const isFullOutfit = (t) => DRESSY.has(t) || t in FULL_PANTS;
export const TOPS = ['#E8893A', '#E0607E', '#6FB6DC', '#7C4DDB', '#5FA777', '#F2C94C', '#3B4256', '#F5F0E6', '#F4B6C2', '#A8D5BA', '#C9A27E', '#8FB3E0'];
export const BOTTOM_STYLES = ['pants', 'shorts', 'skirt', 'overalls', 'cargo', 'ripped', 'pleated', 'longskirt'];
export const BOTTOM_LABEL = { pants: 'ขายาว', shorts: 'ขาสั้น', skirt: 'กระโปรง', overalls: 'เอี๊ยม', cargo: 'คาร์โก', ripped: 'ยีนส์ขาด', pleated: 'กระโปรงพลีท', longskirt: 'กระโปรงยาว' };
export const BOTTOMS = ['#3B4256', '#5A6E9A', '#8A6A4E', '#2E2A30', '#E8D8C0', '#B8475A'];
// ของใส่ 3 ช่อง ใส่พร้อมกันได้
export const ACC_HEAD = ['none', 'beanie', 'headband', 'catears', 'flower', 'bow', 'cap', 'headphones', 'sunhat', 'crown', 'bunny', 'clip'];
export const ACC_FACE = ['none', 'glasses', 'sunglasses', 'bandaid', 'earrings'];
export const ACC_NECK = ['none', 'scarf', 'necktie', 'bowtie', 'necklace'];
export const ACC_LABEL = {
  none: 'ไม่ใส่', glasses: 'แว่น', beanie: 'หมวกไหมพรม', scarf: 'ผ้าพันคอ', headband: 'ที่คาดผม',
  catears: 'หูแมว', flower: 'กิ๊บดอกไม้', bow: 'โบว์', cap: 'หมวกแก๊ป', headphones: 'หูฟัง',
  sunhat: 'หมวกปีก', crown: 'มงกุฎดอกไม้', bunny: 'หูกระต่าย', clip: 'กิ๊บ',
  sunglasses: 'แว่นกันแดด', bandaid: 'พลาสเตอร์แก้ม', earrings: 'ต่างหู',
  necktie: 'เนคไท', bowtie: 'โบว์ไท', necklace: 'สร้อย',
};
export const ACCS = [...new Set([...ACC_HEAD, ...ACC_FACE, ...ACC_NECK])];

const DEFAULT_AVATAR = {
  body: 'm', hair: 0, hairColor: HAIR_COLORS[0], skin: SKINS[1], eyes: 'round', blush: true,
  topStyle: 'tee', top: TOPS[0], bottom: 'pants', bottomColor: BOTTOMS[0], accHead: 'none', accFace: 'none', accNeck: 'none',
};

const pick = (list, v, d) => (list.includes(v) ? v : d);

export function normalizeAvatar(a) {
  const x = a && typeof a === 'object' ? a : {};
  return {
    hair: Number.isInteger(x.hair) && x.hair >= 0 && x.hair < HAIR_COUNT ? (HAIR_RETIRED[x.hair] ?? x.hair) : 0,
    hairColor: pick(HAIR_COLORS, x.hairColor, DEFAULT_AVATAR.hairColor),
    skin: pick(SKINS, x.skin, DEFAULT_AVATAR.skin),
    eyes: pick(EYES, x.eyes, 'round'),
    blush: x.blush !== false,
    topStyle: pick(TOP_STYLES, x.topStyle, 'tee'),
    top: pick(TOPS, x.top, DEFAULT_AVATAR.top),
    bottom: pick(BOTTOM_STYLES, x.bottom, 'pants'),
    bottomColor: pick(BOTTOMS, x.bottomColor, DEFAULT_AVATAR.bottomColor),
    // ตัวละครเก่ามีของใส่ช่องเดียว (acc) แยกให้ลงช่องที่ถูกต้อง
    accHead: pick(ACC_HEAD, x.accHead ?? (ACC_HEAD.includes(x.acc) ? x.acc : 'none'), 'none'),
    accFace: pick(ACC_FACE, x.accFace ?? (ACC_FACE.includes(x.acc) ? x.acc : 'none'), 'none'),
    accNeck: pick(ACC_NECK, x.accNeck ?? (ACC_NECK.includes(x.acc) ? x.acc : 'none'), 'none'),
    // ตัวละครเก่ายังไม่เคยเลือกแบบตัว: เดาจากทรงผม/ชุด (เลือกเองทีหลังได้)
    body: BODIES.includes(x.body) ? x.body : (FEM_HAIR.has(x.hair) || ['skirt', 'pleated', 'longskirt'].includes(x.bottom) || DRESSY.has(x.topStyle) ? 'f' : 'm'),
  };
}

const INK = '#3A2A24';
const LINE = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`;
const shade = (hex, k = -0.18) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (k < 0 ? c * k : (255 - c) * k))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
};

// หน้าม้ามาตรฐาน: ครอบหัวลงมาถึงขมับ ปัดเป็นช่อ
const BANGS = (c) => `<path d="M17 56 Q14 20 50 17 Q86 20 83 56 Q80 44 72 40 Q66 48 56 41 Q48 49 38 41 Q28 46 17 56Z" fill="${c}" ${LINE}/>`;

function hairParts(style, c) {
  const d = shade(c, -0.22);
  switch (style) {
    case 1: // บ็อบ
      return { back: `<path d="M14 56 Q12 16 50 15 Q88 16 86 56 L87 84 Q87 92 79 92 L21 92 Q13 92 13 84Z" fill="${c}" ${LINE}/>`, front: BANGS(c) };
    case 2: // ยาว
      return { back: `<path d="M14 56 Q12 15 50 14 Q88 15 86 56 L90 118 Q90 126 82 126 L18 126 Q10 126 10 118Z" fill="${c}" ${LINE}/>`, front: BANGS(c) };
    case 3: // หางม้า
      return {
        back: `<path d="M78 34 Q102 40 96 72 Q92 92 84 100 Q86 80 80 64 Q76 50 70 42Z" fill="${c}" ${LINE}/><circle cx="76" cy="36" r="5" fill="#E0607E" ${LINE}/>`,
        front: BANGS(c),
      };
    case 4: // มวย
      return { back: `<circle cx="50" cy="15" r="13" fill="${c}" ${LINE}/>`, front: BANGS(c) };
    case 5: // หยิก (ฟูรอบหัว)
      return {
        back: `<g fill="${c}" ${LINE}><circle cx="20" cy="50" r="13"/><circle cx="25" cy="30" r="13"/><circle cx="40" cy="19" r="13"/><circle cx="60" cy="19" r="13"/><circle cx="75" cy="30" r="13"/><circle cx="80" cy="50" r="13"/><circle cx="19" cy="69" r="10"/><circle cx="81" cy="69" r="10"/></g>`,
        front: `<path d="M24 46 Q30 30 42 32 Q50 24 58 32 Q70 30 76 46 Q66 38 58 40 Q50 34 42 40 Q34 38 24 46Z" fill="${c}" ${LINE}/>`,
      };
    case 6: // ดังโงะสองข้าง
      return {
        back: `<circle cx="20" cy="22" r="11" fill="${c}" ${LINE}/><circle cx="80" cy="22" r="11" fill="${c}" ${LINE}/><path d="M14 56 Q12 18 50 16 Q88 18 86 56 L86 70 L14 70Z" fill="${c}" ${LINE}/>`,
        front: BANGS(c),
      };
    case 7: // ยาวลอน
      return {
        back: `<path d="M14 56 Q12 14 50 14 Q88 14 86 56 Q94 68 86 80 Q94 92 86 104 Q92 118 80 124 L20 124 Q8 118 14 104 Q6 92 14 80 Q6 68 14 56Z" fill="${c}" ${LINE}/>`,
        front: BANGS(c),
      };
    case 8: // ชี้ฟู
      return {
        back: '',
        front: `<path d="M16 54 Q14 34 22 26 L18 12 L32 20 L36 6 L46 17 L56 4 L62 17 L74 8 L74 22 L88 18 L80 32 Q86 42 84 54 Q78 42 70 40 Q62 46 54 40 Q46 46 38 40 Q28 44 16 54Z" fill="${c}" ${LINE}/>`,
      };
    case 9: // แสกข้าง
      return {
        back: `<path d="M15 56 Q13 18 50 16 Q87 18 85 56 L85 66 L15 66Z" fill="${c}" ${LINE}/>`,
        front: `<path d="M17 58 Q14 20 46 17 Q86 16 84 56 Q78 40 64 34 Q48 30 36 40 Q26 46 17 58Z" fill="${c}" ${LINE}/><path d="M40 20 Q46 26 44 36" fill="none" stroke="${d}" stroke-width="2" stroke-linecap="round"/>`,
      };
    case 10: // หน้าม้าเต่อ (ทรงเห็ด)
      return {
        back: `<path d="M13 62 Q10 16 50 15 Q90 16 87 62 Q86 70 80 70 L20 70 Q14 70 13 62Z" fill="${c}" ${LINE}/>`,
        front: `<path d="M16 50 Q16 18 50 17 Q84 18 84 50 Q50 44 16 50Z" fill="${c}" ${LINE}/><path d="M28 38 Q36 34 44 38 M56 38 Q64 34 72 38" fill="none" stroke="${d}" stroke-width="1.8" stroke-linecap="round"/>`,
      };
    case 11: // ถักเปียสองข้าง
      return {
        back: `<path d="M15 56 Q13 18 50 16 Q87 18 85 56 L85 66 L15 66Z" fill="${c}" ${LINE}/>
          <g fill="${c}" ${LINE}><circle cx="16" cy="74" r="7"/><circle cx="15" cy="87" r="6.5"/><circle cx="16" cy="99" r="6"/><circle cx="84" cy="74" r="7"/><circle cx="85" cy="87" r="6.5"/><circle cx="84" cy="99" r="6"/></g>
          <circle cx="16" cy="108" r="3.5" fill="#E0607E" ${LINE}/><circle cx="84" cy="108" r="3.5" fill="#E0607E" ${LINE}/>`,
        front: BANGS(c),
      };
    case 12: // รองทรง
      return { back: '', front: `<path d="M18 52 Q16 22 50 19 Q84 22 82 52 Q80 40 74 36 Q50 30 26 36 Q20 40 18 52Z" fill="${c}" ${LINE}/>` };
    case 13: // อันเดอร์คัต: ข้างเกรียน ด้านบนเป็นลอน
      return {
        back: `<path d="M19 56 Q18 36 24 30 L76 30 Q82 36 81 56Z" fill="${d}" opacity=".55"/>`,
        front: `<path d="M22 40 Q18 14 52 12 Q86 14 80 38 Q74 30 62 32 Q60 42 46 36 Q34 30 22 40Z" fill="${c}" ${LINE}/>`,
      };
    case 14: // ผมตั้ง (ควิฟ)
      return { back: '', front: `<path d="M18 54 Q14 26 34 20 Q40 4 62 8 Q82 12 80 30 Q86 40 82 54 Q78 40 68 36 Q56 40 44 34 Q30 38 18 54Z" fill="${c}" ${LINE}/>` };
    case 15: // มัดจุก
      return { back: `<ellipse cx="50" cy="14" rx="10" ry="9" fill="${c}" ${LINE}/><rect x="44" y="20" width="12" height="5" rx="2" fill="${d}"/>`, front: `<path d="M18 54 Q16 22 50 20 Q84 22 82 54 Q78 38 50 32 Q22 38 18 54Z" fill="${c}" ${LINE}/>` };
    case 16: // หน้าม้าเกาหลี (ทูบล็อก)
      return { back: `<path d="M16 58 Q14 18 50 16 Q86 18 84 58 L84 62 L16 62Z" fill="${c}" ${LINE}/>`, front: `<path d="M17 58 Q14 18 50 16 Q86 18 83 58 Q80 50 74 48 L70 40 L62 50 L56 40 L48 50 L42 40 L34 50 L28 42 Q22 50 17 58Z" fill="${c}" ${LINE}/>` };
    case 17: // หยิกสั้น
      return { back: '', front: `<g fill="${c}" ${LINE}><circle cx="24" cy="40" r="9"/><circle cx="34" cy="28" r="10"/><circle cx="50" cy="23" r="11"/><circle cx="66" cy="28" r="10"/><circle cx="76" cy="40" r="9"/><circle cx="20" cy="52" r="6"/><circle cx="80" cy="52" r="6"/></g>` };
    case 18: // ทวินเทล
      return {
        back: `<path d="M18 40 Q2 50 6 80 Q8 98 18 104 Q14 84 18 70 Q22 56 24 46Z" fill="${c}" ${LINE}/><path d="M82 40 Q98 50 94 80 Q92 98 82 104 Q86 84 82 70 Q78 56 76 46Z" fill="${c}" ${LINE}/>
          <circle cx="20" cy="40" r="4.5" fill="#E0607E" ${LINE}/><circle cx="80" cy="40" r="4.5" fill="#E0607E" ${LINE}/>`,
        front: BANGS(c),
      };
    case 19: // ฮิเมะ: ยาวตรง หน้าม้าตัด มีปอยข้าง
      return {
        back: `<path d="M14 56 Q12 15 50 14 Q88 15 86 56 L88 124 L12 124Z" fill="${c}" ${LINE}/>`,
        front: `<path d="M17 66 Q14 18 50 17 Q86 18 83 66 L76 66 L76 46 L24 46 L24 66Z" fill="${c}" ${LINE}/>`,
      };
    case 20: // บ็อบสั้น
      return { back: `<path d="M15 56 Q13 16 50 15 Q87 16 85 56 L85 74 Q85 78 80 78 L20 78 Q15 78 15 74Z" fill="${c}" ${LINE}/>`, front: `<path d="M17 56 Q14 20 50 17 Q86 20 83 56 Q82 46 76 44 L24 44 Q18 46 17 56Z" fill="${c}" ${LINE}/>` };
    case 21: // มวยต่ำ
      return { back: `<circle cx="72" cy="78" r="12" fill="${c}" ${LINE}/><path d="M15 56 Q13 18 50 16 Q87 18 85 56 L84 70 L16 70Z" fill="${c}" ${LINE}/>`, front: BANGS(c) };
    case 22: // ยาวแสกกลาง
      return {
        back: `<path d="M14 56 Q12 15 50 14 Q88 15 86 56 L90 120 Q90 126 82 126 L18 126 Q10 126 10 120Z" fill="${c}" ${LINE}/>`,
        front: `<path d="M17 62 Q14 18 50 16 Q86 18 83 62 Q80 40 64 32 Q54 28 50 24 Q46 28 36 32 Q20 40 17 62Z" fill="${c}" ${LINE}/>`,
      };
    case 23: // เปียข้างเดียว
      return {
        back: `<path d="M15 56 Q13 18 50 16 Q87 18 85 56 L85 66 L15 66Z" fill="${c}" ${LINE}/>
          <g fill="${c}" ${LINE}><circle cx="80" cy="74" r="7.5"/><circle cx="82" cy="87" r="7"/><circle cx="83" cy="100" r="6.5"/><circle cx="83" cy="112" r="6"/></g><circle cx="83" cy="121" r="3.6" fill="#7CC4EA" ${LINE}/>`,
        front: `<path d="M17 58 Q14 20 46 17 Q86 16 84 56 Q78 40 64 34 Q48 30 36 40 Q26 46 17 58Z" fill="${c}" ${LINE}/>`,
      };
    case 24: // เกรียน
      return { back: '', front: `<path d="M19 50 Q18 22 50 20 Q82 22 81 50 Q78 36 50 31 Q22 36 19 50Z" fill="${c}" ${LINE}/><path d="M28 34 l2 3 M40 28 l1 3 M52 27 l0 3 M64 29 l-1 3 M72 34 l-2 3" stroke="${d}" stroke-width="1.4" stroke-linecap="round"/>` };
    case 25: // เสยหลัง
      return { back: '', front: `<path d="M18 52 Q14 20 50 15 Q86 18 82 52 Q80 38 72 32 Q58 24 44 28 Q28 34 18 52Z" fill="${c}" ${LINE}/><path d="M34 26 Q50 18 70 26 M30 32 Q48 24 66 30" fill="none" stroke="${d}" stroke-width="1.6" stroke-linecap="round"/>` };
    case 26: // ม็อบฟู
      return { back: `<path d="M15 60 Q10 16 50 14 Q90 16 85 60 Q82 66 78 62 L22 62 Q18 66 15 60Z" fill="${c}" ${LINE}/>`, front: `<path d="M16 54 Q14 18 50 15 Q86 18 84 54 Q80 42 74 46 Q70 36 62 44 Q56 34 48 44 Q40 36 34 46 Q28 38 24 48 Q20 44 16 54Z" fill="${c}" ${LINE}/>` };
    case 27: // แสกกลาง (ทรงม่าน)
      return { back: `<path d="M16 58 Q14 18 50 16 Q86 18 84 58 L84 64 L16 64Z" fill="${c}" ${LINE}/>`, front: `<path d="M17 58 Q14 18 50 16 Q86 18 83 58 Q80 44 70 38 Q58 34 52 26 L50 22 L48 26 Q42 34 30 38 Q20 44 17 58Z" fill="${c}" ${LINE}/>` };
    case 28: // วูล์ฟคัต
      return { back: `<path d="M14 56 Q12 15 50 14 Q88 15 86 56 L88 84 L80 78 L76 90 L68 80 L32 80 L24 90 L20 78 L12 84Z" fill="${c}" ${LINE}/>`, front: `<path d="M17 58 Q14 18 50 16 Q86 18 83 58 Q80 48 74 46 L70 38 L64 46 L56 36 L48 46 L42 36 L34 46 L28 40 Q22 48 17 58Z" fill="${c}" ${LINE}/>` };
    case 29: // มัดครึ่งหัว
      return { back: `<path d="M15 56 Q13 18 50 16 Q87 18 85 56 L86 82 L14 82Z" fill="${c}" ${LINE}/><ellipse cx="50" cy="16" rx="9" ry="7" fill="${c}" ${LINE}/>`, front: `<path d="M17 58 Q14 22 50 20 Q86 22 83 58 Q80 44 70 40 Q50 32 30 40 Q20 44 17 58Z" fill="${c}" ${LINE}/>` };
    default: // สั้น
      return { back: '', front: `<path d="M17 56 Q14 20 50 17 Q86 20 83 56 Q80 42 70 38 Q60 44 50 38 Q40 44 30 38 Q22 44 17 56Z" fill="${c}" ${LINE}/>` };
  }
}

function eyesSvg(kind, body) {
  const L = 38; const R = 62; const Y = 57;
  const lash = body === 'f' && kind !== 'smile' && kind !== 'sleepy'
    ? `<path d="M${L - 5} ${Y - 3} l-2.6 -2 M${R + 5} ${Y - 3} l2.6 -2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` : '';
  return lash + eyesBase(kind, L, R, Y);
}
function eyesBase(kind, L, R, Y) {
  const dot = (x) => `<ellipse cx="${x}" cy="${Y}" rx="3.8" ry="4.4" fill="${INK}"/><circle cx="${x + 1.3}" cy="${Y - 1.6}" r="1.4" fill="#fff"/>`;
  const arc = (x, up) => `<path d="M${x - 4.5} ${Y + (up ? 1.5 : -0.5)} Q${x} ${Y + (up ? -4.5 : 3.5)} ${x + 4.5} ${Y + (up ? 1.5 : -0.5)}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  switch (kind) {
    case 'sparkle':
      return [L, R].map((x) => `<ellipse cx="${x}" cy="${Y}" rx="4.8" ry="5.8" fill="${INK}"/><circle cx="${x + 1.6}" cy="${Y - 2}" r="2" fill="#fff"/><circle cx="${x - 1.6}" cy="${Y + 2.2}" r="1" fill="#fff"/>`).join('');
    case 'smile': return arc(L, true) + arc(R, true);
    case 'sleepy': return arc(L, false) + arc(R, false);
    case 'wink': return dot(L) + arc(R, true);
    default: return dot(L) + dot(R);
  }
}

function topSvg(style, c, skin) {
  const d = shade(c, -0.2);
  const hi = shade(c, 0.35);
  switch (style) {
    case 'hoodie':
      return `<path d="M30 84 Q50 74 70 84 L70 86 Q50 96 30 86Z" fill="${d}" ${LINE}/>
        <rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/>
        <rect x="40" y="101" width="20" height="9" rx="4" fill="${d}"/>
        <path d="M45 86 L44 96 M55 86 L56 96" stroke="${hi}" stroke-width="2" stroke-linecap="round"/>`;
    case 'sweater':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/>
        <path d="M33 110 H67" stroke="${d}" stroke-width="4"/><path d="M42 84 Q50 90 58 84" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>
        <path d="M40 96 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3" fill="none" stroke="${hi}" stroke-width="1.6" stroke-linejoin="round"/>`;
    case 'shirt':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/>
        <path d="M42 82 L50 91 L58 82 L54 80 L50 85 L46 80Z" fill="#fff" ${LINE}/>
        <circle cx="50" cy="97" r="1.4" fill="${d}"/><circle cx="50" cy="104" r="1.4" fill="${d}"/><circle cx="50" cy="111" r="1.4" fill="${d}"/>`;
    case 'dress':
      return `<path d="M36 82 Q50 78 64 82 L72 128 Q50 134 28 128Z" fill="${c}" ${LINE}/>
        <path d="M33 112 Q50 117 67 112" fill="none" stroke="${hi}" stroke-width="2"/>
        <path d="M42 82 Q50 88 58 82" fill="none" stroke="${d}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'suit':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/>
        <path d="M44 82 L50 100 L56 82Z" fill="#fff" ${LINE}/><path d="M48 86 L50 98 L52 86Z" fill="#B8344F"/>
        <path d="M40 82 L50 102 M60 82 L50 102" stroke="${d}" stroke-width="2.4"/><circle cx="50" cy="108" r="1.6" fill="${d}"/>`;
    case 'jacket':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/>
        <rect x="45" y="83" width="10" height="32" fill="#F5F0E6"/><path d="M50 84 V114" stroke="${d}" stroke-width="2" stroke-dasharray="2 2"/>
        <path d="M36 98 h7 M57 98 h7" stroke="${d}" stroke-width="2" stroke-linecap="round"/>`;
    case 'couple':
      // เสื้อคู่: รางวัล Bond Lv.10 ลายหัวใจกลางอก
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/>
        <path d="M50 108s-8-5-8-10.5c0-3 2.4-5 4.8-5 1.4 0 2.4.8 3.2 2 .8-1.2 1.8-2 3.2-2 2.4 0 4.8 2 4.8 5C58 103 50 108 50 108z" fill="#E0485F" stroke="#FFF" stroke-width="1.6"/>`;
    case 'stripe':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="#FFFFFF" ${LINE}/>
        <g stroke="${c}" stroke-width="4"><path d="M34 90 H66 M33 98 H67 M33 106 H67"/></g><rect x="32" y="82" width="36" height="34" rx="12" fill="none" ${LINE}/>`;
    case 'cardigan':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="#FFFFFF" ${LINE}/>
        <path d="M32 94 Q32 82 44 82 L48 116 L36 116 Q32 116 32 108Z M68 94 Q68 82 56 82 L52 116 L64 116 Q68 116 68 108Z" fill="${c}" ${LINE}/>
        <circle cx="47" cy="96" r="1.4" fill="${d}"/><circle cx="47.5" cy="104" r="1.4" fill="${d}"/>`;
    case 'uniform':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="#FFFFFF" ${LINE}/>
        <path d="M42 82 L50 90 L58 82" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M50 90 L46 104 L50 108 L54 104Z" fill="${c}" ${LINE}/>
        <path d="M58 98 h6" stroke="#4C86D9" stroke-width="2" stroke-linecap="round"/>`;
    case 'polo':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/><path d="M42 81 L50 88 L46 92Z M58 81 L50 88 L54 92Z" fill="${hi}" ${LINE}/><path d="M50 88 V98" stroke="${d}" stroke-width="1.6"/><circle cx="50" cy="92" r="1.2" fill="${d}"/><circle cx="50" cy="96" r="1.2" fill="${d}"/>`;
    case 'plaid':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/><g stroke="${d}" stroke-width="2" opacity=".7"><path d="M40 83 V115 M50 84 V116 M60 83 V115"/><path d="M33 92 H67 M33 102 H67 M34 110 H66"/></g><g stroke="${hi}" stroke-width="1" opacity=".8"><path d="M45 83 V115 M55 83 V115"/></g><path d="M42 82 L50 90 L58 82" fill="none" stroke="#fff" stroke-width="3"/><rect x="32" y="82" width="36" height="34" rx="12" fill="none" ${LINE}/>`;
    case 'baseball':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="#FFFFFF" ${LINE}/><path d="M42 82 Q50 90 58 82" fill="none" stroke="${c}" stroke-width="3"/><text x="50" y="106" text-anchor="middle" font-size="11" font-family="Itim, sans-serif" fill="${c}">2G</text>`;
    case 'hawaii':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/><g fill="#FFF3C8"><circle cx="39" cy="94" r="3"/><circle cx="60" cy="90" r="2.6"/><circle cx="57" cy="106" r="3.2"/><circle cx="41" cy="108" r="2.4"/></g><g fill="#7FB77E"><ellipse cx="44" cy="99" rx="3" ry="1.6" transform="rotate(-30 44 99)"/><ellipse cx="63" cy="98" rx="3" ry="1.6" transform="rotate(30 63 98)"/></g><path d="M42 82 L50 94 L58 82" fill="${hi}" ${LINE}/>`;
    case 'vest':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="#FFFFFF" ${LINE}/><path d="M33 90 Q34 84 42 82 L50 104 L58 82 Q66 84 67 90 L67 112 Q67 116 62 116 L38 116 Q33 116 33 112Z" fill="${c}" ${LINE}/><circle cx="50" cy="108" r="1.4" fill="${d}"/><circle cx="50" cy="112" r="1.4" fill="${d}"/>`;
    case 'crop':
      return `<rect x="34" y="96" width="32" height="14" rx="4" fill="${skin}" ${LINE}/><rect x="32" y="82" width="36" height="20" rx="10" fill="${c}" ${LINE}/><path d="M43 83 Q50 88 57 83" fill="none" stroke="${d}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'offshoulder':
      return `<rect x="32" y="90" width="36" height="26" rx="10" fill="${c}" ${LINE}/><path d="M30 92 Q36 88 42 92 Q48 88 54 92 Q60 88 66 92 Q70 90 70 94" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`;
    case 'blouse':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/><path d="M50 88 L40 82 Q38 90 44 92Z M50 88 L60 82 Q62 90 56 92Z" fill="${hi}" ${LINE}/><path d="M48 89 L44 100 M52 89 L56 100" stroke="${hi}" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="88" r="2.4" fill="${d}"/>`;
    case 'floral':
      return `<path d="M36 82 Q50 78 64 82 L74 130 Q50 136 26 130Z" fill="${c}" ${LINE}/><g fill="#FFF3C8">${[[40, 92], [58, 96], [46, 108], [62, 116], [36, 122], [52, 124]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g><g fill="${hi}">${[[48, 96], [42, 116], [60, 106]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('')}</g><path d="M42 82 Q50 88 58 82" fill="none" stroke="${d}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'pinafore':
      return `<rect x="32" y="82" width="36" height="22" rx="11" fill="#FFFFFF" ${LINE}/><path d="M38 90 H62 L72 128 Q50 134 28 128Z" fill="${c}" ${LINE}/><path d="M39 90 L36 82 M61 90 L64 82" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/><rect x="44" y="94" width="12" height="7" rx="2" fill="${d}"/>`;
    case 'catpj':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/><g transform="translate(50 100)"><path d="M-8 -4 L-7 -10 L-3 -6 H3 L7 -10 L8 -4 Q8 5 0 5 Q-8 5 -8 -4Z" fill="#fff" ${LINE}/><circle cx="-3" cy="-1" r="1" fill="${INK}"/><circle cx="3" cy="-1" r="1" fill="${INK}"/></g><path d="M43 83 Q50 88 57 83" fill="none" stroke="${d}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'thai':
      return `<path d="M36 84 Q50 80 64 84 L70 140 Q50 144 30 140Z" fill="${c}" ${LINE}/><path d="M33 86 L66 100 L66 108 L33 94Z" fill="#F2C94C" ${LINE}/><g stroke="#F2C94C" stroke-width="1.6"><path d="M32 128 Q50 132 68 128 M31 134 Q50 138 69 134"/></g><path d="M44 112 h12" stroke="${hi}" stroke-width="2"/>`;
    case 'groom':
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="#2E2A30" ${LINE}/><path d="M44 82 L50 104 L56 82Z" fill="#FFFFFF" ${LINE}/><path d="M50 86 L45 83 Q44 87 45 89Z M50 86 L55 83 Q56 87 55 89Z" fill="${c}"/><circle cx="62" cy="94" r="2.6" fill="#F2617F"/><path d="M40 82 L50 106 M60 82 L50 106" stroke="#4A4250" stroke-width="2"/>`;
    case 'bride':
      return `<path d="M38 82 Q50 78 62 82 L80 148 Q50 156 20 148Z" fill="#FFFFFF" ${LINE}/><path d="M38 98 Q50 102 62 98" fill="none" stroke="#E8D8C0" stroke-width="2.4"/><g fill="#F4E6F0">${[[34, 130], [46, 138], [60, 134], [70, 142], [28, 144]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g><circle cx="50" cy="96" r="2.6" fill="${c}"/>`;
    case 'yukata':
      return `<path d="M34 82 Q50 78 66 82 L68 140 Q50 144 32 140Z" fill="${c}" ${LINE}/><path d="M42 82 L56 104 M58 82 L48 96" stroke="${hi}" stroke-width="3"/><rect x="33" y="100" width="34" height="9" fill="#F2617F" ${LINE}/><g fill="${hi}" opacity=".85"><circle cx="40" cy="120" r="2.6"/><circle cx="58" cy="126" r="2.6"/><circle cx="46" cy="132" r="2.2"/></g>`;
    default: // tee
      return `<rect x="32" y="82" width="36" height="34" rx="12" fill="${c}" ${LINE}/><path d="M43 83 Q50 88 57 83" fill="none" stroke="${d}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
}

// ขา: ยืน/นั่ง + ท่อนล่าง (กางเกง ขาสั้น กระโปรง เอี๊ยม)
const SKIN_LEGS = new Set(['shorts', 'skirt', 'pleated', 'longskirt']);
function legsSvg(a) {
  const full = a.topStyle in FULL_PANTS;
  const pantsC = full ? (FULL_PANTS[a.topStyle] || a.top) : a.bottomColor;
  const legC = DRESSY.has(a.topStyle) || (!full && SKIN_LEGS.has(a.bottom)) ? a.skin : pantsC;
  const shoe = a.topStyle === 'groom' ? '#2E2A30' : '#F5F0E6';
  const plain = !full && !DRESSY.has(a.topStyle);
  const extra = (x) => {
    if (a.topStyle === 'catpj') return `<circle cx="${x + 4}" cy="124" r="1.4" fill="#fff"/><circle cx="${x + 8}" cy="134" r="1.4" fill="#fff"/>`;
    if (!plain) return '';
    if (a.bottom === 'shorts') return `<rect x="${x}" y="112" width="12" height="14" rx="5" fill="${a.bottomColor}" ${LINE}/>`;
    if (a.bottom === 'cargo') return `<rect x="${x + 1}" y="124" width="10" height="8" rx="2" fill="${shade(a.bottomColor, -0.15)}" ${LINE}/>`;
    if (a.bottom === 'ripped') return `<path d="M${x + 3} 128 l3 -1.5 l3 1.5 M${x + 2} 138 l4 -1 l3 1" stroke="#F5F0E6" stroke-width="1.8" fill="none"/>`;
    return '';
  };
  const leg = (x, h, sy) => `<rect x="${x}" y="112" width="12" height="${h}" rx="6" fill="${legC}" ${LINE}/>${extra(x)}<ellipse cx="${x + 6}" cy="${sy}" rx="8" ry="4.6" fill="${shoe}" ${LINE}/>`;
  return `<g class="av-legs-stand">
      <g class="av-leg av-leg-l">${leg(37, 38, 151)}</g>
      <g class="av-leg av-leg-r">${leg(51, 38, 151)}</g>
    </g>
    <g class="av-legs-sit">${leg(37, 20, 134)}${leg(51, 20, 134)}</g>`;
}

function waistSvg(a) {
  if (DRESSY.has(a.topStyle)) return '';
  if (a.topStyle in FULL_PANTS) return `<rect x="32" y="106" width="36" height="10" rx="4" fill="${FULL_PANTS[a.topStyle] || a.top}" ${LINE}/>`;
  if (a.bottom === 'pleated') return `<path d="M32 106 L68 106 L72 124 Q50 128 28 124Z" fill="${a.bottomColor}" ${LINE}/><path d="M37 107 L34 124 M44 107 L42 126 M50 107 V127 M56 107 L58 126 M63 107 L66 124" stroke="${shade(a.bottomColor, -0.25)}" stroke-width="1.6"/>`;
  if (a.bottom === 'longskirt') return `<path d="M32 106 L68 106 L76 146 Q50 152 24 146Z" fill="${a.bottomColor}" ${LINE}/><path d="M42 108 L38 146 M58 108 L62 146" stroke="${shade(a.bottomColor, -0.2)}" stroke-width="1.4"/>`;
  if (a.bottom === 'skirt') return `<path d="M32 106 L68 106 L74 126 Q50 132 26 126Z" fill="${a.bottomColor}" ${LINE}/><path d="M40 108 L37 126 M50 108 V128 M60 108 L63 126" stroke="${shade(a.bottomColor, -0.2)}" stroke-width="1.4"/>`;
  if (a.bottom === 'overalls') {
    const c = a.bottomColor;
    return `<path d="M38 92 H62 V112 H38Z" fill="${c}" ${LINE}/><path d="M38 92 L34 84 M62 92 L66 84" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>
      <rect x="44" y="97" width="12" height="7" rx="2" fill="${shade(c, -0.18)}"/><circle cx="40" cy="94" r="1.6" fill="#F2C94C"/><circle cx="60" cy="94" r="1.6" fill="#F2C94C"/>`;
  }
  return `<rect x="32" y="106" width="36" height="10" rx="4" fill="${a.bottomColor}" ${LINE}/>`;
}

function accSvg(acc, a) {
  const pink = '#E0607E';
  switch (acc) {
    case 'glasses': return `<g fill="rgba(255,255,255,.25)" stroke="${INK}" stroke-width="2.2"><circle cx="38" cy="57" r="8.5"/><circle cx="62" cy="57" r="8.5"/><path d="M46.5 57H53.5" fill="none"/></g>`;
    case 'beanie': return `<path d="M17 46 Q17 10 50 10 Q83 10 83 46Z" fill="${pink}" ${LINE}/><rect x="15" y="40" width="70" height="10" rx="5" fill="#B8344F" ${LINE}/><circle cx="50" cy="9" r="6" fill="#F5F0E6" ${LINE}/>`;
    case 'headband': return `<path d="M19 44 Q50 14 81 44" fill="none" stroke="${pink}" stroke-width="6" stroke-linecap="round"/>`;
    case 'catears': return `<path d="M21 34 L18 10 L38 22Z" fill="${a.hairColor}" ${LINE}/><path d="M79 34 L82 10 L62 22Z" fill="${a.hairColor}" ${LINE}/><path d="M23 28 L22 16 L32 23Z" fill="#F9C9CF"/><path d="M77 28 L78 16 L68 23Z" fill="#F9C9CF"/><path d="M20 40 Q50 14 80 40" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    case 'flower': return `<g transform="translate(74 30)"><g fill="#FFD3E0" ${LINE}><circle cx="0" cy="-6" r="4.5"/><circle cx="5.7" cy="-1.9" r="4.5"/><circle cx="3.5" cy="4.9" r="4.5"/><circle cx="-3.5" cy="4.9" r="4.5"/><circle cx="-5.7" cy="-1.9" r="4.5"/></g><circle r="3" fill="#F2C94C"/></g>`;
    case 'bow': return `<g transform="translate(50 15)"><path d="M0 0 L-15 -8 Q-19 0 -15 8Z M0 0 L15 -8 Q19 0 15 8Z" fill="${pink}" ${LINE}/><circle r="4" fill="#B8344F" ${LINE}/></g>`;
    case 'cap': return `<path d="M18 44 Q18 12 52 12 Q82 14 82 44Z" fill="#4C86D9" ${LINE}/><path d="M16 44 Q8 44 4 50 L46 50 Q40 44 16 44Z" fill="#2E5BA8" ${LINE}/><circle cx="52" cy="13" r="3" fill="#2E5BA8"/>`;
    case 'sunhat': return `<ellipse cx="50" cy="34" rx="46" ry="11" fill="#F2D49B" ${LINE}/><path d="M24 34 Q24 8 50 8 Q76 8 76 34Z" fill="#F2D49B" ${LINE}/><path d="M25 30 Q50 36 75 30" fill="none" stroke="#E0607E" stroke-width="5"/>`;
    case 'crown': return `<g ${LINE}>${[22, 34, 50, 66, 78].map((x, i) => `<circle cx="${x}" cy="${[34, 26, 22, 26, 34][i]}" r="6" fill="${['#FFB3C9', '#FFE08A', '#F2617F', '#FFE08A', '#FFB3C9'][i]}"/>`).join('')}</g><g fill="#7FB77E"><ellipse cx="28" cy="31" rx="4" ry="2" transform="rotate(-30 28 31)"/><ellipse cx="72" cy="31" rx="4" ry="2" transform="rotate(30 72 31)"/></g>`;
    case 'bunny': return `<path d="M34 30 Q26 4 34 2 Q42 4 42 28Z" fill="#fff" ${LINE}/><path d="M58 28 Q58 4 66 2 Q74 4 66 30Z" fill="#fff" ${LINE}/><path d="M35 24 Q31 10 34.5 8 Q38 10 38.5 24Z M61.5 24 Q62 10 65.5 8 Q69 10 65 24Z" fill="#F9C9CF"/><path d="M22 40 Q50 16 78 40" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    case 'clip': return `<g transform="rotate(-20 72 36)"><rect x="62" y="32" width="20" height="7" rx="3.5" fill="#F2C94C" ${LINE}/><circle cx="66" cy="35.5" r="1.4" fill="#fff"/></g>`;
    case 'sunglasses': return `<g ${LINE}><path d="M28 51 h20 v5 a9 7 0 0 1 -20 0z" fill="#2E2A30"/><path d="M52 51 h20 v5 a9 7 0 0 1 -20 0z" fill="#2E2A30"/><path d="M48 53 h4" fill="none"/></g><path d="M31 54 l5 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
    case 'bandaid': return `<g transform="rotate(-18 70 66)"><rect x="62" y="62" width="17" height="7" rx="3.5" fill="#F5D5B8" ${LINE}/><rect x="68" y="62.5" width="5" height="6" fill="#E8B894"/></g>`;
    case 'earrings': return `<circle cx="18" cy="66" r="2.8" fill="#F2C94C" ${LINE}/><circle cx="82" cy="66" r="2.8" fill="#F2C94C" ${LINE}/>`;
    case 'necktie': return `<path d="M47 83 h6 l-1 3 l3 18 l-5 5 l-5 -5 l3 -18z" fill="#B8344F" ${LINE}/>`;
    case 'bowtie': return `<path d="M50 86 L40 80 Q37 86 40 92Z M50 86 L60 80 Q63 86 60 92Z" fill="#B8344F" ${LINE}/><circle cx="50" cy="86" r="3" fill="#8E2238" ${LINE}/>`;
    case 'necklace': return `<path d="M38 82 Q50 96 62 82" fill="none" stroke="#F2C94C" stroke-width="2"/><circle cx="50" cy="91" r="3" fill="#F2617F" ${LINE}/>`;
    case 'headphones': return `<path d="M16 54 Q14 12 50 12 Q86 12 84 54" fill="none" stroke="#3B4256" stroke-width="5" stroke-linecap="round"/><rect x="8" y="48" width="13" height="20" rx="6" fill="#F2617F" ${LINE}/><rect x="79" y="48" width="13" height="20" rx="6" fill="#F2617F" ${LINE}/>`;
    default: return '';
  }
}

export function avatarSvg(input) {
  const a = normalizeAvatar(input);
  const hair = hairParts(a.hair, a.hairColor);
  const SLEEVE = { stripe: '#FFFFFF', baseball: a.top, vest: '#FFFFFF', groom: '#2E2A30', bride: '#FFFFFF', pinafore: '#FFFFFF' };
  const sleeve = a.topStyle === 'offshoulder' ? a.skin : (SLEEVE[a.topStyle] || a.top);
  const neck = a.accNeck === 'scarf'
    ? `<rect x="30" y="78" width="40" height="11" rx="5.5" fill="#E0607E" ${LINE}/><rect x="56" y="84" width="10" height="22" rx="5" fill="#E0607E" ${LINE}/>`
    : accSvg(a.accNeck, a);
  // หูแมว/หมวกต้องอยู่หน้าผม แว่นอยู่หน้าตา
  return `<svg class="av" viewBox="0 0 100 160" aria-hidden="true"><g class="av-all">
    ${hair.back}
    ${legsSvg(a)}
    ${topSvg(a.topStyle, a.top, a.skin)}
    ${waistSvg(a)}
    <g class="av-arm av-arm-l"><rect x="22" y="85" width="12" height="25" rx="6" fill="${sleeve}" ${LINE}/><circle cx="28" cy="111" r="5.2" fill="${a.skin}" ${LINE}/></g>
    <g class="av-arm av-arm-r"><rect x="66" y="85" width="12" height="25" rx="6" fill="${sleeve}" ${LINE}/><circle cx="72" cy="111" r="5.2" fill="${a.skin}" ${LINE}/></g>
    ${neck}
    <circle cx="18" cy="58" r="5.5" fill="${a.skin}" ${LINE}/><circle cx="82" cy="58" r="5.5" fill="${a.skin}" ${LINE}/>
    <ellipse cx="50" cy="52" rx="32" ry="29" fill="${a.skin}" ${LINE}/>
    ${a.blush ? `<ellipse cx="29" cy="65" rx="6" ry="3.6" fill="#F49A9A" opacity=".55"/><ellipse cx="71" cy="65" rx="6" ry="3.6" fill="#F49A9A" opacity=".55"/>` : ''}
    <g class="av-eyes">${eyesSvg(a.eyes, a.body)}</g>
    <path d="M46.5 66 Q50 69.5 53.5 66" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    ${hair.front}
    ${accSvg(a.accFace, a)}
    ${accSvg(a.accHead, a)}
  </g></svg>`;
}
