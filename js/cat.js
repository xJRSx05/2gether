// แมวของเรา: SVG ปรับสีขนได้ ท่าทางสลับด้วย CSS (idle, walk, sleep, happy)
// สกิน = สีขน 5 แบบ (ขาว ส้ม ดำ เทา สามสี) ใช้ร่วมกันทั้งบ้าน
export const CAT_COLORS = {
  white: { label: 'ขาว' },
  orange: { label: 'ส้ม' },
  black: { label: 'ดำ' },
  gray: { label: 'เทา' },
  calico: { label: 'สามสี' },
};
export const CAT_COLOR_IDS = Object.keys(CAT_COLORS);
export const normalizeCatColor = (c) => (c in CAT_COLORS ? c : 'white');

/* ---------- สกินชิบิ: หัวโต เส้นขอบเข้ม แก้มแดง ---------- */
const CHIBI = {
  white: { base: '#FFFFFF', tail: '#E4E9F2' },
  orange: { base: '#FFD9A8', tail: '#F4B26E', patch: '#F4B26E' },
  black: { base: '#4A4250', tail: '#2E2834', dark: true },
  gray: { base: '#D5DAE3', tail: '#A9B1BF' },
  calico: { base: '#FFFFFF', tail: '#E4E9F2', patch: '#F4B26E', patch2: '#4A4250' },
};
const CHIBI_OUTLINE = 'M18 56 C12 40 16 24 28 8 L48 24 Q60 21 72 24 L92 8 C104 24 108 40 102 56 L106 60 L101.5 62 L105 66 L99.5 67.5 C96 72 92 76 90 80 C96 92 95 106 87 113 Q81 119 72 116 Q66 119 60 115 Q54 119 48 116 Q39 119 33 113 C25 106 24 92 30 80 C28 76 24 72 20.5 67.5 L15 66 L18.5 62 L14 60 Z';
let clipSeq = 0;
// ของแต่งแมวจากร้าน: ปลอกคอกระดิ่ง หมวกไหมพรม
const CAT_COLLAR = '<g class="cat-acc"><path d="M30 78 Q60 90 90 78" fill="none" stroke="#E0485F" stroke-width="6" stroke-linecap="round"/><path d="M30 78 Q60 90 90 78" fill="none" stroke="#2B2024" stroke-width="1.2" stroke-linecap="round" opacity=".35"/><circle cx="60" cy="89" r="5.5" fill="#F2C94C" stroke="#2B2024" stroke-width="1.6"/><path d="M56 89h8" stroke="#2B2024" stroke-width="1.2"/></g>';
const CAT_HAT = '<g class="cat-acc"><path d="M40 27 Q60 2 80 27 Z" fill="#7FB3E0" stroke="#2B2024" stroke-width="2.4" stroke-linejoin="round"/><path d="M38 27 Q60 20 82 27 L81 33 Q60 26 39 33Z" fill="#F5F0E6" stroke="#2B2024" stroke-width="2" stroke-linejoin="round"/><path d="M50 16 V24 M58 11 V24 M66 13 V24" stroke="#5E95C8" stroke-width="2" stroke-linecap="round"/><circle cx="60" cy="6" r="5.5" fill="#F5F0E6" stroke="#2B2024" stroke-width="2"/></g>';

