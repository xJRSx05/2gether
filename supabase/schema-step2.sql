-- 2gether : schema ขั้นที่ 2 (บ้านของเรา)
-- รันต่อจาก schema.sql โดยวางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่พัง)

-- 1) ตัวละครของแต่ละคน (เก็บเป็นค่าที่เลือก: ทรงผม สีผม สีผิว สีเสื้อ เครื่องประดับ)
alter table public.profiles add column if not exists avatar jsonb;

-- 2) บ้านของเรา: แถวเดียว เก็บชื่อและสีแมว (ตั้งร่วมกัน) และวันที่เริ่มคบ
create table if not exists public.home (
  id           int primary key default 1 check (id = 1),
  cat_name     text check (char_length(cat_name) between 1 and 20),
  cat_color    text not null default 'white'
               check (cat_color in ('white', 'orange', 'black', 'gray', 'calico')),
  proposed_by  uuid references auth.users (id) on delete set null,
  confirmed    boolean not null default false,
  start_date   date,
  updated_at   timestamptz not null default now()
);

alter table public.home enable row level security;

drop policy if exists "home_select" on public.home;
create policy "home_select" on public.home
  for select to authenticated using (true);

drop policy if exists "home_insert" on public.home;
create policy "home_insert" on public.home
  for insert to authenticated with check (id = 1);

drop policy if exists "home_update" on public.home;
create policy "home_update" on public.home
  for update to authenticated using (id = 1) with check (id = 1);
