import { catSvg, CAT_COLORS, CAT_COLOR_IDS, normalizeCatColor } from './cat.js';
import { esc } from './ui.js';

// ตั้งชื่อและสีแมวร่วมกัน: คนแรกเสนอ คนที่สองกดตกลงหรือเสนอชื่ออื่น
export function renderCatSetup(root, ctx, { mode, onDone }) {
  if (mode === 'confirm') drawConfirm();
  else drawPropose(ctx.home?.cat_name || '', ctx.home?.cat_color || 'white');

  function drawConfirm() {
    const h = ctx.home;
    const who = ctx.partner?.nickname || 'อีกคน';
    root.innerHTML = `
    <main class="auth editor">
      <h1 class="display">แมวของเรา</h1>
      <p class="lead">${esc(who)} ตั้งชื่อแมวไว้แล้ว ตกลงตามนี้ไหม</p>
      <div class="preview cat-preview" role="img" aria-label="แมวสี${CAT_COLORS[normalizeCatColor(h.cat_color)].label}">${catSvg(h.cat_color)}</div>
      <p class="cat-name">${esc(h.cat_name)}</p>
      <p class="form-msg" id="catMsg" role="alert"></p>
      <button class="btn primary block" id="catYes" type="button">ตกลง</button>
      <button class="btn ghost block" id="catNo" type="button" style="margin-top:.75rem">เสนอชื่ออื่น</button>
    </main>`;
    root.querySelector('#catYes').addEventListener('click', async (e) => {
      e.target.disabled = true;
      if (await ctx.saveHome({ confirmed: true })) onDone();
      else { root.querySelector('#catMsg').textContent = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; e.target.disabled = false; }
    });
    root.querySelector('#catNo').addEventListener('click', () => drawPropose(h.cat_name, h.cat_color));
  }

  function drawPropose(name, color) {
    let current = normalizeCatColor(color);
    root.innerHTML = `
    <main class="auth editor">
      <h1 class="display">ตั้งชื่อแมวของเรา</h1>
      <p class="lead">แมวตัวนี้อยู่ในบ้านของคุณสองคน อีกคนจะได้กดตกลงตอนเข้ามาครั้งแรก</p>
      <div class="preview cat-preview" id="catPreview" role="img" aria-label="ตัวอย่างแมว"></div>
      <form id="catForm" novalidate>
        <label class="field">
          <span>ชื่อแมว</span>
          <input name="cat" maxlength="20" value="${esc(name)}" required>
        </label>
        <fieldset class="opt-group">
          <legend>สกินแมว</legend>
          <div class="opt-row skin-row">
            ${CAT_COLOR_IDS.map((id) => `<button type="button" class="skin-opt" data-color="${id}" aria-pressed="false"><span class="skin-pic" aria-hidden="true">${catSvg(id)}</span><span>${CAT_COLORS[id].label}</span></button>`).join('')}
          </div>
        </fieldset>
        <p class="form-msg" id="catMsg" role="alert"></p>
        <button class="btn primary block" type="submit">ตกลง</button>
      </form>
    </main>`;
    const preview = root.querySelector('#catPreview');
    const chips = [...root.querySelectorAll('[data-color]')];
    const refresh = () => {
      preview.innerHTML = catSvg(current);
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.color === current)));
    };
    refresh();
    root.querySelector('.opt-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-color]');
      if (b) { current = b.dataset.color; refresh(); }
    });
    root.querySelector('#catForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cat_name = e.target.cat.value.trim();
      const msg = root.querySelector('#catMsg');
      if (!cat_name) { msg.textContent = 'ตั้งชื่อแมวก่อน'; return; }
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      const ok = await ctx.saveHome({ cat_name, cat_color: current, proposed_by: ctx.me.id, confirmed: false });
      if (ok) onDone();
      else { msg.textContent = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; btn.disabled = false; }
    });
  }
}
