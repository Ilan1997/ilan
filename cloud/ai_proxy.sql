-- Run once in Supabase → SQL Editor (after setup.sql). Daily per-user counter for the AI proxy.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default ((now() at time zone 'utc')::date),
  n       int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;  -- no policies: only the Edge Function (service role) can touch it

create or replace function public.bump_ai_usage(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.ai_usage(user_id, day, n) values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set n = public.ai_usage.n + 1
  returning n into v;
  return v;
end $$;
revoke all on function public.bump_ai_usage(uuid) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(uuid) to service_role;
