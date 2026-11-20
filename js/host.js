// ใครเป็น "เจ้าบ้าน" (คุมแมว): คนที่เข้าห้องก่อน ถ้าอยู่คนเดียวก็เป็นเรา
// เทียบเฉพาะค่า since ของสองคน จึงตรงกันทั้งสองเครื่องแม้นาฬิกาเพี้ยน
export function isHost(ctx) {
  const pp = ctx.partnerPresence;
  if (!pp) return true;
  if (pp.since !== ctx.since) return ctx.since < pp.since;
  return String(ctx.me.id) < String(ctx.partner?.id || '');
}
