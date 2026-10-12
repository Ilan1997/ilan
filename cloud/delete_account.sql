-- Run once in Supabase → SQL Editor. Lets a signed-in user delete THEIR OWN account and all their data.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.user_state where user_id = auth.uid();
  delete from public.ai_usage   where user_id = auth.uid();
  delete from auth.users        where id      = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
