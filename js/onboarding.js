import { applyTheme } from './theme.js';
import { seasonPickerHtml } from './season-picker.js';
import { esc, logoMark } from './ui.js';

// ตั้งค่าครั้งแรก: ชื่อเล่น + ฤดูที่ชอบ
export function renderOnboarding(root, ctx) {
  root.innerHTML = `
  <main class="auth">
    <div class="auth-logo">${logoMark(56)}</div>
    <h1 class="display">ตั้งค่าของคุณ</h1>
    <p class="lead">แก้ภายหลังได้ทุกเมื่อในหน้าตั้งค่า</p>
    <form id="onbForm" novalidate>
      <label class="field">
        <span>ชื่อเล่น</span>
        <input name="nickname" maxlength="20" autocomplete="nickname" value="${esc(ctx.me.nickname)}" required>
      </label>
      ${seasonPickerHtml('season', ctx.me.season)}
      <p class="form-msg" id="onbMsg" role="alert"></p>
      <button class="btn primary block" type="submit">เริ่มใช้งาน</button>
    </form>
  </main>`;

  const form = root.querySelector('#onbForm');
  const msg = root.querySelector('#onbMsg');

  form.addEventListener('change', (e) => {
    if (e.target.name === 'season') applyTheme(e.target.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = form.nickname.value.trim();
    if (!nickname) { msg.textContent = 'ใส่ชื่อเล่นก่อน'; return; }
    const season = form.season.value;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const ok = await ctx.updateProfile({ nickname, season, onboarded: true });
    if (ok) ctx.enterApp();
    else { msg.textContent = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; btn.disabled = false; }
  });
}
