// ค่าจาก Supabase > Project Settings > API Keys
// คีย์ publishable เปิดเผยในเว็บได้ตามปกติ ความปลอดภัยมาจาก RLS ใน schema.sql
export const SUPABASE_URL = 'https://wytrhyazldsyzbdzeqki.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_UQi7zCvk5V_kqFOJdEM_eg_eO4EE8oc';

// กุญแจสาธารณะสำหรับแจ้งเตือน (ปลอดภัยที่จะเปิดเผย) คู่กับกุญแจลับที่ตั้งใน Supabase Secrets
export const VAPID_PUBLIC_KEY = 'BPhptaZUo59w57wyoQ7A4xLpkDxQUkovtGCreCV00InfJMvX5hfC-WhmxghN4ocJkvXSdMTUl0gB2HHlNBXr6dE';

// ---------- ดูทีวี (YouTube) และเครื่องเล่นเพลง (Spotify) ----------
// ดูวิธีสร้างคีย์ใน README หัวข้อ "ตั้งค่าดูทีวีและฟังเพลง" ถ้าเว้นว่าง ปุ่มจะแสดงวิธีตั้งค่าแทน
// คีย์ YouTube Data API v3 (จำกัดให้ใช้ได้เฉพาะโดเมนเว็บนี้ใน Google Cloud)
export const YOUTUBE_API_KEY = 'AIzaSyDa_rytuShgbSMd_TuQK5Vsq8ha9Cdempk';
// OAuth Client ID แบบ Web application (ใช้ดึงช่องที่ติดตามและเพลย์ลิสต์ของตัวเอง ไม่ใส่ก็ได้)
export const GOOGLE_CLIENT_ID = '594806297295-usj52ge1gtegaimraeqgk0eu7rflalvm.apps.googleusercontent.com';
// Client ID ของแอปใน Spotify for Developers (ใส่ Redirect URI เป็นที่อยู่เว็บนี้ เช่น https://xxx.netlify.app/)
export const SPOTIFY_CLIENT_ID = '47fed8afab1040f9a4b5bf94d5fa6955';
