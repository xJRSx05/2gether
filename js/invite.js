import { cooldownLeft } from './push.js';
import { inviteGame } from './play-invite.js';

// ชวนอีกคนมาเล่นเกมจากการ์ดในห้อง: ใช้ระบบเดียวกับปุ่ม "ชวนเล่น" บนหัวเว็บ
export async function invitePartner(ctx, { id }) {
  await inviteGame(ctx, id);
}

// ข้อความใต้ปุ่มเกม บอกสถานะอีกคน (ใช้ร่วมกันทุกห้องเกม)
export function inviteHint(ctx, label, together) {
  const name = ctx.partnerPresence?.nickname || ctx.partner?.nickname || '';
  const left = cooldownLeft('play');
  if (!ctx.partner) return '';
  if (together) return 'เล่นพร้อมกันสองคน ได้ Bond +3 ต่อเกมต่อวัน (ครั้งแรกของวัน)';
  if (ctx.partnerPresence && ctx.partnerPresence.page !== 'away') return `${name} อยู่ห้องอื่น กดเกมเพื่อชวน พอเขากดรับ ระบบจะพามาที่${label}เอง`;
  if (ctx.partnerPush === false) return `${name} ยังไม่ได้เปิดแจ้งเตือนในหน้าตั้งค่า จึงชวนตอนเขาปิดเว็บไม่ได้`;
  if (left > 0) return `ชวนผ่านแจ้งเตือนได้อีกครั้งในอีก ${Math.ceil(left / 60)} นาที`;
  return `${name} ยังไม่ได้เปิดเว็บ กดเกมเพื่อส่งแจ้งเตือนชวน`;
}
