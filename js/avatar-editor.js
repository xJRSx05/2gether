import {
  avatarSvg, normalizeAvatar, HAIR_STYLES, HAIR_ORDER, isFullOutfit, HAIR_COLORS, SKINS, EYES, EYE_LABEL, BODIES, BODY_LABEL, BODY_PRESET,
  TOP_STYLES, TOP_LABEL, TOPS, BOTTOM_STYLES, BOTTOM_LABEL, BOTTOMS, ACC_HEAD, ACC_FACE, ACC_NECK, ACC_LABEL,
} from './avatar.js';
import { bondInfo } from './bond.js';
import { toast } from './ui.js';

// หมวดตัวเลือก แบ่งเป็นแท็บ: ตัว / ผม / ชุด / ของใส่
const TABS = [
  {
    id: 'body', label: 'ตัว',
    groups: [
      { key: 'body', label: 'แบบตัว (กดแล้วได้ชุดตั้งต้นที่เข้ากัน แต่งต่อได้ทุกอย่าง)', kind: 'text', values: BODIES, text: (v) => BODY_LABEL[v] },
      { key: 'skin', label: 'สีผิว', kind: 'swatch', values: SKINS },
      { key: 'eyes', label: 'ตา', kind: 'text', values: EYES, text: (v) => EYE_LABEL[v] },
      { key: 'blush', label: 'แก้มแดง', kind: 'text', values: [true, false], text: (v) => (v ? 'มี' : 'ไม่มี') },
    ],
  },
  {
    id: 'hair', label: 'ผม',
    groups: [
      { key: 'hair', label: 'ทรงผม', kind: 'text', values: HAIR_ORDER, text: (v) => HAIR_STYLES[v] },
      { key: 'hairColor', label: 'สีผม', kind: 'swatch', values: HAIR_COLORS },
    ],
  },
  {
    id: 'outfit', label: 'ชุด',
    groups: [
      { key: 'topStyle', label: 'เสื้อและชุด', kind: 'text', values: TOP_STYLES, text: (v) => TOP_LABEL[v] },
      { key: 'top', label: 'สีเสื้อ', kind: 'swatch', values: TOPS },
      { key: 'bottom', label: 'ท่อนล่าง (ชุดเดรสและชุดทั้งตัวไม่ต้องใส่)', kind: 'text', values: BOTTOM_STYLES, text: (v) => BOTTOM_LABEL[v] },
      { key: 'bottomColor', label: 'สีท่อนล่าง', kind: 'swatch', values: BOTTOMS },
    ],
  },
  {
    id: 'acc', label: 'ของใส่',
    groups: [
      { key: 'accHead', label: 'บนหัว', kind: 'text', values: ACC_HEAD, text: (v) => ACC_LABEL[v] },
      { key: 'accFace', label: 'บนหน้า', kind: 'text', values: ACC_FACE, text: (v) => ACC_LABEL[v] },
      { key: 'accNeck', label: 'ที่คอ', kind: 'text', values: ACC_NECK, text: (v) => ACC_LABEL[v] },
    ],
  },
];
const GROUPS = TABS.flatMap((t) => t.groups);

// สร้าง/แก้ตัวละคร: เห็นตัวอย่างทันทีที่เลือก
export function renderAvatarEditor(root, ctx, { first = false, onDone, onCancel }) {
  const a = normalizeAvatar(ctx.me.avatar);
  let tab = 'body';

  const groupHtml = (g) => `
    <fieldset class="opt-group">
      <legend>${g.label}</legend>
      <div class="opt-row">
        ${g.values.map((v, i) => (g.kind === 'swatch'
    ? `<button type="button" class="swatch" data-key="${g.key}" data-i="${i}" aria-pressed="false" aria-label="${g.label} ${i + 1}" style="--c:${v}"></button>`
    : `<button type="button" class="chip" data-key="${g.key}" data-i="${i}" aria-pressed="false">${g.text(v)}</button>`)).join('')}
      </div>
    </fieldset>`;

  root.innerHTML = `
  <main class="auth editor av-editor">
    <h1 class="display">${first ? 'สร้างตัวละครของคุณ' : 'แก้ตัวละคร'}</h1>
    <p class="lead">อีกคนจะเห็นตัวละครนี้ในบ้านของเรา แก้ได้ทุกเมื่อในหน้าตั้งค่า</p>
    <div class="av-layout">
      <div class="preview av-preview" id="preview" role="img" aria-label="ตัวอย่างตัวละครของคุณ"></div>
      <form id="avForm" class="av-form" novalidate>
        <div class="tabs" role="tablist" aria-label="หมวดตัวเลือก">
          ${TABS.map((t) => `<button type="button" role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-controls="panel-${t.id}" aria-selected="false">${t.label}</button>`).join('')}
        </div>
        ${TABS.map((t) => `<div class="tab-panel" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}" hidden>${t.groups.map(groupHtml).join('')}</div>`).join('')}
        <p class="form-msg" id="avMsg" role="alert"></p>
        <button class="btn primary block" type="submit">${first ? 'ต่อไป' : 'บันทึก'}</button>
        ${first ? '' : '<button class="btn ghost block" type="button" id="avCancel" style="margin-top:.75rem">ยกเลิก</button>'}
      </form>
    </div>
  </main>`;

  const preview = root.querySelector('#preview');
  const buttons = [...root.querySelectorAll('[data-key]')];
  const tabs = [...root.querySelectorAll('[data-tab]')];

  const refresh = () => {
    preview.innerHTML = avatarSvg(a);
    for (const b of buttons) {
      const g = GROUPS.find((x) => x.key === b.dataset.key);
      b.setAttribute('aria-pressed', String(a[g.key] === g.values[Number(b.dataset.i)]));
      if (g.key === 'bottom' || g.key === 'bottomColor') b.classList.toggle('muted', isFullOutfit(a.topStyle));
    }
    tabs.forEach((t) => {
      const on = t.dataset.tab === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      root.querySelector(`#panel-${t.dataset.tab}`).hidden = !on;
    });
  };
  refresh();

  const form = root.querySelector('#avForm');
  form.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; refresh(); return; }
    const b = e.target.closest('[data-key]');
    if (!b) return;
    const g = GROUPS.find((x) => x.key === b.dataset.key);
    // เสื้อคู่เป็นรางวัล Bond Lv.10
    if (g.key === 'topStyle' && g.values[Number(b.dataset.i)] === 'couple' && bondInfo(ctx.home?.bond || 0).level < 10) { toast('เสื้อคู่ปลดล็อกเมื่อ Bond ถึง Lv.10'); return; }
    a[g.key] = g.values[Number(b.dataset.i)];
    if (g.key === 'body') Object.assign(a, BODY_PRESET[a.body]);
    refresh();
  });
  // ลูกศรซ้ายขวาเลื่อนแท็บ (ตามแบบแผน tablist)
  form.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = TABS.findIndex((t) => t.id === tab);
    tab = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    refresh();
    root.querySelector(`#tab-${tab}`).focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    const ok = await ctx.updateProfile({ avatar: a });
    if (ok) onDone();
    else { root.querySelector('#avMsg').textContent = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; btn.disabled = false; }
  });

  root.querySelector('#avCancel')?.addEventListener('click', () => onCancel?.());
}
