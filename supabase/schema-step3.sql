-- 2gether : schema ขั้นที่ 2 ของงานสร้าง (เห็นกันสด + Bond + แจ้งเตือน)
-- รันต่อจาก schema.sql และ schema-step2.sql วางทั้งไฟล์แล้วกด Run (รันซ้ำได้ ไม่พัง)

-- 1) Bond: แต้มความผูกพัน เก็บในแถว home แถวเดียว
alter table public.home add column if not exists bond int not null default 0;
alter table public.home add column if not exists bond_day date;
alter table public.home add column if not exists bond_time_today int not null default 0;
alter table public.home add column if not exists bond_pet_today int not null default 0;

-- เพิ่มแต้มแบบอะตอมมิก: 'time' = อยู่บ้านพร้อมกัน +1 (สูงสุด 30 ต่อวัน)
-- 'pet' = ลูบแมวพร้อมกัน +2 (สูงสุด 10 แต้มต่อวัน) วันนับตามเวลาไทย
create or replace function public.add_bond(kind text)
returns public.home
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  h public.home;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if kind not in ('time', 'pet') then raise exception 'BAD_KIND'; end if;

  insert into public.home (id) values (1) on conflict (id) do nothing;

  update public.home
     set bond_time_today = case when bond_day is distinct from today then 0 else bond_time_today end,
         bond_pet_today  = case when bond_day is distinct from today then 0 else bond_pet_today end,
         bond_day = today
   where id = 1;

  if kind = 'time' then
    update public.home
       set bond = bond + 1, bond_time_today = bond_time_today + 1
     where id = 1 and bond_time_today < 30;
  else
    update public.home
       set bond = bond + 2, bond_pet_today = bond_pet_today + 2
     where id = 1 and bond_pet_today < 10;
  end if;

  select * into h from public.home where id = 1;
  return h;
end;
$$;

revoke all on function public.add_bond(text) from public;
grant execute on function public.add_bond(text) to authenticated;

-- 2) แจ้งเตือน: เก็บที่อยู่ปลายทางของเครื่องแต่ละคน (อ่านได้เฉพาะเจ้าของ)
create table if not exists public.push_subscriptions (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  subscription  jsonb not null,
  enabled       boolean not null default true,
  updated_at    timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_sub_select_own" on public.push_subscriptions;
create policy "push_sub_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push_sub_insert_own" on public.push_subscriptions;
create policy "push_sub_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push_sub_update_own" on public.push_subscriptions;
create policy "push_sub_update_own" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_sub_delete_own" on public.push_subscriptions;
create policy "push_sub_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ให้อีกคนรู้ได้แค่ "เปิดแจ้งเตือนอยู่ไหม" โดยไม่เห็นที่อยู่ปลายทาง
create or replace function public.partner_push_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.push_subscriptions where user_id <> auth.uid() limit 1),
    false);
$$;
revoke all on function public.partner_push_enabled() from public;
grant execute on function public.partner_push_enabled() to authenticated;

-- 3) จำกัดการส่ง: ไม่เกิน 1 ครั้งต่อ 30 นาที (ฟังก์ชันฝั่งเซิร์ฟเวอร์เป็นคนเขียน/อ่านเอง)
create table if not exists public.push_state (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  last_sent_at  timestamptz not null default now()
);
alter table public.push_state enable row level security;
-- ไม่มี policy = เว็บเข้าถึงไม่ได้เลย มีแต่ Edge Function (service role) เท่านั้น
