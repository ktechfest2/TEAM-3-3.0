-- =====================================================================
-- Votepaddie - 0004_prevent_revoting.sql
-- Prevents users who have already voted from rejoining the line or voting again.
-- Also allows direct transition from waiting -> voted if accreditation was skipped in the UI.
-- =====================================================================

-- 1. Disallow join_queue if user already has a voted status entry
create or replace function public.join_queue(
  p_pu_code text, p_lat double precision default null, p_lng double precision default null, p_manual boolean default false
) returns public.queue_entries
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_pu public.polling_units%rowtype; v_entry public.queue_entries;
  v_ticket int; v_verified boolean := false;
begin
  if not public.is_real_user() then raise exception 'sign in required' using errcode = '28000'; end if;
  select * into v_pu from public.polling_units where code = p_pu_code;
  if not found then raise exception 'unknown polling unit' using errcode = 'P0002'; end if;

  -- Block users who have already cast their ballot
  if exists (select 1 from public.queue_entries where user_id = v_uid and status = 'voted') then
    raise exception 'already voted' using errcode = 'P0001';
  end if;

  select * into v_entry from public.queue_entries where pu_code = p_pu_code and user_id = v_uid and status = 'waiting';
  if found then return v_entry; end if;

  if v_pu.lat is not null and p_lat is not null and p_lng is not null then
    v_verified := public.haversine_m(v_pu.lat, v_pu.lng, p_lat, p_lng) <= 500;
    if not v_verified and not p_manual then
      raise exception 'too far from polling unit' using errcode = 'P0001';
    end if;
  elsif not p_manual then
    raise exception 'location unavailable: confirm manually' using errcode = 'P0001';
  end if;

  insert into public.pu_queue_state (pu_code, next_ticket) values (p_pu_code, 1)
  on conflict (pu_code) do update set next_ticket = public.pu_queue_state.next_ticket + 1
  returning next_ticket into v_ticket;

  insert into public.queue_entries (pu_code, user_id, ticket, location_verified)
  values (p_pu_code, v_uid, v_ticket, v_verified) returning * into v_entry;
  return v_entry;
end $$;

-- 2. Allow transitions waiting -> accredited, waiting -> voted, accredited -> voted, and any -> left
create or replace function public.set_queue_status(p_entry_id uuid, p_status text) returns public.queue_entries
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_entry public.queue_entries;
begin
  if not public.is_real_user() then raise exception 'sign in required' using errcode = '28000'; end if;
  select * into v_entry from public.queue_entries where id = p_entry_id and user_id = v_uid;
  if not found then raise exception 'entry not found' using errcode = 'P0002'; end if;
  if not ((v_entry.status = 'waiting' and p_status in ('accredited','voted','left'))
       or (v_entry.status = 'accredited' and p_status in ('voted','left'))) then
    raise exception 'invalid transition % -> %', v_entry.status, p_status using errcode = 'P0001';
  end if;
  update public.queue_entries set status = p_status, updated_at = now() where id = p_entry_id returning * into v_entry;
  return v_entry;
end $$;

