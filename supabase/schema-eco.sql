-- 2gether : กระเป๋าหัวใจ ภารกิจคู่ ร้านแต่งบ้าน และต้นไม้ของเรา
-- รันต่อจากไฟล์อื่นทั้งหมด วางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่พัง)
-- ทุกอย่างอยู่ที่บ้านหลังเดียว (home.id = 1) ใช้ร่วมกันทั้งสองคน
-- การเปลี่ยนค่า (เพิ่มหัวใจ ซื้อของ รดน้ำ) ทำผ่านฟังก์ชันฝั่งเซิร์ฟเวอร์เท่านั้น สองเครื่องกดพร้อมกันก็ไม่นับซ้ำ

alter table public.home add column if not exists hearts     int   not null default 0;
alter table public.home add column if not exists owned      jsonb not null default '{}'::jsonb;  -- ของที่ซื้อแล้ว { item: true }
alter table public.home add column if not exists placed     jsonb not null default '{}'::jsonb;  -- ของที่วางอยู่ { จุดวาง: item }
alter table public.home add column if not exists tree_days  int   not null default 0;            -- วันที่ทั้งคู่มาหากัน (ต้นไม้โต)
alter table public.home add column if not exists tree_day   date;                                -- วันล่าสุดที่นับแล้ว
alter table public.home add column if not exists water_day  date;                                -- วันล่าสุดที่รดน้ำ

-- ความคืบหน้าภารกิจ: วันละแถวต่อภารกิจ (ภารกิจรายสัปดาห์ใช้วันจันทร์ของสัปดาห์)
create table if not exists public.quest_log (
  day       date not null,
  qid       text not null check (qid ~ '^[a-z0-9:_]{2,24}$'),
  progress  int  not null default 0,
  done      boolean not null default false,
  primary key (day, qid)
);
alter table public.quest_log enable row level security;
drop policy if exists "quest_log_select" on public.quest_log;
create policy "quest_log_select" on public.quest_log for select to authenticated using (true);

-- ใครเข้ามาวันไหน (ทั้งคู่เข้าวันเดียวกัน = ต้นไม้โต 1 วัน)
create table if not exists public.visit_log (
  day      date not null,
  user_id  uuid not null references auth.users (id) on delete cascade,
  primary key (day, user_id)
);
alter table public.visit_log enable row level security;
drop policy if exists "visit_log_select" on public.visit_log;
create policy "visit_log_select" on public.visit_log for select to authenticated using (true);

