-- 2gether : schema สุดท้าย (มินิเกมทั้งหมด ของสะสม สมุดความทรงจำ เกมคลาสสิก)
-- รันต่อจาก schema-step5.sql วางทั้งไฟล์แล้วกด Run ครั้งเดียว (รันซ้ำได้ ไม่พัง)
-- วันนับตามเวลาไทย (Asia/Bangkok)

-- 1) ผลการเล่นทุกรอบ (อ่านได้ทั้งคู่ เขียนผ่านฟังก์ชัน award_game เท่านั้น)
create table if not exists public.game_results (
  id         bigint generated always as identity primary key,
  game       text not null,
  stars      int  not null check (stars between 0 and 3),
  score      int  not null check (score between 0 and 999),
  played_by  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.game_results drop constraint if exists game_results_game_check;
alter table public.game_results add constraint game_results_game_check check (game ~ '^[a-z0-9]{2,16}$');
alter table public.game_results enable row level security;
drop policy if exists "game_results read" on public.game_results;
create policy "game_results read" on public.game_results
  for select to authenticated using (true);

-- 2) Bond ของเกม: ครั้งแรกของวันต่อเกมได้ +3 (ทั้งบ้านนับรวมกัน)
create table if not exists public.game_days (
  game text not null,
  day  date not null,
  primary key (game, day)
);
alter table public.game_days enable row level security;

create or replace function public.award_game(game text, stars int, score int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  n int;
  awarded boolean := false;
  r jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if game !~ '^[a-z0-9]{2,16}$' then raise exception 'BAD_GAME'; end if;
  if stars < 0 or stars > 3 or score < 0 or score > 999 then raise exception 'BAD_RESULT'; end if;

  insert into public.game_results (game, stars, score, played_by)
  values (game, stars, score, auth.uid());

  insert into public.home (id) values (1) on conflict (id) do nothing;
  if stars > 0 then
    insert into public.game_days (game, day) values (game, today) on conflict do nothing;
    get diagnostics n = row_count;
    if n > 0 then
      update public.home set bond = bond + 3 where id = 1;
      awarded := true;
    end if;
  end if;
  select to_jsonb(h) into r from public.home h where id = 1;
  return jsonb_build_object('awarded', awarded, 'bond', r -> 'bond');
end;
$$;
revoke all on function public.award_game(text, int, int) from public;
grant execute on function public.award_game(text, int, int) to authenticated;

-- 3) ของสะสม: ปลาในตู้ปลา ดอกไม้ในสวน ดาวบนท้องฟ้า (เก็บถาวร ไม่ลบ)
create table if not exists public.collection_items (
  id         bigint generated always as identity primary key,
  kind       text not null,
  species    text not null check (species ~ '^[a-z0-9_]{1,24}$'),
  found_by   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.collection_items drop constraint if exists collection_items_kind_check;
alter table public.collection_items add constraint collection_items_kind_check check (kind in ('fish', 'flower', 'star'));
alter table public.collection_items enable row level security;
drop policy if exists "collection read" on public.collection_items;
create policy "collection read" on public.collection_items
  for select to authenticated using (true);

create or replace function public.add_items(kind text, species text[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
  n int := 0;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if kind not in ('fish', 'flower', 'star') then raise exception 'BAD_KIND'; end if;
  foreach s in array species loop
    exit when n >= 10;
    if s ~ '^[a-z0-9_]{1,24}$' then
      insert into public.collection_items (kind, species, found_by) values (kind, s, auth.uid());
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.add_items(text, text[]) from public;
grant execute on function public.add_items(text, text[]) to authenticated;

-- 4) สมุดความทรงจำ: บันทึกสั้นๆ ของทั้งคู่ (อ่านได้ทั้งคู่ ลบได้เฉพาะของตัวเอง)
create table if not exists public.memories (
  id         bigint generated always as identity primary key,
  author     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 400),
  emoji      text not null default '💛' check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now()
);
alter table public.memories enable row level security;
drop policy if exists "memories read" on public.memories;
create policy "memories read" on public.memories for select to authenticated using (true);
drop policy if exists "memories insert own" on public.memories;
create policy "memories insert own" on public.memories for insert to authenticated with check (author = auth.uid());
drop policy if exists "memories delete own" on public.memories;
create policy "memories delete own" on public.memories for delete to authenticated using (author = auth.uid());
