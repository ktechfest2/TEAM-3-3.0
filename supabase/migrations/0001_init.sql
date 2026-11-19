-- =====================================================================
-- Votepaddie - Supabase schema  (0001_init.sql)
-- Run ONCE on a fresh project: Dashboard > SQL Editor > New query > paste > Run
-- AUTH MODEL: real accounts only (email + one-time code, mail sent via Resend).
--   Keep "Anonymous sign-ins" OFF. Guests browse as the `anon` role (public reads only);
--   every write needs a signed-in, non-anonymous user (see public.is_real_user()).
-- KEYS: the browser uses the sb_publishable_... key; Edge Functions use the sb_secret_... key.
-- PART A = schema (no edits needed). PART B (bottom) = YOU edit 2 values.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pg_net   with schema extensions;
-- pg_cron: if this line errors, enable it in Dashboard > Integrations > Cron, then re-run.
create extension if not exists pg_cron;

-- ---------- Private schema (never exposed through the API) ----------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.app_settings (key text primary key, value text not null);

-- ---------- Helpers ----------
create or replace function public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

create or replace function public.epoch_us(ts timestamptz)
returns text language sql immutable parallel safe as $$
  select floor(extract(epoch from ts) * 1000000)::bigint::text;
$$;

-- True only for a signed-in, non-anonymous user (defence in depth on top of RLS)
create or replace function public.is_real_user() returns boolean
language sql stable as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- ---------- App config (public read, service-role write) ----------
create table public.app_config (key text primary key, value jsonb not null);
alter table public.app_config enable row level security;
create policy "config_read" on public.app_config for select to anon, authenticated using (true);
insert into public.app_config (key, value) values
  ('election_dates', '{"presidential_nass":"2027-01-16","governorship_shoa":"2027-02-06","source":"INEC revised timetable - verify before launch"}'),
  ('accreditation_window', '{"start":"08:30","end":"14:30","note":"Confirm against current INEC guidelines"}');

-- ---------- Polling units + wards ----------
create table public.polling_units (
  code       text primary key,                       -- e.g. 25-04-02-014
  name       text not null,
  state_code text not null, state_name text not null,
  lga_code   text not null, lga_name   text not null,
  ward_code  text not null, ward_name  text not null,
  ward_key   text generated always as (state_code || '-' || lga_code || '-' || ward_code) stored,
  lat double precision, lng double precision,        -- many public datasets lack/misplace these
  updated_at timestamptz not null default now(),
  constraint pu_lat_range check (lat is null or lat between -90 and 90),
  constraint pu_lng_range check (lng is null or lng between -180 and 180)
);
create index pu_ward_idx      on public.polling_units (ward_key);
create index pu_state_lga_idx on public.polling_units (state_code, lga_code);
create index pu_search_idx    on public.polling_units
  using gin ((name || ' ' || ward_name || ' ' || lga_name) extensions.gin_trgm_ops);
alter table public.polling_units enable row level security;
create policy "pu_read" on public.polling_units for select to anon, authenticated using (true);

create table public.wards (
  ward_key text primary key,
  state_code text not null, state_name text not null,
  lga_code text not null,   lga_name text not null,
  ward_code text not null,  ward_name text not null,
  pu_count int not null default 0
);
create index wards_state_lga_idx on public.wards (state_code, lga_code);
alter table public.wards enable row level security;
create policy "wards_read" on public.wards for select to anon, authenticated using (true);

create or replace function public.refresh_wards() returns void
language sql security definer set search_path = public as $$
  insert into public.wards (ward_key, state_code, state_name, lga_code, lga_name, ward_code, ward_name, pu_count)
  select ward_key, min(state_code), min(state_name), min(lga_code), min(lga_name), min(ward_code), min(ward_name), count(*)
  from public.polling_units group by ward_key
  on conflict (ward_key) do update set pu_count = excluded.pu_count;
$$;
revoke execute on function public.refresh_wards() from public, anon, authenticated;

create or replace function public.search_polling_units(q text, p_state_code text default null, lim int default 20)
returns setof public.polling_units
language sql stable set search_path = public, extensions as $$
  select * from public.polling_units
  where (p_state_code is null or state_code = p_state_code)
    and (name || ' ' || ward_name || ' ' || lga_name) ilike '%' || q || '%'
  order by similarity(name || ' ' || ward_name || ' ' || lga_name, q) desc
  limit least(lim, 50);
$$;

