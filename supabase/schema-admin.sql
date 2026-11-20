-- 2gether : สิทธิ์ผู้ดูแล (ล้างข้อมูล / รีเซ็ต) + เก็บการเชื่อม Spotify ไว้ในบัญชี
-- รันต่อจากไฟล์อื่นทั้งหมด วางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่พัง)
-- ผู้ดูแลมีคนเดียว ตรวจจากอีเมลที่ล็อกอินอยู่ (ฝั่งเซิร์ฟเวอร์ คนอื่นเรียกไม่ได้)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'rxnnxphxt2005@gmail.com';
$$;

-- scope = 'history' : ลบประวัติทั้งหมด (แชท ผลเกม ของสะสม สมุดความทรงจำ Bond และบันทึกรายวัน) เก็บบัญชีและบ้านไว้
-- scope = 'all'     : ลบทุกอย่างรวมบัญชีทั้งสองคน เหมือนติดตั้งใหม่ (ตารางและฟังก์ชันของระบบยังอยู่)
create or replace function public.admin_reset(scope text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if scope not in ('history', 'all') then raise exception 'BAD_SCOPE'; end if;

  -- ลบเฉพาะตารางที่มีอยู่จริง (บางคนอาจยังไม่ได้รันบางไฟล์)
  foreach t in array array['messages', 'game_results', 'game_days', 'collection_items', 'memories', 'daily_log', 'milestones', 'push_state', 'quest_log', 'visit_log'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where true', t);
    end if;
  end loop;

  begin
    update public.home set bond = 0, bond_day = null, bond_time_today = 0, bond_pet_today = 0 where id = 1;
  exception when undefined_column then null;
  end;
  begin
    update public.home set hearts = 0, owned = '{}'::jsonb, placed = '{}'::jsonb, tree_days = 0, tree_day = null, water_day = null where id = 1;
  exception when undefined_column then null;
  end;

  if scope = 'all' then
    if to_regclass('public.push_subscriptions') is not null then delete from public.push_subscriptions where true; end if;
    if to_regclass('public.push_devices') is not null then delete from public.push_devices where true; end if;
    delete from public.home where true;
    -- ลบบัญชีทั้งหมด (โปรไฟล์ถูกลบตามอัตโนมัติ)
    delete from auth.users where true;
  end if;
  return 'ok';
end;
$$;

revoke all on function public.admin_reset(text) from public, anon;
grant execute on function public.admin_reset(text) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- การเชื่อมบัญชีเพลง (Spotify) ของแต่ละคน: เชื่อมครั้งเดียว ใช้ได้ทุกเครื่องของคนนั้น อ่าน/แก้ได้เฉพาะเจ้าของ
create table if not exists public.media_links (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  spotify     jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.media_links enable row level security;
drop policy if exists "media_links_own" on public.media_links;
create policy "media_links_own" on public.media_links
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
