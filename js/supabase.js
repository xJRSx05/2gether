// ไลบรารี Supabase เก็บไว้ในเว็บเอง (เดิมโหลดจาก esm.sh ซึ่งล่มหรือเปลี่ยนเวอร์ชันได้ แล้วทั้งแอปจะขาวหมด)
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
