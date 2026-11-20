// ธีมตามฤดู: แต่ละคนเลือกฤดูของตัวเอง ฝั่งตัวเองเปลี่ยนทั้งหน้า
// bg/bg2 = พื้นหลังไล่สี, surface2 = การ์ดโทนอ่อน, accent2 = สีรอง (หัวใจ ป้าย), glow = สีเงาฟุ้ง
export const SEASONS = {
  summer: {
    name: 'ร้อน',
    dark: false,
    bg: '#F1E6D4', bg2: '#F9DFBF', surface: '#FCF7EE', surface2: '#F5ECDD',
    ink: '#4A3226', muted: '#76584A', line: '#E3D0B4',
    accent: '#F28A4A', onAccent: '#331709', accentInk: '#9C4314', accent2: '#E8708A',
    glow: '#7A5230', wood: '#C79A6B', woodDark: '#9A6B43',
  },
  rain: {
    name: 'ฝน',
    dark: true,
    bg: '#1F1E24', bg2: '#25303F', surface: '#2B2A31', surface2: '#35343C',
    ink: '#F1E7DA', muted: '#BAAD9D', line: '#47444E',
    accent: '#8CC4E6', onAccent: '#0F1F2B', accentInk: '#A9D6F2', accent2: '#F49AB4',
    glow: '#000000', wood: '#5C4636', woodDark: '#3E2E23',
  },
  cool: {
    name: 'หนาว',
    dark: false,
    bg: '#EEE6E2', bg2: '#E4DDF1', surface: '#FCF8F4', surface2: '#F4ECEA',
    ink: '#3E2C38', muted: '#6C5866', line: '#DFCFCB',
    accent: '#7E5CCB', onAccent: '#FFFFFF', accentInk: '#5E3DB0', accent2: '#E8708A',
    glow: '#5E4456', wood: '#BFA08A', woodDark: '#8E7060',
  },
  spring: {
    name: 'ใบไม้ผลิ',
    dark: false,
    bg: '#F2E8DA', bg2: '#F8DDE4', surface: '#FCF7EF', surface2: '#F6EDE3',
    ink: '#45302A', muted: '#745A4E', line: '#E6D3C0',
    accent: '#F28CA8', onAccent: '#3A1420', accentInk: '#A3305A', accent2: '#E2557E',
    glow: '#7A5040', wood: '#C99C74', woodDark: '#9A6E4C',
  },
  autumn: {
    name: 'ใบไม้ร่วง',
    dark: true,
    bg: '#241A14', bg2: '#33231A', surface: '#33251C', surface2: '#3E2E23',
    ink: '#F7E9D6', muted: '#CDB294', line: '#4F3B2D',
    accent: '#EE8F3E', onAccent: '#231914', accentInk: '#F5AE68', accent2: '#E8708A',
    glow: '#000000', wood: '#6B4A32', woodDark: '#4A3222',
  },
};

export const SEASON_IDS = Object.keys(SEASONS);

const seasonOf = (id) => SEASONS[id] || SEASONS.summer;

export function applyTheme(id) {
  const s = seasonOf(id);
  const root = document.documentElement;
  root.dataset.season = id in SEASONS ? id : 'summer';
  root.dataset.dark = s.dark ? '1' : '0';
  root.style.colorScheme = s.dark ? 'dark' : 'light';
  const vars = {
    bg: s.bg, bg2: s.bg2, surface: s.surface, surface2: s.surface2, ink: s.ink, muted: s.muted, line: s.line,
    accent: s.accent, 'on-accent': s.onAccent, 'accent-ink': s.accentInk, accent2: s.accent2, glow: s.glow,
    wood: s.wood, 'wood-dark': s.woodDark,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(`--${k}`, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.bg);
}
