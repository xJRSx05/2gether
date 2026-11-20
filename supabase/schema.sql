-- 2gether : schema ขั้นที่ 1
-- วางทั้งไฟล์นี้ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่พัง)

-- 1) โปรไฟล์ของแต่ละคน ---------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null default 'เรา' check (char_length(nickname) between 1 and 20),
  season      text not null default 'summer'
              check (season in ('summer', 'rain', 'cool', 'spring', 'autumn')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 2) สร้างโปรไฟล์อัตโนมัติเมื่อมีคนสมัคร ----------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, left(split_part(new.email, '@', 1), 20))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) ล็อกให้มีได้แค่ 2 บัญชี ---------------------------------------------
-- คนที่ 3 สมัครไม่ได้ ไม่ว่าจะรู้ลิงก์หรือคีย์ของโปรเจกต์
create or replace function public.limit_two_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from auth.users) >= 2 then
    raise exception 'ACCOUNT_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_two_users on auth.users;
create trigger limit_two_users
  before insert on auth.users
  for each row execute function public.limit_two_users();

-- 4) ช่องเรียลไทม์แบบ private (สถานะออนไลน์ + ปุ่มเรียก) -------------------
-- ใช้ได้เฉพาะผู้ที่ล็อกอินแล้วเท่านั้น
drop policy if exists "room_receive" on realtime.messages;
create policy "room_receive" on realtime.messages
  for select to authenticated using (true);

drop policy if exists "room_send" on realtime.messages;
create policy "room_send" on realtime.messages
  for insert to authenticated with check (true);
