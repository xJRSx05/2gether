// ผู้ดูแล: ล้างประวัติ หรือรีเซ็ตทั้งหมด (เซิร์ฟเวอร์ตรวจสิทธิ์จากอีเมลอีกชั้น ดู supabase/schema-admin.sql)
import { sb } from './supabase.js';
import { esc, toast } from './ui.js';
import { modal } from './play-invite.js';

export const ADMIN_EMAIL = 'rxnnxphxt2005@gmail.com';
export const isAdmin = (ctx) => ctx.email === ADMIN_EMAIL;

// ล้างข้อมูลที่เก็บไว้ในเครื่อง (ตำแหน่ง ประวัติทีวี/เพลง แคช การเชื่อมบัญชี) เก็บไว้แค่ค่าตั้งของเครื่อง
export function clearLocal() {
  const keep = new Set(['2gether.lite', '2gether.timelight']);
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('2gether.') && !keep.has(k)).forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter((k) => k.startsWith('2gether.')).forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ไม่เป็นไร */ }
}

const PLAN = {
  history: {
    title: 'ล้างประวัติทั้งหมด',
    body: 'ลบแชท ผลเกม ของสะสม สมุดความทรงจำ Bond และบันทึกรายวันทั้งหมดของทั้งสองคน บัญชี ตัวละคร แมว และวันเริ่มคบยังอยู่',
    word: 'ล้างประวัติ',
  },
  all: {
    title: 'รีเซ็ตทั้งหมด',
    body: 'ลบทุกอย่างรวมถึงบัญชีของทั้งสองคน เหมือนเพิ่งติดตั้งเว็บใหม่ ต้องสมัครบัญชีใหม่ทั้งคู่ ตัวระบบยังอยู่ครบ',
    word: 'ลบทั้งหมด',
  },
};

export function confirmReset(ctx, scope) {
  const p = PLAN[scope];
  const { ov, close } = modal('admin-confirm', `
    <div class="ac-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></div>
    <h2>${esc(p.title)}?</h2>
    <p class="sheet-sub">${esc(p.body)}</p>
    <p class="ac-warn">ย้อนกลับไม่ได้ ข้อมูลจะหายถาวร</p>
    <label class="ac-label" for="acWord">พิมพ์ <b>${esc(p.word)}</b> เพื่อยืนยัน</label>
    <input id="acWord" class="ac-input" type="text" autocomplete="off" spellcheck="false">
    <p class="ac-err" id="acErr" hidden>พิมพ์ให้ตรงกับคำด้านบนก่อนนะ</p>
    <div class="ip-btns"><button type="button" class="btn danger" data-go>${esc(p.title)}</button><button type="button" class="btn" data-close>ยกเลิก</button></div>`, p.title);
  const input = ov.querySelector('#acWord');
  const err = ov.querySelector('#acErr');
  input.addEventListener('input', () => { err.hidden = true; });
  ov.querySelector('[data-go]').addEventListener('click', async (e) => {
    if (input.value.trim() !== p.word) { err.hidden = false; input.focus(); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'กำลังลบ...';
    const { error } = await sb.rpc('admin_reset', { scope });
    if (error) {
      btn.disabled = false;
      btn.textContent = p.title;
      const missing = /admin_reset|function|schema cache/i.test(error.message || '');
      toast(missing ? 'ยังไม่ได้รัน supabase/schema-admin.sql' : /NOT_ADMIN/.test(error.message) ? 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล' : `ลบไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }
    // บอกอีกเครื่องให้ล้างข้อมูลในเครื่องด้วย
    ctx.send('admin', { t: 'reset', scope });
    clearLocal();
    close();
    toast(scope === 'all' ? 'รีเซ็ตทั้งหมดแล้ว' : 'ล้างประวัติแล้ว');
    setTimeout(async () => {
      if (scope === 'all') { try { await sb.auth.signOut(); } catch { /* บัญชีถูกลบแล้ว */ } }
      location.replace(`${location.pathname}#/home`);
      location.reload();
    }, 900);
  });
}

// อีกเครื่องได้รับแจ้งว่าผู้ดูแลล้างข้อมูล
export async function handleAdminEvent(p) {
  if (p?.t !== 'reset') return;
  clearLocal();
  toast(p.scope === 'all' ? 'ข้อมูลทั้งหมดถูกรีเซ็ตแล้ว' : 'ประวัติทั้งหมดถูกล้างแล้ว');
  if (p.scope === 'all') { try { await sb.auth.signOut(); } catch { /* ไม่เป็นไร */ } }
  setTimeout(() => location.reload(), 1500);
}