-- ---------- Profiles (one per anonymous user) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'en' check (language in ('en','ha','yo','ig','pcm')),
  pu_code  text references public.polling_units (code) on delete set null,
  consented_at timestamptz,                       -- when the user accepted terms/privacy
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profile_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Push tokens (FCM) ----------
create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  state_code text, ward_key text,
  platform text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "tokens_own_all" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_real_user());

-- ---------- AI usage (protects the free Groq quota; written by Edge Functions only) ----------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('translate','transcribe')),
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, kind, created_at desc);
alter table public.ai_usage enable row level security;   -- no policies: service/secret key only

-- ---------- Fact checks + translations ----------
create table public.fact_checks (
  id uuid primary key default gen_random_uuid(),
  source text not null,                      -- dubawa | africacheck | factcheckhub | google
  source_name text not null,
  title text not null check (char_length(title) between 3 and 400),
  url text not null unique,
  summary text check (summary is null or char_length(summary) <= 600),
  rating text,
  published_at timestamptz,
  tags text[] not null default '{}',
  state_code text,                           -- null = national
  created_at timestamptz not null default now()
);
create index fact_checks_pub_idx  on public.fact_checks (published_at desc nulls last);
create index fact_checks_tags_idx on public.fact_checks using gin (tags);
alter table public.fact_checks enable row level security;
create policy "fc_read" on public.fact_checks for select to anon, authenticated using (true);

create table public.translations (
  entity_type text not null, entity_id text not null,
  lang text not null check (lang in ('ha','yo','ig','pcm')),
  field text not null default 'title',
  translated text not null,
  provider text,
  created_at timestamptz not null default now(),
  primary key (entity_type, entity_id, lang, field)
);
alter table public.translations enable row level security;
create policy "tr_read" on public.translations for select to anon, authenticated using (true);

-- ---------- Ward tips (crowd instructions) ----------
create table public.ward_tips (
  id uuid primary key default gen_random_uuid(),
  ward_key text not null, pu_code text references public.polling_units (code) on delete set null,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 5 and 200),
  verified boolean not null default false,   -- poster was physically near a PU in this ward
  status text not null default 'active' check (status in ('active','hidden')),
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);
create index ward_tips_rank_idx on public.ward_tips (ward_key, status, upvotes desc, created_at desc);
alter table public.ward_tips enable row level security;
create policy "tips_read" on public.ward_tips for select to anon, authenticated using (status = 'active');
-- no insert/update policy: writes go through RPCs below

create table public.ward_tip_votes (
  tip_id uuid not null references public.ward_tips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);
alter table public.ward_tip_votes enable row level security;
create policy "votes_read_own" on public.ward_tip_votes for select to authenticated using (user_id = auth.uid());

create or replace function public.trg_tip_vote_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.ward_tips set upvotes = upvotes + 1 where id = new.tip_id;
  else update public.ward_tips set upvotes = greatest(upvotes - 1, 0) where id = old.tip_id; end if;
  return null;
end $$;
create trigger tip_vote_count after insert or delete on public.ward_tip_votes
  for each row execute function public.trg_tip_vote_count();

create or replace function public.post_ward_tip(
  p_pu_code text, p_body text, p_lat double precision default null, p_lng double precision default null
) returns public.ward_tips
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_pu public.polling_units%rowtype; v_verified boolean := false; v_row public.ward_tips;
begin
  if not public.is_real_user() then raise exception 'sign in required' using errcode = '28000'; end if;
  select * into v_pu from public.polling_units where code = p_pu_code;
  if not found then raise exception 'unknown polling unit' using errcode = 'P0002'; end if;
  if (select count(*) from public.ward_tips where author_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limit: max 5 tips per hour' using errcode = 'P0001';
  end if;
  if p_lat is not null and p_lng is not null then
    v_verified := exists (
      select 1 from public.polling_units u
      where u.ward_key = v_pu.ward_key and u.lat is not null
        and public.haversine_m(u.lat, u.lng, p_lat, p_lng) <= 500);
  end if;
  insert into public.ward_tips (ward_key, pu_code, author_id, body, verified)
  values (v_pu.ward_key, p_pu_code, v_uid, trim(p_body), v_verified) returning * into v_row;
  return v_row;
end $$;

create or replace function public.toggle_tip_vote(p_tip_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_real_user() then raise exception 'sign in required' using errcode = '28000'; end if;
  if exists (select 1 from public.ward_tip_votes where tip_id = p_tip_id and user_id = v_uid) then
    delete from public.ward_tip_votes where tip_id = p_tip_id and user_id = v_uid; return false;
  else
    insert into public.ward_tip_votes (tip_id, user_id) values (p_tip_id, v_uid); return true;
  end if;
end $$;

-- ---------- Accessibility help board ----------
create table public.accessibility_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('need','offer')),
  category text not null check (category in ('visual','hearing','mobility','elderly','low_vision','cognitive','custom')),
  custom_label text check (custom_label is null or char_length(custom_label) <= 40),
  state_code text not null, ward_key text not null,
  pu_code text references public.polling_units (code) on delete set null,
  body text not null check (char_length(body) between 5 and 400),
  status text not null default 'open' check (status in ('open','matched','closed','hidden')),
  created_at timestamptz not null default now(),
  constraint custom_needs_label check (category <> 'custom' or custom_label is not null)
);
create index acc_req_ward_idx on public.accessibility_requests (ward_key, status, created_at desc);
alter table public.accessibility_requests enable row level security;
create policy "acc_read" on public.accessibility_requests for select to authenticated
  using (status in ('open','matched') or author_id = auth.uid());
