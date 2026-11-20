-- 2gether : แก้ปุ่มล้างข้อมูลของผู้ดูแล (Supabase บังคับให้ DELETE ต้องมี WHERE)
-- วางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่พัง)

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
