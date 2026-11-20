-- 2gether : schema ขั้นที่ 3 ของงานสร้าง (แชท + พักแจ้งเตือน)
-- รันต่อจาก schema-step3.sql วางทั้งไฟล์แล้วกด Run (รันซ้ำได้ ไม่พัง)

-- 1) ข้อความแชท
create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  sender      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(body) between 0 and 1000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  deleted     boolean not null default false,
  reactions   jsonb not null default '{}'::jsonb
);
create index if not exists messages_created_idx on public.messages (id desc);
alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated using (true);

-- ส่งได้เฉพาะในนามตัวเอง และห้ามตั้งค่าอ่านแล้ว/ลบ/รีแอ็กชันมาตั้งแต่ตอนส่ง
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert to authenticated
  with check (sender = auth.uid() and read_at is null and not deleted and reactions = '{}'::jsonb
              and char_length(body) between 1 and 1000);
-- ไม่มี policy update/delete: การแก้ทำผ่านฟังก์ชันด้านล่างเท่านั้น

-- 2) ทำเครื่องหมายว่าอ่านแล้ว (เฉพาะข้อความของอีกคน) คืนเวลา หรือ null ถ้าไม่มีอะไรเปลี่ยน
create or replace function public.mark_read()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare n int; t timestamptz := now();
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.messages set read_at = t where sender <> auth.uid() and read_at is null;
  get diagnostics n = row_count;
  return case when n > 0 then t else null end;
end;
$$;

-- 3) ลบข้อความของตัวเอง (เก็บแถวไว้แต่ล้างเนื้อหา)
create or replace function public.delete_message(msg_id bigint)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare m public.messages;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.messages set deleted = true, body = '', reactions = '{}'::jsonb
   where id = msg_id and sender = auth.uid()
   returning * into m;
  return m;
end;
$$;

-- 4) กดรีแอ็กชัน (กดซ้ำอันเดิม = ยกเลิก) อนุญาตเฉพาะอีโมจิ 5 แบบ
create or replace function public.react_message(msg_id bigint, emoji text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare m public.messages; me text := auth.uid()::text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if emoji is not null and emoji not in ('❤️', '😂', '😮', '😢', '👍') then raise exception 'BAD_EMOJI'; end if;
  update public.messages
     set reactions = case
           when emoji is null or reactions ->> me = emoji then reactions - me
           else jsonb_set(reactions, array[me], to_jsonb(emoji))
         end
   where id = msg_id and not deleted
   returning * into m;
  return m;
end;
$$;

revoke all on function public.mark_read() from public;
revoke all on function public.delete_message(bigint) from public;
revoke all on function public.react_message(bigint, text) from public;
grant execute on function public.mark_read() to authenticated;
grant execute on function public.delete_message(bigint) to authenticated;
grant execute on function public.react_message(bigint, text) to authenticated;

-- 5) พักแจ้งเตือน: ไม่ส่งถึงเครื่องนี้จนถึงเวลาที่ตั้ง
alter table public.push_subscriptions add column if not exists dnd_until timestamptz;

-- 6) จำกัดการส่งแยกตามชนิด: ชวนกลับบ้าน (30 นาที) กับแชท (3 นาที)
alter table public.push_state add column if not exists kind text not null default 'comehome';
alter table public.push_state drop constraint if exists push_state_pkey;
alter table public.push_state add primary key (user_id, kind);