create policy "acc_insert" on public.accessibility_requests for insert to authenticated
  with check (author_id = auth.uid() and public.is_real_user());
create policy "acc_update_own" on public.accessibility_requests for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and status <> 'hidden');
create policy "acc_delete_own" on public.accessibility_requests for delete to authenticated using (author_id = auth.uid());

create or replace function public.trg_acc_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.accessibility_requests
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limit: max 5 posts per hour' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger acc_rate_limit before insert on public.accessibility_requests
  for each row execute function public.trg_acc_rate_limit();

create table public.accessibility_threads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.accessibility_requests (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  helper_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, helper_id)
);
alter table public.accessibility_threads enable row level security;
create policy "threads_participants" on public.accessibility_threads for select to authenticated
  using (auth.uid() in (requester_id, helper_id));

create table public.accessibility_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.accessibility_threads (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index acc_msg_thread_idx on public.accessibility_messages (thread_id, created_at);
alter table public.accessibility_messages enable row level security;
create policy "msgs_select" on public.accessibility_messages for select to authenticated
  using (exists (select 1 from public.accessibility_threads t
                 where t.id = thread_id and auth.uid() in (t.requester_id, t.helper_id)));
create policy "msgs_insert" on public.accessibility_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_real_user() and exists (select 1 from public.accessibility_threads t
                 where t.id = thread_id and auth.uid() in (t.requester_id, t.helper_id)));

create or replace function public.trg_msg_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.accessibility_messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate limit: slow down' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger msg_rate_limit before insert on public.accessibility_messages
  for each row execute function public.trg_msg_rate_limit();

create or replace function public.open_accessibility_thread(p_request_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_author uuid; v_id uuid;
begin
  if not public.is_real_user() then raise exception 'sign in required' using errcode = '28000'; end if;
  select author_id into v_author from public.accessibility_requests
   where id = p_request_id and status in ('open','matched');
  if not found then raise exception 'request not available' using errcode = 'P0002'; end if;
  if v_author = v_uid then raise exception 'cannot message yourself' using errcode = 'P0001'; end if;
  insert into public.accessibility_threads (request_id, requester_id, helper_id)
  values (p_request_id, v_author, v_uid)
  on conflict (request_id, helper_id) do update set request_id = excluded.request_id
  returning id into v_id;
  return v_id;
end $$;

-- ---------- Content reports (auto-hide at 3 distinct reporters) ----------
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('ward_tip','accessibility_request')),
  entity_id uuid not null,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, reporter_id)
);
alter table public.content_reports enable row level security;
create policy "reports_insert" on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_real_user());

create or replace function public.trg_report_autohide() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.content_reports where entity_type = new.entity_type and entity_id = new.entity_id;
  if n >= 3 then
    if new.entity_type = 'ward_tip' then update public.ward_tips set status = 'hidden' where id = new.entity_id;
    else update public.accessibility_requests set status = 'hidden' where id = new.entity_id; end if;
  end if;
  return new;
end $$;
create trigger report_autohide after insert on public.content_reports
  for each row execute function public.trg_report_autohide();