function chibiCat(colorKey, acc) {
  const key = normalizeCatColor(colorKey);
  const c = CHIBI[key];
  const ink = c.dark ? '#1A1418' : '#2B2024';
  const eye = c.dark ? '#FFF4D6' : '#1E1418';
  const sw = `stroke="${ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const id = `cc${(clipSeq += 1)}`;
  const patches = !c.patch ? '' : `<clipPath id="${id}"><path d="${CHIBI_OUTLINE}"/></clipPath><g clip-path="url(#${id})">${key === 'calico'
    ? `<path d="M64 20 Q84 6 106 30 L106 50 Q86 44 70 34Z" fill="${c.patch}"/><path d="M12 30 Q26 14 46 24 Q40 38 14 46Z" fill="${c.patch2}"/><ellipse cx="78" cy="98" rx="14" ry="10" fill="${c.patch}"/>`
    : `<path d="M44 22 Q60 14 76 22 L72 34 Q60 30 48 34Z" fill="${c.patch}"/><path d="M24 40 Q30 46 26 54" stroke="${c.patch}" stroke-width="5" fill="none"/><path d="M96 40 Q90 46 94 54" stroke="${c.patch}" stroke-width="5" fill="none"/>`}</g>`;
  const blushLines = 'M29.5 58 l-1 4 M32.5 58 l-1 4 M35.5 58 l-1 4 M85.5 58 l-1 4 M88.5 58 l-1 4 M91.5 58 l-1 4';
  return `<svg class="cat chibi" viewBox="0 0 120 124" aria-hidden="true"><g class="cat-all">
    <g class="cat-tail"><path d="M80 106 C98 108 110 96 108 80 C107 72 103 67 99 66" fill="none" stroke="${ink}" stroke-width="13" stroke-linecap="round"/>
      <path d="M80 106 C98 108 110 96 108 80 C107 72 103 67 99 66" fill="none" stroke="${c.tail}" stroke-width="7.4" stroke-linecap="round"/></g>
    <path d="${CHIBI_OUTLINE}" fill="${c.base}" ${sw}/>
    ${patches}
    <path d="${CHIBI_OUTLINE}" fill="none" ${sw}/>
    <path class="cat-paw" d="M38 96 Q26 94 22 84 Q19 76 25 75 Q30 75 32 82 Q34 88 40 89" fill="${c.base}" ${sw}/>
    <path d="M29 13 L44 26 Q35 29 26 34 Z" fill="#F9D3CF" opacity="${c.dark ? 0.5 : 1}"/>
    <path d="M91 13 L76 26 Q85 29 94 34 Z" fill="#F9D3CF" opacity="${c.dark ? 0.5 : 1}"/>
    <ellipse cx="32" cy="60" rx="7.5" ry="5.2" fill="#F7B9B4" opacity=".75"/><ellipse cx="88" cy="60" rx="7.5" ry="5.2" fill="#F7B9B4" opacity=".75"/>
    <path d="${blushLines}" stroke="#E07C78" stroke-width="1.3" stroke-linecap="round"/>
    <g class="eyes-open"><circle cx="44" cy="51" r="5.2" fill="${eye}"/><circle cx="76" cy="51" r="5.2" fill="${eye}"/></g>
    <g class="eyes-closed" fill="none" stroke="${eye}" stroke-width="2.4" stroke-linecap="round"><path d="M39 51 Q44 55 49 51"/><path d="M71 51 Q76 55 81 51"/></g>
    <g class="eyes-happy" fill="none" stroke="${eye}" stroke-width="2.4" stroke-linecap="round"><path d="M39 53 Q44 46 49 53"/><path d="M71 53 Q76 46 81 53"/></g>
    <path d="M55.5 57.5 Q58 54.8 60 57.5 Q62 54.8 64.5 57.5" fill="none" stroke="${eye}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="56" cy="84" r="1.4" fill="#9A9AA8"/><circle cx="61" cy="83" r="1.4" fill="#9A9AA8"/>
    <path d="M44 115 l1 -4 M48 115 l0 -4 M71 115 l0 -4 M75 115 l-1 -4" stroke="#F0A8A4" stroke-width="1.2" stroke-linecap="round"/>
    ${acc?.collar ? CAT_COLLAR : ''}${acc?.hat ? CAT_HAT : ''}
  </g></svg>`;
}

// สกินแมว = 5 แบบตามสี (ใช้ร่วมกันทั้งบ้าน เก็บที่ home.cat_color)
export const CAT_SKINS = Object.fromEntries(CAT_COLOR_IDS.map((id) => [id, CAT_COLORS[id].label]));

export function catSvg(colorKey, acc = null) {
  return chibiCat(colorKey, acc);
}
