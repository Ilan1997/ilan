-- Run once in Supabase → SQL Editor. One row per user; row-level security
-- guarantees a user can only ever read/write/delete their own row.
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb,
  ai         jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
drop policy if exists "own row select" on public.user_state;
drop policy if exists "own row insert" on public.user_state;
drop policy if exists "own row update" on public.user_state;
drop policy if exists "own row delete" on public.user_state;
create policy "own row select" on public.user_state for select using (auth.uid() = user_id);
create policy "own row insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own row update" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.user_state for delete using (auth.uid() = user_id);