-- ---------- Virtual line + live headcount (unofficial) ----------
create table public.pu_queue_state (
  pu_code text primary key references public.polling_units (code) on delete cascade,
  next_ticket int not null default 0,
  waiting_count int not null default 0,
  accredited_count int not null default 0,
  voted_count int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.pu_queue_state enable row level security;
create policy "queue_state_read" on public.pu_queue_state for select to anon, authenticated using (true);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  pu_code text not null references public.polling_units (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticket int not null,
  status text not null default 'waiting' check (status in ('waiting','accredited','voted','left')),
  location_verified boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index queue_one_active_idx on public.queue_entries (pu_code, user_id) where status = 'waiting';
create index queue_wait_idx on public.queue_entries (pu_code, ticket) where status = 'waiting';
alter table public.queue_entries enable row level security;
create policy "queue_own_read" on public.queue_entries for select to authenticated using (user_id = auth.uid());

create or replace function public.trg_queue_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.pu_queue_state set waiting_count = waiting_count + 1, updated_at = now() where pu_code = new.pu_code;
  elsif old.status <> new.status then
    update public.pu_queue_state set
      waiting_count    = waiting_count    - (old.status = 'waiting')::int    + (new.status = 'waiting')::int,
      accredited_count = accredited_count - (old.status = 'accredited')::int + (new.status = 'accredited')::int,
      voted_count      = voted_count      - (old.status = 'voted')::int      + (new.status = 'voted')::int,
      updated_at = now()
    where pu_code = new.pu_code;
  end if;
  return null;
end $$;
create trigger queue_counts after insert or update of status on public.queue_entries
  for each row execute function public.trg_queue_counts();

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

create or replace function public.set_queue_status(p_entry_id uuid, p_status text) returns public.queue_entries
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_entry public.queue_entries;
begin
  if not public.is_real_user() then raise exception 'sign in required' using errcode = '28000'; end if;
  select * into v_entry from public.queue_entries where id = p_entry_id and user_id = v_uid;
  if not found then raise exception 'entry not found' using errcode = 'P0002'; end if;
  if not ((v_entry.status = 'waiting' and p_status in ('accredited','left'))
       or (v_entry.status = 'accredited' and p_status in ('voted','left'))) then
    raise exception 'invalid transition % -> %', v_entry.status, p_status using errcode = 'P0001';
  end if;
  update public.queue_entries set status = p_status, updated_at = now() where id = p_entry_id returning * into v_entry;
  return v_entry;
end $$;

-- Ask the notify-queue Edge Function to alert people nearing the front
create or replace function public.trg_queue_notify() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_url text; v_secret text;
begin
  if old.status = 'waiting' and new.status <> 'waiting' then
    select value into v_url    from private.app_settings where key = 'functions_url';
    select value into v_secret from private.app_settings where key = 'cron_secret';
    if v_url is not null and v_secret is not null then
      begin
        perform net.http_post(
          url := v_url || '/notify-queue',
          body := jsonb_build_object('pu_code', new.pu_code),
          headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', v_secret));
      exception when others then null;   -- never block a voter because a push failed
      end;
    end if;
  end if;
  return null;
end $$;
create trigger queue_notify after update of status on public.queue_entries
  for each row execute function public.trg_queue_notify();

-- ---------- Tamper-evident result-sheet ledger (append-only hash chain) ----------
create table public.result_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,  -- anonymised if the account is deleted
  pu_code text references public.polling_units (code) on delete set null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz not null,                 -- DEVICE clock: untrusted, shown for context
  captured_lat double precision, captured_lng double precision, accuracy_m real,
  storage_path text not null,
  ocr_json jsonb,                                   -- raw OCR guess
  confirmed_json jsonb check (confirmed_json is null or jsonb_typeof(confirmed_json) = 'object'),  -- numbers the user confirmed
  prev_hash text not null default 'GENESIS',
  chain_hash text not null default '',
  created_at timestamptz not null default clock_timestamp(),   -- SERVER clock: authoritative
  unique (user_id, sha256)
);
create index result_sheets_pu_idx on public.result_sheets (pu_code, created_at);
create index result_sheets_hash_idx on public.result_sheets (sha256);
alter table public.result_sheets enable row level security;
create policy "sheets_insert_own" on public.result_sheets for insert to authenticated
  with check (user_id = auth.uid() and public.is_real_user());
create policy "sheets_read_own"   on public.result_sheets for select to authenticated using (user_id = auth.uid());

create or replace function public.trg_result_sheet_chain() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_prev text;
begin
  perform pg_advisory_xact_lock(hashtext(coalesce(new.pu_code, '__none__')));
  new.created_at := clock_timestamp();
  select chain_hash into v_prev from public.result_sheets
   where pu_code is not distinct from new.pu_code order by created_at desc, id desc limit 1;
  new.prev_hash  := coalesce(v_prev, 'GENESIS');
  new.chain_hash := encode(digest(
      new.prev_hash || '|' || new.sha256 || '|' || coalesce(new.pu_code, '') || '|' ||
      public.epoch_us(new.captured_at) || '|' || public.epoch_us(new.created_at), 'sha256'), 'hex');
  return new;
end $$;
create trigger result_sheet_chain before insert on public.result_sheets
  for each row execute function public.trg_result_sheet_chain();

-- Append-only. The ONLY allowed change is anonymisation: user_id -> NULL when an account is
-- deleted (FK ON DELETE SET NULL). Nothing in the hash chain depends on user_id.
create or replace function public.trg_block_mutation() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and old.user_id is not null and new.user_id is null
     and (new.id, new.pu_code, new.sha256, new.captured_at, new.captured_lat, new.captured_lng, new.accuracy_m,
          new.storage_path, new.ocr_json, new.confirmed_json, new.prev_hash, new.chain_hash, new.created_at)
         is not distinct from
         (old.id, old.pu_code, old.sha256, old.captured_at, old.captured_lat, old.captured_lng, old.accuracy_m,
          old.storage_path, old.ocr_json, old.confirmed_json, old.prev_hash, old.chain_hash, old.created_at)
  then
    return new;
  end if;
  raise exception 'result_sheets is append-only';
end $$;
create trigger result_sheets_append_only before update or delete on public.result_sheets
  for each row execute function public.trg_block_mutation();
revoke update, delete, truncate on public.result_sheets from anon, authenticated;

-- Public, privacy-safe view: no user id, no GPS, no photo path.
-- (Runs with owner rights on purpose so anyone can audit the ledger.)
create view public.public_result_ledger as
  select id, pu_code, sha256, prev_hash, chain_hash, confirmed_json as scores, captured_at, created_at
  from public.result_sheets;
grant select on public.public_result_ledger to anon, authenticated;

create or replace function public.pu_result_consensus(p_pu_code text)
returns table (scores jsonb, submissions bigint, first_seen timestamptz)
language sql stable security definer set search_path = public as $$
  select confirmed_json, count(*), min(created_at)
  from public.result_sheets where pu_code = p_pu_code and confirmed_json is not null
  group by confirmed_json order by count(*) desc, min(created_at);
$$;

create or replace function public.verify_sheet_hash(p_sha256 text)
returns table (pu_code text, created_at timestamptz, chain_hash text, prev_hash text)
language sql stable security definer set search_path = public as $$
  select pu_code, created_at, chain_hash, prev_hash from public.result_sheets where sha256 = lower(p_sha256);
$$;

-- Recomputes the chain for a PU; returns NULL if intact, else the id of the first broken row.
create or replace function public.verify_ledger_chain(p_pu_code text) returns uuid
language plpgsql stable security definer set search_path = public, extensions as $$
declare r record; v_prev text := 'GENESIS'; v_expected text;
begin
  for r in select * from public.result_sheets where pu_code is not distinct from p_pu_code order by created_at, id loop
    v_expected := encode(digest(
      v_prev || '|' || r.sha256 || '|' || coalesce(r.pu_code, '') || '|' ||
      public.epoch_us(r.captured_at) || '|' || public.epoch_us(r.created_at), 'sha256'), 'hex');
    if r.prev_hash <> v_prev or r.chain_hash <> v_expected then return r.id; end if;
    v_prev := r.chain_hash;
  end loop;
  return null;
end $$;

-- ---------- Storage bucket for sheet photos (private) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('result-sheets', 'result-sheets', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "sheets_obj_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'result-sheets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sheets_obj_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'result-sheets' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Realtime ----------
alter publication supabase_realtime add table
  public.pu_queue_state, public.ward_tips, public.accessibility_requests,
  public.accessibility_messages, public.fact_checks;

-- ---------- Cron helper: calls the ingest Edge Function ----------
create or replace function private.invoke_ingest() returns void
language plpgsql security definer set search_path = private, public as $$
declare v_url text; v_secret text;
begin
  select value into v_url    from private.app_settings where key = 'functions_url';
  select value into v_secret from private.app_settings where key = 'cron_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(url := v_url || '/ingest-factchecks', body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', v_secret));
end $$;

-- =====================================================================
-- PART B - EDIT THESE TWO VALUES AND SCHEDULE
--   functions_url : https://<YOUR-PROJECT-REF>.supabase.co/functions/v1
--   cron_secret   : any long random string (also set as the CRON_SECRET Edge secret)
-- =====================================================================
-- insert into private.app_settings (key, value) values
--   ('functions_url', 'https://YOUR-PROJECT-REF.supabase.co/functions/v1'),
--   ('cron_secret',   'PASTE-A-LONG-RANDOM-STRING')
-- on conflict (key) do update set value = excluded.value;
--
-- select cron.schedule('ingest-factchecks', '*/10 * * * *', $$select private.invoke_ingest()$$);
