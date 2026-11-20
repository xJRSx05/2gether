// 2gether: ส่งแจ้งเตือนไปหาอีกคน ชนิด comehome (กลับบ้านกันเถอะ), chat (ชื่อ + ข้อความ ทุกข้อความ), wake (ปลุก), sleep (ชวนเข้านอน), play (ชวนเล่นเกม), miss (คิดถึง), tv (ชวนดูหนัง), music (ชวนฟังเพลง)
// วางไฟล์นี้ทั้งหมดใน Supabase > Edge Functions > Deploy a new function > Via Editor ชื่อ nudge-push
// ต้องตั้ง Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ดู README)
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// เวลาพักต่อชนิด (กันกดรัว) แชทแจ้งทุกข้อความ
const COOLDOWN_MS: Record<string, number> = { test: 0, comehome: 60 * 1000, chat: 0, wake: 10 * 60 * 1000, sleep: 10 * 60 * 1000, play: 10 * 60 * 1000, miss: 60 * 1000, tv: 60 * 1000, music: 60 * 1000 };
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // กุญแจฝั่งเซิร์ฟเวอร์: โปรเจกต์ใหม่ใช้ SUPABASE_SECRET_KEYS (กุญแจแบบเก่า SERVICE_ROLE อาจว่าง)
    let secretKeys: Record<string, string> = {};
    try { secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); } catch { secretKeys = {}; }
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secretKeys.default || Object.values(secretKeys)[0];
    if (!serviceKey) return reply({ ok: false, reason: 'no_service_key' });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const input = await req.json().catch(() => ({}));
    const room: string = ['garden', 'games'].includes(input?.room) ? input.room : 'kitchen';
    const kind: string = ['test', 'chat', 'wake', 'sleep', 'play', 'miss', 'tv', 'music'].includes(input?.kind) ? input.kind : 'comehome';
    // ข้อความแชท / ชื่อหนัง / ชื่อเพลง (ตัดให้สั้น)
    const text: string = typeof input?.text === 'string' ? input.text.replace(/\s+/g, ' ').trim().slice(0, 140) : '';

    // 1) ตรวจว่าใครเรียก (ต้องเป็นผู้ใช้ที่ล็อกอินอยู่)
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !auth?.user) return reply({ ok: false, reason: 'unauthorized' }, 401);
    const me = auth.user;

    // 0) ต้องมีรหัส VAPID ใน Secrets
    // ตัดช่องว่าง/ขึ้นบรรทัดใหม่ที่ติดมาตอนคัดลอกวางใน Secrets ออก
    const vPub = (Deno.env.get('VAPID_PUBLIC_KEY') || '').trim();
    const vPriv = (Deno.env.get('VAPID_PRIVATE_KEY') || '').trim();
    const vSub = (Deno.env.get('VAPID_SUBJECT') || '').trim() || 'mailto:admin@example.com';
    if (!vPub || !vPriv) return reply({ ok: false, reason: 'no_vapid' });

    // 2) หาอีกคน (ทดสอบ = ส่งหาตัวเอง)
    const { data: people } = await admin.from('profiles').select('id, nickname');
    const mine = people?.find((p) => p.id === me.id);
    const partner = kind === 'test' ? mine || { id: me.id, nickname: '' } : people?.find((p) => p.id !== me.id);
    if (!partner) return reply({ ok: false, reason: 'no_partner' });

    // 3) จำกัด 1 ครั้งต่อ 30 นาที
    const { data: state } = await admin
      .from('push_state').select('last_sent_at').eq('user_id', me.id).eq('kind', kind).maybeSingle();
    if (state && COOLDOWN_MS[kind] > 0) {
      const wait = COOLDOWN_MS[kind] - (Date.now() - new Date(state.last_sent_at).getTime());
      if (wait > 0) return reply({ ok: false, reason: 'rate', retry_after: Math.ceil(wait / 1000) });
    }

    // 4) อีกคนต้องเปิดแจ้งเตือนไว้ (ส่งทุกเครื่องที่เปิดไว้ ตาราง push_devices / ถ้ายังไม่มีตาราง ใช้เครื่องเดียวแบบเดิม)
    const { data: sub } = await admin
      .from('push_subscriptions').select('subscription, enabled, dnd_until').eq('user_id', partner.id).maybeSingle();
    const { data: devs, error: devErr } = await admin.from('push_devices').select('endpoint, subscription').eq('user_id', partner.id);
    const targets: { endpoint: string; subscription: webpush.PushSubscription }[] = !devErr && devs?.length
      ? devs
      : sub?.subscription ? [{ endpoint: sub.subscription.endpoint, subscription: sub.subscription }] : [];
    if (!targets.length || (sub && !sub.enabled)) return reply({ ok: false, reason: 'no_sub' });
    if (kind !== 'test' && sub?.dnd_until && new Date(sub.dnd_until).getTime() > Date.now()) return reply({ ok: false, reason: 'dnd' });

    try {
      webpush.setVapidDetails(vSub, vPub, vPriv);
    } catch (e) {
      // ค่าใน Secrets ผิดรูปแบบ (เช่น VAPID_SUBJECT ต้องขึ้นต้นด้วย mailto:)
      console.error('vapid', e);
      return reply({ ok: false, reason: 'no_vapid' });
    }

    const who = mine?.nickname || 'อีกคน';
    // จำนวนข้อความที่อีกคนยังไม่ได้อ่าน (ตัวเลขบนไอคอนแอป)
    const { count: unread } = await admin.from('messages').select('id', { count: 'exact', head: true })
      .eq('sender', me.id).is('read_at', null).eq('deleted', false);
    const payload = JSON.stringify({
      title: kind === 'chat' ? who : '2gether',
      badge: unread ?? undefined,
      body: kind === 'chat'
        ? (text || `มีข้อความใหม่จาก ${who}`)
        : kind === 'tv'
          ? `${who} ชวนดูหนังด้วยกัน${text ? `: ${text}` : ''}`
          : kind === 'music'
            ? `${who} ชวนฟังเพลงด้วยกัน${text ? `: ${text}` : ''}`
        : kind === 'wake'
          ? `${mine?.nickname || 'อีกคน'} ปลุกคุณ ตื่นได้แล้ว`
          : kind === 'sleep'
            ? `${mine?.nickname || 'อีกคน'} ชวนเข้านอนแล้วนะ`
            : kind === 'miss'
              ? `${mine?.nickname || 'อีกคน'} คิดถึงนะ ♥`
            : kind === 'play'
              ? `${mine?.nickname || 'อีกคน'} ชวนมาเล่นเกมที่${room === 'garden' ? 'สวน' : room === 'games' ? 'ห้องเกม' : 'ห้องครัว'}`
              : `${mine?.nickname || 'อีกคน'} ชวนกลับบ้านกันเถอะ`,
      tag: kind,
      ...(kind === 'test' ? { body: 'ทดสอบแจ้งเตือน: เครื่องนี้ได้รับแจ้งเตือนแล้ว', title: '2gether' } : {}),
      url: kind === 'test' ? './#/settings' : kind === 'chat' ? './#/chat' : kind === 'tv' || kind === 'music' ? './#/home' : kind === 'wake' || kind === 'sleep' ? './#/bedroom' : kind === 'play' ? `./#/${room}` : './',
    });

    // ส่งทุกเครื่องพร้อมกัน เครื่องไหนยกเลิกแล้ว (404/410) ลบทิ้ง
    const results = await Promise.allSettled(targets.map((t) => webpush.sendNotification(t.subscription, payload, { TTL: 60 * 60, urgency: 'high' })));
    let sent = 0;
    let keyErr = 0;
    for (let i = 0; i < results.length; i += 1) {
      const r = results[i];
      if (r.status === 'fulfilled') { sent += 1; continue; }
      const code = (r.reason as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await admin.from('push_devices').delete().eq('endpoint', targets[i].endpoint);
        if (sub?.subscription?.endpoint === targets[i].endpoint) await admin.from('push_subscriptions').delete().eq('user_id', partner.id);
      } else if (code === 401 || code === 403) keyErr += 1;
      console.error('push failed', code, r.reason);
    }
    if (!sent) return reply({ ok: false, reason: keyErr ? 'vapid_mismatch' : results.some((r) => r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number }).statusCode || 0)) ? 'no_sub' : 'send_failed' });

    await admin.from('push_state').upsert({ user_id: me.id, kind, last_sent_at: new Date().toISOString() });
    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, reason: 'error' }, 500);
  }
});