-- เพิ่มความคืบหน้าภารกิจ ครบเป้าครั้งแรก = ได้หัวใจ (ครั้งเดียวต่อภารกิจต่อวัน/สัปดาห์)
create or replace function public.quest_bump(p_day date, p_qid text, p_need int, p_amount int, p_reward int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  was boolean;
  prog int;
  fin boolean;
  h int;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_qid !~ '^[a-z0-9:_]{2,24}$' then raise exception 'BAD_QUEST'; end if;
  if p_day < today - 7 or p_day > today then raise exception 'BAD_DAY'; end if;
  if p_need < 1 or p_need > 500 or p_amount < 1 or p_amount > 60 or p_reward < 0 or p_reward > 200 then raise exception 'BAD_VALUE'; end if;

  insert into public.home (id) values (1) on conflict (id) do nothing;
  insert into public.quest_log (day, qid) values (p_day, p_qid) on conflict do nothing;
  select done into was from public.quest_log where day = p_day and qid = p_qid for update;
  update public.quest_log
     set progress = least(p_need, progress + p_amount),
         done = least(p_need, progress + p_amount) >= p_need
   where day = p_day and qid = p_qid
  returning progress, done into prog, fin;
  if fin and not was then
    update public.home set hearts = hearts + p_reward where id = 1;
  end if;
  select hearts into h from public.home where id = 1;
  return jsonb_build_object('progress', prog, 'done', fin, 'new', fin and not was, 'hearts', h);
end;
$$;
revoke all on function public.quest_bump(date, text, int, int, int) from public, anon;
grant execute on function public.quest_bump(date, text, int, int, int) to authenticated;

-- ซื้อของ: หัวใจพอ และยังไม่มี (ของจาก Bond ราคา 0)
create or replace function public.shop_buy(p_item text, p_price int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.home;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_item !~ '^[a-z0-9_]{2,24}$' or p_price < 0 or p_price > 2000 then raise exception 'BAD_ITEM'; end if;
  insert into public.home (id) values (1) on conflict (id) do nothing;
  select * into h from public.home where id = 1 for update;
  if h.owned ? p_item then return jsonb_build_object('ok', true, 'hearts', h.hearts, 'owned', h.owned); end if;
  if h.hearts < p_price then return jsonb_build_object('ok', false, 'hearts', h.hearts, 'owned', h.owned); end if;
  update public.home set hearts = hearts - p_price, owned = owned || jsonb_build_object(p_item, true) where id = 1
  returning * into h;
  return jsonb_build_object('ok', true, 'hearts', h.hearts, 'owned', h.owned);
end;
$$;
revoke all on function public.shop_buy(text, int) from public, anon;
grant execute on function public.shop_buy(text, int) to authenticated;

-- วาง/เก็บของ (p_item ว่าง = เก็บ) วางได้เฉพาะของที่มีแล้ว
create or replace function public.place_item(p_slot text, p_item text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.home;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_slot !~ '^[a-z0-9_]{2,24}$' then raise exception 'BAD_SLOT'; end if;
  select * into h from public.home where id = 1 for update;
  if coalesce(p_item, '') = '' then
    update public.home set placed = placed - p_slot where id = 1 returning * into h;
  else
    if not (h.owned ? p_item) then raise exception 'NOT_OWNED'; end if;
    update public.home set placed = placed || jsonb_build_object(p_slot, p_item) where id = 1 returning * into h;
  end if;
  return jsonb_build_object('placed', h.placed);
end;
$$;
revoke all on function public.place_item(text, text) from public, anon;
grant execute on function public.place_item(text, text) to authenticated;

-- เข้าแอปวันนี้: ถ้าอีกคนเข้าแล้วด้วย ต้นไม้โต 1 วัน (วันละครั้ง)
create or replace function public.tree_visit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  n int;
  grew boolean := false;
  h public.home;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into public.home (id) values (1) on conflict (id) do nothing;
  insert into public.visit_log (day, user_id) values (today, auth.uid()) on conflict do nothing;
  select count(*) into n from public.visit_log where day = today;
  if n >= 2 then
    update public.home set tree_days = tree_days + 1, tree_day = today
     where id = 1 and tree_day is distinct from today;
    grew := found;
  end if;
  select * into h from public.home where id = 1;
  return jsonb_build_object('both', n >= 2, 'grew', grew, 'tree_days', h.tree_days, 'tree_day', h.tree_day);
end;
$$;
revoke all on function public.tree_visit() from public, anon;
grant execute on function public.tree_visit() to authenticated;

-- รดน้ำต้นไม้: วันละครั้ง (ใครรดก็ได้) ได้ 5 หัวใจ
create or replace function public.tree_water()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  h public.home;
  ok boolean;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.home set water_day = today, hearts = hearts + 5
   where id = 1 and water_day is distinct from today;
  ok := found;
  select * into h from public.home where id = 1;
  return jsonb_build_object('ok', ok, 'hearts', h.hearts, 'water_day', h.water_day);
end;
$$;
revoke all on function public.tree_water() from public, anon;
grant execute on function public.tree_water() to authenticated;

-- ผู้ดูแลล้างข้อมูล: รวมกระเป๋า ภารกิจ ของในบ้าน และต้นไม้ด้วย
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
    delete from auth.users where true;
  end if;
  return 'ok';
end;
$$;
revoke all on function public.admin_reset(text) from public, anon;
grant execute on function public.admin_reset(text) to authenticated;
