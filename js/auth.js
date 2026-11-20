import { sb } from './supabase.js';
import { esc, logoMark } from './ui.js';
import { avatarSvg } from './avatar.js';
import { catSvg } from './cat.js';

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7-4.6-9.3-9C1 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23 8.6 21.3 12 19 16.4 12 21 12 21z"/></svg>';

// ภาพหน้าแรก: สองคนกับแมวยืนอยู่ด้วยกัน
const heroHtml = () => `
  <div class="hero-scene" aria-hidden="true">
    <span class="hero-floor"></span>
    <span class="hero-heart">${HEART}</span><span class="hero-heart h2">${HEART}</span><span class="hero-heart h3">${HEART}</span>
    <span class="hero-av a">${avatarSvg({ body: 'f', hair: 22, hairColor: '#5A3A22', skin: '#F2C9A5', topStyle: 'cardigan', top: '#E0607E', bottom: 'skirt', bottomColor: '#5A6E9A', accHead: 'flower' })}</span>
    <span class="hero-av b">${avatarSvg({ body: 'm', hair: 16, hairColor: '#2B2118', skin: '#E3AE82', topStyle: 'hoodie', top: '#6FB6DC', accFace: 'glasses' })}</span>
    <span class="hero-cat">${catSvg('white')}</span>
  </div>`;

function thaiError(error, mode) {
  const msg = error?.message || '';
  if (/invalid login credentials/i.test(msg)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (/already registered/i.test(msg)) return 'อีเมลนี้สมัครไว้แล้ว ให้กด "เข้าสู่ระบบ" แทน';
  if (/at least \d+ characters/i.test(msg)) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (/email not confirmed/i.test(msg)) return 'ยังไม่ได้ยืนยันอีเมล ให้ปิด "Confirm email" ใน Supabase ตามคู่มือ';
  if (/rate limit|too many/i.test(msg)) return 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่';
  if (mode === 'signup' && (/database error/i.test(msg) || error?.status === 500)) {
    return 'เว็บนี้รับได้แค่ 2 บัญชี และเต็มแล้ว';
  }
  if (/failed to fetch|network/i.test(msg)) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่';
  return `เกิดข้อผิดพลาด: ${msg}`;
}

export function renderAuth(root) {
  let mode = 'signin';

  const draw = (notice = '') => {
    const signin = mode === 'signin';
    root.innerHTML = `
    <main class="auth login">
      <section class="login-hero">
        <div class="brand-line">${logoMark(44)}</div>
        <h1 class="display">2gether</h1>
        <p class="lead">บ้านเล็กๆ ของเราสองคน มีแมวหนึ่งตัว เกมเล่นด้วยกัน และสมุดความทรงจำ คนอื่นเข้าไม่ได้</p>
        ${heroHtml()}
      </section>
      <section class="auth-card">
      <h2>${signin ? 'กลับบ้านกันเถอะ' : 'สร้างบ้านของเรา'}</h2>
      <div class="segmented" role="group" aria-label="โหมด">
        <button type="button" data-mode="signin" aria-pressed="${signin}">เข้าสู่ระบบ</button>
        <button type="button" data-mode="signup" aria-pressed="${!signin}">สร้างบัญชี</button>
      </div>

      <form id="authForm" novalidate>
        <label class="field">
          <span>อีเมล</span>
          <input name="email" type="email" inputmode="email" autocomplete="email" required>
        </label>
        <label class="field">
          <span>รหัสผ่าน</span>
          <input name="password" type="password" minlength="6"
                 autocomplete="${signin ? 'current-password' : 'new-password'}" required>
        </label>
        <p class="form-msg" id="authMsg" role="alert">${esc(notice)}</p>
        <button class="btn primary block" type="submit">${signin ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}</button>
      </form>
      ${signin ? '' : '<p class="hint">บัญชีที่ 1 ของคุณ บัญชีที่ 2 ของแฟน หลังจากนั้นระบบปิดรับสมัครอัตโนมัติ</p>'}
      </section>
    </main>`;

    root.querySelectorAll('[data-mode]').forEach((b) =>
      b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));

    const form = root.querySelector('#authForm');
    const msg = root.querySelector('#authMsg');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;
      if (!email || !password) { msg.textContent = 'กรอกอีเมลและรหัสผ่านให้ครบ'; return; }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      msg.textContent = '';
      const { data, error } = signin
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
      if (error) {
        msg.textContent = thaiError(error, mode);
        btn.disabled = false;
        return;
      }
      if (!signin && !data.session) {
        mode = 'signin';
        draw('สร้างบัญชีแล้ว แต่ต้องยืนยันอีเมลก่อน (หรือปิด "Confirm email" ใน Supabase ตามคู่มือ)');
      }
      // ถ้าได้ session แล้ว onAuthStateChange ใน app.js จะพาเข้าแอปเอง
    });
  };

  draw();
}
