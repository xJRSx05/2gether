-- 2gether : schema ขั้นที่ 4 ของงานสร้าง (ห้องนอน + วันเริ่มคบ)
-- รันต่อจาก schema-step4.sql วางทั้งไฟล์แล้วกด Run (รันซ้ำได้ ไม่พัง)
-- วันนับตามเวลาไทย (Asia/Bangkok)

-- 1) Bond รายวัน: ราตรีสวัสดิ์ / สวัสดีตอนเช้า คนละ 1 ครั้งต่อวัน (+2 แต้ม)
create table if not exists public.daily_log (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  kind     text not null check (kind in ('night', 'morning')),
  primary key (user_id, day, kind)
);
alter table public.daily_log enable row level security;
-- ไม่มี policy = เว็บเข้าถึงตรงไม่ได้ ใช้ผ่านฟังก์ชันด้านล่างเท่านั้น

create or replace function public.award_daily(kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  n int;
  r jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if kind not in ('night', 'morning') then raise exception 'BAD_KIND'; end if;

  insert into public.daily_log (user_id, day, kind) values (auth.uid(), today, kind)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return null; end if;  -- วันนี้ได้ไปแล้ว

  insert into public.home (id) values (1) on conflict (id) do nothing;
  update public.home set bond = bond + 2 where id = 1;
  select to_jsonb(h) into r from public.home h where id = 1;
  return r;
end;
$$;

-- 2) วันครบ 100, 200, 300 วัน และทุกครบปี: โบนัส +10 ครั้งเดียวต่อหลักไมล์ (วันเริ่มคบ = วันที่ 1)
create table if not exists public.milestones (
  n  int primary key
);
alter table public.milestones enable row level security;

create or replace function public.claim_milestone()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  s date;
  d int;
  c int;
  r jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select start_date into s from public.home where id = 1;
  if s is null then return null; end if;
  d := (today - s) + 1;
  if d < 1 or not (d in (100, 200, 300) or d % 365 = 0) then return null; end if;

  insert into public.milestones (n) values (d) on conflict do nothing;
  get diagnostics c = row_count;
  if c = 0 then return null; end if;  -- มีคนขอไปแล้ว

  update public.home set bond = bond + 10 where id = 1;
  select to_jsonb(h) into r from public.home h where id = 1;
  return r;
end;
$$;

revoke all on function public.award_daily(text) from public;
revoke all on function public.claim_milestone() from public;
grant execute on function public.award_daily(text) to authenticated;
grant execute on function public.claim_milestone() to authenticated;
