-- 2gether : แจ้งเตือนได้หลายเครื่องต่อคน (มือถือ + คอม)
-- รันต่อจากไฟล์อื่นทั้งหมด วางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่พัง)

create table if not exists public.push_devices (
  endpoint      text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  subscription  jsonb not null,
  ua            text,
  updated_at    timestamptz not null default now()
);
create index if not exists push_devices_user on public.push_devices (user_id);
alter table public.push_devices enable row level security;

drop policy if exists "push_dev_select_own" on public.push_devices;
create policy "push_dev_select_own" on public.push_devices for select to authenticated using (user_id = auth.uid());
drop policy if exists "push_dev_insert_own" on public.push_devices;
create policy "push_dev_insert_own" on public.push_devices for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push_dev_update_own" on public.push_devices;
create policy "push_dev_update_own" on public.push_devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_dev_delete_own" on public.push_devices;
create policy "push_dev_delete_own" on public.push_devices for delete to authenticated using (user_id = auth.uid());

-- ย้ายเครื่องที่เคยเปิดไว้ (แบบเดิม เครื่องเดียว) เข้าตารางใหม่
insert into public.push_devices (endpoint, user_id, subscription)
select subscription ->> 'endpoint', user_id, subscription
from public.push_subscriptions
where subscription ? 'endpoint'
on conflict (endpoint) do nothing;

-- อีกคนเปิดแจ้งเตือนไว้ไหม (อย่างน้อย 1 เครื่อง)
create or replace function public.partner_push_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.push_devices d
    where d.user_id <> auth.uid()
      and coalesce((select enabled from public.push_subscriptions s where s.user_id = d.user_id), true)
  ) or coalesce((select enabled from public.push_subscriptions where user_id <> auth.uid() limit 1), false);
$$;
revoke all on function public.partner_push_enabled() from public;
grant execute on function public.partner_push_enabled() to authenticated;
