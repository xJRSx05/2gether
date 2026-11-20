import { esc, toast } from './ui.js';
import { SEASONS } from './theme.js';
import { seasonPickerHtml } from './season-picker.js';
import { avatarSvg } from './avatar.js';
import { todayIso, dayNumber, timeLightOn, setTimeLight } from './days.js';
import { liteSetting, setLite, weakDevice } from './perf.js';
import { spotifyLinked, spotifyConnect, spotifyUnlink, spotifyReady } from './music.js';
import { googleLinked, googleConnect, googleUnlink, preloadGoogle } from './tv.js';
import { GOOGLE_CLIENT_ID } from './config.js';
import { isAdmin, confirmReset } from './admin.js';
import { catSvg, CAT_SKINS, CAT_COLOR_IDS, normalizeCatColor } from './cat.js';
import { refreshApp } from './ui.js';
import { pushState, enablePush, disablePush, setDnd, getDnd, sendPush, pushFailText } from './push.js';

export const settings = {
  mount(root, ctx) {
    root.innerHTML = `
    <section class="page settings">
      <div class="settings-top"><h1 class="page-title">ตั้งค่า</h1>
        <button type="button" class="btn small" id="appRefresh"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/></svg>รีเฟรชแอป</button></div>

      <form id="nameForm" class="block-section" novalidate>
        <h2>ชื่อเล่น</h2>
        <label class="field">
          <span class="sr-only">ชื่อเล่น</span>
          <input name="nickname" maxlength="20" autocomplete="nickname" value="${esc(ctx.me.nickname)}" required>
        </label>
        <button class="btn" type="submit">บันทึกชื่อ</button>
      </form>

      <section class="block-section">
        <h2>ตัวละคร</h2>
        <div class="settings-avatar">
          <div class="mini-av" aria-hidden="true">${avatarSvg(ctx.me.avatar)}</div>
          <button class="btn" id="editAvatar" type="button">แก้ตัวละคร</button>
        </div>
      </section>

      <section class="block-section">
        <h2>สกินแมว ${esc(ctx.home?.cat_name || '')}</h2>
        <p class="hint">ใช้ร่วมกันทั้งบ้าน เปลี่ยนแล้วอีกคนเห็นด้วย</p>
        <div class="skin-row" id="skinRow" role="radiogroup" aria-label="สกินแมว">
          ${CAT_COLOR_IDS.map((id) => `<button type="button" class="skin-opt" role="radio" data-skin="${id}" aria-checked="${normalizeCatColor(ctx.home?.cat_color) === id}">
            <span class="skin-pic" aria-hidden="true">${catSvg(id)}</span><span>${CAT_SKINS[id]}</span></button>`).join('')}
        </div>
      </section>

      <section class="block-section">
        <h2>แสงในห้องตามเวลา</h2>
        <p class="hint">เช้าสว่าง เย็นสีส้ม กลางคืนไฟหรี่และโคมไฟเรือง (ตามเวลาไทย ตั้งค่าเฉพาะเครื่องนี้)</p>
        <label class="switch">
          <input type="checkbox" id="timeToggle" role="switch" ${timeLightOn() ? 'checked' : ''}>
          <span class="switch-track" aria-hidden="true"></span>
          <span>เปิดแสงตามเวลา</span>
        </label>
      </section>

      <section class="block-section">
        <h2>บัญชีที่เชื่อม</h2>
        <p class="hint">เชื่อมครั้งเดียวต่อเครื่อง ใช้กับทีวีและเครื่องเล่นเพลงในห้อง</p>
        <div class="link-rows" id="linkRows"></div>
      </section>

      <section class="block-section">
        <h2>โหมดประหยัด</h2>
        <p class="hint">ปิดเอฟเฟกต์พื้นหลัง ลดอนุภาค เงา และความเบลอ ให้เครื่องลื่นขึ้นและประหยัดแบต ${weakDevice() ? '(เครื่องนี้แนะนำให้เปิด)' : ''}</p>
        <div class="seg" role="radiogroup" aria-label="โหมดประหยัด" id="liteSeg">
          ${[['auto', 'อัตโนมัติ'], ['on', 'เปิด'], ['off', 'ปิด']].map(([v, l]) => `<button type="button" role="radio" data-lite="${v}" aria-checked="${liteSetting() === v}">${l}</button>`).join('')}
        </div>
      </section>

      <form id="startForm" class="block-section" novalidate>
        <h2>วันเริ่มคบ</h2>
        <p class="hint" style="margin-top:0">ตั้งแล้วใช้ร่วมกันทั้งสองคน วันที่ตั้งนับเป็นวันที่ 1 ใครแก้ก็ได้</p>
        <label class="field">
          <span class="sr-only">วันเริ่มคบ</span>
          <input type="date" name="start" max="${todayIso()}" value="${esc(ctx.home?.start_date || '')}">
        </label>
        <p class="dnd-note" id="startNote" aria-live="polite">${dayNumber(ctx.home?.start_date) ? `ตอนนี้อยู่ด้วยกันมา ${dayNumber(ctx.home?.start_date)} วัน` : 'ยังไม่ได้ตั้งวัน'}</p>
        <button class="btn" type="submit">บันทึกวัน</button>
      </form>

      <section class="block-section">
        <h2>แจ้งเตือน</h2>
        <p class="hint" style="margin-top:0">ตอนคุณไม่ได้เปิดแอป เครื่องนี้จะเด้งเตือนเมื่ออีกคนส่งข้อความ (ขึ้นชื่อและข้อความ) กด "กลับบ้านกันเถอะ" กดคิดถึง หรือชวนดูหนัง ฟังเพลง เล่นเกม ไอคอนแอปขึ้นตัวเลขข้อความที่ยังไม่อ่าน</p>
        <label class="switch">
          <input type="checkbox" id="pushToggle" role="switch" disabled>
          <span class="switch-track" aria-hidden="true"></span>
          <span id="pushLabel">กำลังตรวจสอบ...</span>
        </label>
        <p class="hint" id="pushNote"></p>
        <button type="button" class="btn small" id="pushTest" hidden>ทดสอบแจ้งเตือน (ส่งมาเครื่องนี้)</button>
        <p class="hint" id="pushTestNote" aria-live="polite"></p>
        <div class="dnd" id="dnd" hidden>
          <p class="dnd-note" id="dndNote" aria-live="polite"></p>
          <div class="opt-row">
            <button type="button" class="chip" data-hours="1">พัก 1 ชั่วโมง</button>
            <button type="button" class="chip" data-hours="8">พัก 8 ชั่วโมง</button>
            <button type="button" class="chip" data-hours="0">เปิดตามปกติ</button>
          </div>
        </div>
      </section>

      <form id="seasonForm" class="block-section" novalidate>
        <h2>ธีมของคุณ</h2>
        <p class="hint">เปลี่ยนแล้วมีผลทันที สีและวิวนอกหน้าต่างในห้องของคุณจะเปลี่ยนตามฤดู</p>
        ${seasonPickerHtml('season', ctx.me.season)}
      </form>

      <section class="block-section">
        <h2>ติดตั้งเป็นแอป</h2>
        <details>
          <summary>iPhone / iPad (Safari)</summary>
          <p>กดปุ่มแชร์ที่แถบล่าง เลือก "เพิ่มไปยังหน้าจอโฮม" แล้วเปิดจากไอคอนบนหน้าจอโฮม ต้องใช้ iOS 16.4 ขึ้นไปเพื่อรับแจ้งเตือน</p>
        </details>
        <details>
          <summary>Android (Chrome)</summary>
          <p>กดเมนู ⋮ มุมขวาบน เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"</p>
        </details>
        <details>
          <summary>คอมพิวเตอร์ (Chrome / Edge)</summary>
          <p>กดไอคอนติดตั้งที่ท้ายแถบที่อยู่ หรือเมนู ⋮ เลือก "ติดตั้ง 2gether"</p>
        </details>
      </section>

      ${isAdmin(ctx) ? `<section class="block-section admin-sec">
        <h2>ผู้ดูแลระบบ</h2>
        <p class="hint">เฉพาะบัญชีผู้ดูแล ลบข้อมูลของทั้งสองคนได้ ตัวระบบ (ตาราง ฟังก์ชัน การตั้งค่าเว็บ) ยังอยู่ครบ</p>
        <div class="admin-rows">
          <div class="admin-row"><span><b>ล้างประวัติทั้งหมด</b><small>แชท ผลเกม ของสะสม สมุด Bond บันทึกรายวัน</small></span><button type="button" class="btn small danger" data-reset="history">ล้างประวัติ</button></div>
          <div class="admin-row"><span><b>รีเซ็ตทั้งหมด</b><small>ลบทุกอย่างรวมบัญชีทั้งสองคน เหมือนติดตั้งใหม่</small></span><button type="button" class="btn small danger" data-reset="all">รีเซ็ต</button></div>
        </div>
      </section>` : ''}

      <section class="block-section">
        <h2>บัญชี</h2>
        <button class="btn ghost" id="signOut" type="button">ออกจากระบบ</button>
      </section>
    </section>`;


    // ไอคอนหน้าหัวข้อแต่ละการ์ด
    const ICO = {
      'ชื่อเล่น': '<path d="M4 20c1-4 4-6 8-6s7 2 8 6"/><circle cx="12" cy="8" r="4"/>',
      'ตัวละคร': '<circle cx="12" cy="9" r="5"/><path d="M7 21v-2a5 5 0 0 1 10 0v2"/><path d="M9 8h.01M15 8h.01"/>',
      'สกินแมว': '<path d="M5 20c-1-2-1.5-4-1-7L4 4l4.5 3.5h7L20 4l.1 9c.4 3 0 5-1.1 7z"/><path d="M9.5 13h.01M14.5 13h.01M11 16q1 1 2 0"/>',
      'แสงในห้องตามเวลา': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      'วันเริ่มคบ': '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 17s-2.5-1.5-2.5-3a1.3 1.3 0 0 1 2.5-.5 1.3 1.3 0 0 1 2.5.5c0 1.5-2.5 3-2.5 3z"/>',
      'แจ้งเตือน': '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
      'ธีมของคุณ': '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1-.8-1.4-.8-2.4 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-4.6-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
      'ติดตั้งเป็นแอป': '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7M9 11l3 3 3-3"/>',
      'บัญชี': '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
    };
    root.querySelectorAll('.block-section > h2').forEach((h) => {
      const key = Object.keys(ICO).find((k) => h.textContent.trim().startsWith(k));
      if (key) h.insertAdjacentHTML('afterbegin', `<span class="h-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[key]}</svg></span>`);
    });

    root.querySelector('#appRefresh').addEventListener('click', () => refreshApp());
    const pushToggle = root.querySelector('#pushToggle');
    const pushLabel = root.querySelector('#pushLabel');
    const pushNote = root.querySelector('#pushNote');
    const NOTES = {
      'ios-install': 'iPhone ต้องติดตั้งเว็บลงหน้าจอโฮมก่อน (ดูวิธีด้านล่าง) แล้วเปิดจากไอคอนนั้น จึงจะเปิดแจ้งเตือนได้',
      unsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน ลองใช้ Chrome หรือ Safari เวอร์ชันใหม่',
      denied: 'เครื่องนี้บล็อกการแจ้งเตือนไว้ ไปที่ตั้งค่าของเบราว์เซอร์แล้วอนุญาตแจ้งเตือนให้เว็บนี้ จากนั้นกลับมาเปิดสวิตช์',
    };
    const dnd = root.querySelector('#dnd');
    const dndNote = root.querySelector('#dndNote');
    const paintDnd = async () => {
      const until = await getDnd(ctx.me.id);
      dndNote.textContent = until
        ? `พักแจ้งเตือนถึง ${until.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.`
        : 'ตอนนี้รับแจ้งเตือนตามปกติ';
    };
    const pushTest = root.querySelector('#pushTest');
    const pushTestNote = root.querySelector('#pushTestNote');
    pushTest.addEventListener('click', async () => {
      pushTest.disabled = true;
      pushTestNote.textContent = 'กำลังส่ง... ถ้าได้ จะมีแจ้งเตือนเด้งขึ้นภายในไม่กี่วินาที (ลองล็อกจอหรือออกจากแอปดูด้วย)';
      const r = await sendPush('test');
      pushTest.disabled = false;
      pushTestNote.textContent = r.result === 'ok' ? 'ส่งแล้ว ถ้าไม่เด้ง ลองปิดแล้วเปิดสวิตช์แจ้งเตือนใหม่ หรือดูว่าโทรศัพท์ไม่ได้ปิดเสียงแจ้งเตือนแอปนี้'
        : r.result === 'no_sub' ? 'เซิร์ฟเวอร์ยังไม่รู้จักเครื่องนี้ ลองปิดแล้วเปิดสวิตช์แจ้งเตือนใหม่' : pushFailText(r);
    });
    const paintPush = (st) => {
      pushTest.hidden = st !== 'on';
      dnd.hidden = st !== 'on';
      if (st === 'on') paintDnd();
      pushToggle.checked = st === 'on';
      pushToggle.disabled = !['on', 'off'].includes(st);
      pushLabel.textContent = st === 'on' ? 'เปิดอยู่' : st === 'off' ? 'ปิดอยู่' : 'ใช้ไม่ได้ในตอนนี้';
      pushNote.textContent = NOTES[st] || '';
    };
    pushState().then(paintPush);
    dnd.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-hours]');
      if (!btn) return;
      try {
        await setDnd(ctx.me.id, Number(btn.dataset.hours) || null);
        await paintDnd();
      } catch (err) {
        console.error(err);
        toast('ตั้งค่าไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
      }
    });
    pushToggle.addEventListener('change', async () => {
      const want = pushToggle.checked;
      pushToggle.disabled = true;
      try {
        const st = want ? await enablePush(ctx.me.id) : await disablePush(ctx.me.id);
        paintPush(st);
        toast(st === 'on' ? 'เปิดแจ้งเตือนแล้ว' : st === 'off' ? 'ปิดแจ้งเตือนแล้ว' : 'ไม่ได้รับอนุญาตแจ้งเตือน', st === 'denied' ? 'error' : undefined);
      } catch (err) {
        console.error(err);
        toast('เปิดแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
        paintPush(await pushState());
      }
    });


    root.querySelector('#startForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = e.target.start.value || null;
      if (v && v > todayIso()) { toast('เลือกวันที่ไม่เกินวันนี้', 'error'); return; }
      if (!(await ctx.saveHome({ start_date: v }))) return;
      const n = dayNumber(v);
      root.querySelector('#startNote').textContent = n ? `ตอนนี้อยู่ด้วยกันมา ${n} วัน` : 'ยังไม่ได้ตั้งวัน';
      toast('บันทึกวันเริ่มคบแล้ว');
      ctx.checkMilestone();
    });

    root.querySelector('#nameForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = e.target.nickname.value.trim();
      if (!nickname) { toast('ใส่ชื่อเล่นก่อน', 'error'); return; }
      if (await ctx.updateProfile({ nickname })) toast('บันทึกชื่อแล้ว');
    });

    root.querySelector('#seasonForm').addEventListener('change', async (e) => {
      if (e.target.name !== 'season') return;
      const season = e.target.value;
      if (await ctx.updateProfile({ season })) toast(`เปลี่ยนเป็นฤดู${SEASONS[season].name}แล้ว`);
    });

    root.querySelector('#editAvatar').addEventListener('click', () => ctx.editAvatar());

    root.querySelector('#timeToggle').addEventListener('change', (e) => setTimeLight(e.target.checked));
    const paintLinks = () => {
      const rows = [
        { k: 'sp', name: 'Spotify', sub: spotifyReady() ? (spotifyLinked() ? 'เชื่อมแล้ว ฟังเพลงด้วยกันได้' : 'ต้องใช้ Spotify Premium') : 'ยังไม่ได้ตั้งค่าในแอป (ดู README)', on: spotifyLinked(), can: spotifyReady() },
        { k: 'yt', name: 'YouTube', sub: GOOGLE_CLIENT_ID ? (googleLinked() ? 'เชื่อมแล้ว เห็นช่องที่ติดตามและเพลย์ลิสต์' : 'ไม่เชื่อมก็ดูได้ เชื่อมเพื่อเห็นช่องที่ติดตาม') : 'ยังไม่ได้ตั้งค่าในแอป (ดู README)', on: googleLinked(), can: Boolean(GOOGLE_CLIENT_ID) },
      ];
      root.querySelector('#linkRows').innerHTML = rows.map((r) => `<div class="link-row${r.on ? ' on' : ''}"><span class="lr-dot" aria-hidden="true"></span><span class="lr-meta"><b>${r.name}</b><small>${r.sub}</small></span>${r.can ? `<button type="button" class="btn small${r.on ? '' : ' primary'}" data-link="${r.k}">${r.on ? 'ยกเลิก' : 'เชื่อม'}</button>` : ''}</div>`).join('');
    };
    paintLinks();
    preloadGoogle();
    root.querySelector('#linkRows').addEventListener('click', (e) => {
      const b = e.target.closest('[data-link]');
      if (!b) return;
      if (b.dataset.link === 'sp') { if (spotifyLinked()) { spotifyUnlink(); paintLinks(); } else spotifyConnect(); }
      else if (googleLinked()) { googleUnlink(); paintLinks(); }
      else googleConnect().then(paintLinks).catch(() => toast('เชื่อม YouTube ไม่สำเร็จ ลองใหม่อีกครั้ง', 'error'));
    });
    root.querySelector('#liteSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lite]');
      if (!b) return;
      setLite(b.dataset.lite);
      root.querySelectorAll('[data-lite]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    });
    root.querySelector('#skinRow').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-skin]');
      if (!b || b.getAttribute('aria-checked') === 'true') return;
      const ok = await ctx.saveHome({ cat_color: b.dataset.skin });
      if (!ok) return;
      root.querySelectorAll('[data-skin]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      toast(`เปลี่ยนเป็นสกิน${CAT_SKINS[b.dataset.skin]}แล้ว`);
    });
    root.querySelector('#signOut').addEventListener('click', () => ctx.signOut());
    root.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => confirmReset(ctx, b.dataset.reset)));
  },
};
