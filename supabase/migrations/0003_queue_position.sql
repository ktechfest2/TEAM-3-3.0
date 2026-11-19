-- =====================================================================
-- Votepaddie - 0003_queue_position.sql
-- RLS only lets a person read their own queue entry, so the app cannot count people ahead of
-- them by itself. This exposes ONE number (how many 'waiting' tickets are lower than mine),
-- never anyone else's rows. The app falls back to an estimate if this is not installed.
-- =====================================================================
create or replace function public.queue_position(p_pu_code text) returns int
language sql stable security definer set search_path = public as $$
  with me as (
    select ticket from public.queue_entries
    where pu_code = p_pu_code and user_id = auth.uid() and status = 'waiting' and public.is_real_user()
    limit 1)
  select count(*)::int
  from public.queue_entries q, me
  where q.pu_code = p_pu_code and q.status = 'waiting' and q.ticket < me.ticket;
$$;
revoke execute on function public.queue_position(text) from public, anon;
grant  execute on function public.queue_position(text) to authenticated;
