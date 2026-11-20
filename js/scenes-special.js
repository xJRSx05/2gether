// ฉากพิเศษ: นอนกอดกันบนเตียง (มุมมองจากด้านบน) ใช้ตอนทั้งคู่นอนในห้องนอน
// ท่า: หันหน้าเข้าหากัน หน้าผากชนกัน ผ้าห่มคลุมถึงไหล่ ขยับตามจังหวะหายใจ
import { avatarSvg } from './avatar.js';

// วาดหัวตัวละครจาก SVG ตัวเต็ม (ครอปเฉพาะหัว) แล้ววางในฉาก
const head = (av, x, y, size, rot) => {
  const inner = avatarSvg({ ...(av || {}), eyes: 'sleepy', accHead: 'none', accFace: 'none', accNeck: 'none' })
    .replace('<svg class="av" viewBox="0 0 100 160" aria-hidden="true">', '')
    .replace(/<\/svg>\s*$/, '');
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><svg x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" viewBox="8 6 84 84" overflow="hidden">${inner}</svg></g>`;
};

export function bedTopSvg(meAv, partnerAv) {
  return `<svg class="td-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="tdLamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE3A8" stop-opacity=".8"/><stop offset="1" stop-color="#FFE3A8" stop-opacity="0"/></radialGradient>
      <linearGradient id="tdMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9FC4FF" stop-opacity=".4"/><stop offset="1" stop-color="#9FC4FF" stop-opacity="0"/></linearGradient>
      <linearGradient id="tdBlanket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F1FF"/><stop offset="1" stop-color="#D9D1F0"/></linearGradient>
      <linearGradient id="tdBump" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".65"/><stop offset="1" stop-color="#BDB2E0" stop-opacity=".35"/></linearGradient>
    </defs>
    <!-- พื้นไม้ + พรม -->
    <rect width="800" height="500" fill="#7A5B45"/>
    <g stroke="#6A4C38" stroke-width="2">${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 70}" y1="0" x2="${i * 70}" y2="500"/>`).join('')}</g>
    <ellipse cx="400" cy="480" rx="320" ry="70" fill="#5E7BA8" opacity=".5"/>
    <!-- โต๊ะข้างเตียง + โคม -->
    <rect x="136" y="40" width="72" height="96" rx="10" fill="#B98757" stroke="#8A5F3C" stroke-width="4"/>
    <rect x="592" y="40" width="72" height="96" rx="10" fill="#B98757" stroke="#8A5F3C" stroke-width="4"/>
    <circle cx="628" cy="88" r="24" fill="#FFE9B8" stroke="#D9B272" stroke-width="3"/>
    <circle cx="628" cy="88" r="170" fill="url(#tdLamp)"/>
    <!-- เครื่องเล่นแผ่นเสียงบนโต๊ะข้างเตียง (แตะเพื่อเลือกเพลง) -->
    <g class="td-rp" role="button" tabindex="0" aria-label="เครื่องเล่นแผ่นเสียง แตะเพื่อเลือกเพลง">
      <rect x="144" y="52" width="56" height="64" rx="7" fill="#E9C08B" stroke="#7A5233" stroke-width="3"/>
      <g class="td-disc"><circle cx="170" cy="86" r="21" fill="#2B2430"/><circle cx="170" cy="86" r="13" fill="none" stroke="#4A4050" stroke-width="1.5"/><circle cx="170" cy="86" r="6" fill="#F2617F"/><circle cx="170" cy="86" r="1.5" fill="#2B2430"/></g>
      <path d="M194 58v18l-10 9" fill="none" stroke="#5A5A62" stroke-width="3.5" stroke-linecap="round"/><circle cx="194" cy="58" r="3.5" fill="#5A5A62"/>
    </g>
    <!-- เตียง + หมอนยาวใบเดียว -->
    <rect x="212" y="10" width="376" height="490" rx="22" fill="#8E6AD8" stroke="#5E3DB0" stroke-width="6"/>
    <rect x="226" y="34" width="348" height="470" rx="16" fill="#FAF7F2"/>
    <rect x="248" y="48" width="304" height="104" rx="44" fill="#FFFFFF" stroke="#E2DCEB" stroke-width="4"/>
    <path d="M276 100 Q400 120 524 100" fill="none" stroke="#EEE9F4" stroke-width="5"/>
    <!-- หัว: หันเข้าหากัน หน้าผากชนกัน -->
    <g class="td-heads">
      ${head(partnerAv, 462, 136, 146, -26)}
      ${head(meAv, 338, 136, 146, 26)}
    </g>
    <!-- ผ้าห่ม: สองร่างใต้ผ้าห่ม หายใจขึ้นลง -->
    <g class="td-blanket">
      <path d="M226 206 Q300 186 400 200 Q500 186 574 206 L574 500 L226 500Z" fill="url(#tdBlanket)" stroke="#C9C1E3" stroke-width="4"/>
      <path d="M262 214 Q300 360 286 498 L358 498 Q384 360 386 222Z" fill="url(#tdBump)"/>
      <path d="M414 222 Q416 360 442 498 L514 498 Q500 360 538 214Z" fill="url(#tdBump)"/>
      <g fill="none" stroke="#C7BEE4" stroke-width="3" opacity=".9"><path d="M400 214 Q404 360 400 498"/><path d="M268 330 Q300 344 330 328"/><path d="M470 330 Q500 344 532 328"/><path d="M300 430 Q330 442 360 428"/></g>
      <path d="M228 218 Q400 240 572 218" fill="none" stroke="#FFFFFF" stroke-width="10" opacity=".85"/>
    </g>
    <!-- หัวใจเล็กลอยจากหน้าผาก -->
    <path class="td-heart" d="M400 46 c-6 -8 -18 -6 -18 4 c0 8 18 18 18 18 s18 -10 18 -18 c0 -10 -12 -12 -18 -4z" fill="#F2617F"/>
    <!-- แสงจันทร์ + มืดลง -->
    <rect width="800" height="500" fill="#1A2350" opacity=".34"/>
    <path d="M0 0 L150 0 L240 500 L0 500Z" fill="url(#tdMoon)"/>
    <g class="td-z" font-family="Itim, sans-serif" fill="#FFFFFF"><text x="520" y="150" font-size="28">Z</text><text x="550" y="118" font-size="36">Z</text><text x="586" y="82" font-size="44">Z</text></g>
  </svg>`;
}
