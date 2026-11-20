import { catSvg } from './cat.js';

// ไอคอนประจำเกม (SVG เส้นสีขาวบนแผ่นสี) ใช้บนการ์ดเกม
const I = {
  xo: '<path d="M5 5l5 5M10 5l-5 5"/><circle cx="16.5" cy="16.5" r="3"/><path d="M12 3v18M3 12h18" opacity=".45"/>',
  connect4: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.6"/><circle cx="12" cy="13" r="1.6"/><circle cx="16" cy="9" r="1.6"/><circle cx="8" cy="15" r="1.6"/><circle cx="16" cy="15" r="1.6"/>',
  gomoku: '<path d="M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" opacity=".5"/><circle cx="8" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="16" cy="12" r="2.2" fill="currentColor"/>',
  othello: '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor"/>',
  checkers: '<ellipse cx="12" cy="15" rx="7" ry="3"/><path d="M5 15v-3c0-1.7 3.1-3 7-3s7 1.3 7 3v3"/><ellipse cx="12" cy="12" rx="7" ry="3"/><path d="M12 5l1.2 1.6 1.8-.6-.5 1.8"/>',
  dots: '<circle cx="6" cy="6" r="1.4" fill="currentColor"/><circle cx="12" cy="6" r="1.4" fill="currentColor"/><circle cx="18" cy="6" r="1.4" fill="currentColor"/><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/><circle cx="6" cy="18" r="1.4" fill="currentColor"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/><circle cx="18" cy="18" r="1.4" fill="currentColor"/><path d="M6 6h6v6H6zM12 12h6"/>',
  battleship: '<path d="M3 15h18l-2.5 4h-13z"/><path d="M7 15v-4h8l2 4M10 11V7h3v4"/><path d="M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" opacity=".6"/>',
  mancala: '<rect x="2.5" y="6" width="19" height="12" rx="6"/><circle cx="8" cy="10" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="8" cy="14" r="1.5"/><circle cx="12" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/>',
  rps: '<path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v6M13 10.5V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M16 10.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.5A5.5 5.5 0 0 1 6 14.5V12a1.5 1.5 0 0 1 3 0"/>',
  memory: '<rect x="3.5" y="5" width="8" height="11" rx="2" transform="rotate(-8 7.5 10.5)"/><rect x="12" y="7" width="8" height="11" rx="2" transform="rotate(8 16 12.5)"/><path d="M16 10.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z" fill="currentColor"/>',
  hangman: '<path d="M4 20h9M7 20V4h8v3"/><circle cx="15" cy="9.5" r="2.2"/><path d="M15 12v4M13 14h4M15 16l-2 3M15 16l2 3"/>',
  pong: '<path d="M5 4v6M19 14v6"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 3v2M12 8v1M12 15v1M12 19v2" opacity=".5"/>',
  chess: '<path d="M8 20h8M9 20l.8-6h4.4l.8 6M9.5 14C8 12.5 8 10 9.5 8.5l1-1-.5-2 2 1c2.5.3 4 2.5 3.5 5.5l-.5 2"/><circle cx="11.6" cy="9.4" r=".6" fill="currentColor"/>',
  cookcat: '<path d="M4 12h16a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M7 12V9l2 1.5L11 9l2 1.5L15 9l2 1.5V12"/><path d="M9 21h6" />',
  cooktog: '<path d="M3 12h14v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM17 13h4"/><path d="M8 9c0-1.5 1.5-1.5 1.5-3M12 9c0-1.5 1.5-1.5 1.5-3"/>',
  fish: '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3z"/><circle cx="7.5" cy="11" r=".9" fill="currentColor"/>',
  plant: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7zM12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/><path d="M7 21h10"/>',
  firefly: '<circle cx="12" cy="13" r="3.2" fill="currentColor"/><path d="M12 9.8V7M9.5 8.5 8 6.5M14.5 8.5 16 6.5"/><path d="M5 13H3M21 13h-2M6.5 18.5 5 20M17.5 18.5 19 20" opacity=".6"/>',
  starcatch: '<path d="M12 3l2 4.4 4.8.6-3.5 3.3.9 4.7L12 13.8 7.8 16l.9-4.7L5.2 8l4.8-.6z" fill="currentColor"/><path d="M5 19h14l-1.5 2.5h-11z"/>',
};
const TILE = {
  xo: '#F2617F', connect4: '#4C86D9', gomoku: '#B08A4E', othello: '#3A9A66', checkers: '#D8455F',
  dots: '#8A63D9', battleship: '#3F8FB8', mancala: '#B5733F', rps: '#F29A3A', memory: '#E07AB0',
  hangman: '#6C7A8C', pong: '#2E5BA8', chess: '#5A4A3A',
  cookcat: '#F28A3A', cooktog: '#E06A4E', fish: '#3FA2C8', plant: '#5FAF5A', firefly: '#3A4A8A', starcatch: '#5B4FB8',
};

export const gameIcon = (id) => `<span class="gi" style="--tile:${TILE[id] || 'var(--accent)'}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[id] || I.xo}</svg></span>`;

// ภาพปกการ์ดเกม: ฉากเล็กๆ สีประจำเกม + ไอคอนใหญ่ + แมวโผล่ (เกมที่เล่นกับแมว/ในบ้าน)
const SCENE = {
  fish: '<span class="gt-water"></span>', plant: '<span class="gt-soil"></span>', firefly: '<span class="gt-stars"></span>',
  starcatch: '<span class="gt-stars"></span>', cookcat: '<span class="gt-counter"></span>', cooktog: '<span class="gt-counter"></span>',
};
const WITH_CAT = ['cookcat', 'cooktog', 'fish', 'plant', 'firefly', 'starcatch'];
export const gameThumb = (id, catColor) => `<span class="gthumb${['firefly', 'starcatch'].includes(id) ? ' night' : ''}" style="--tile:${TILE[id] || 'var(--accent)'}" aria-hidden="true">
  <span class="gt-blob b1"></span><span class="gt-blob b2"></span>${SCENE[id] || ''}
  <svg class="gt-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[id] || I.xo}</svg>
  ${WITH_CAT.includes(id) ? `<span class="gt-cat">${catSvg(catColor)}</span>` : ''}
</span>`;
