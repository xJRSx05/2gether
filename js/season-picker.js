import { SEASONS, SEASON_IDS } from './theme.js';

// ตัวเลือกฤดู 5 แบบ ใช้ทั้งหน้าตั้งค่าครั้งแรกและหน้าตั้งค่า
export function seasonPickerHtml(name, selected) {
  return `
  <fieldset class="seasons">
    <legend>ฤดูที่ชอบ</legend>
    ${SEASON_IDS.map((id) => {
      const s = SEASONS[id];
      return `
      <label class="season-opt">
        <input type="radio" name="${name}" value="${id}" ${id === selected ? 'checked' : ''}>
        <span class="season-swatch" style="--sw-bg:${s.bg};--sw-accent:${s.accent};--sw-line:${s.line};background-image:radial-gradient(circle at 78% 78%, ${s.accent} 0 18%, transparent 19%), url(art/windows/${id}.svg)"></span>
        <span class="season-name">${s.name}</span>
      </label>`;
    }).join('')}
  </fieldset>`;
}
