-- Initial schema.
--
-- Identity is Supabase Auth: the survey gate signs respondents in anonymously, and the email is
-- verified later with an emailed 6-digit code. `auth.users` owns credentials and sessions;
-- everything here hangs off `auth.users(id)`.
--
-- Every table has RLS enabled and explicit privileges (see "Privileges" at the end): hosted
-- projects have no default grants on `public`, so new tables must grant their own privileges the
-- same way. Writes that must not be user-controlled have no policy for `authenticated` and are
-- made server-side with the secret key (service role).

create extension if not exists moddatetime with schema extensions;
-- Fuzzy email search in the admin list (trigram word similarity).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: one row per verified respondent, mirroring the email from auth.users (the only place
-- it is needed outside auth). Anonymous users have no email until they verify one: the
-- `update of email` trigger creates the row once an address is attached.
-- ---------------------------------------------------------------------------
create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	email text not null,
	created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
	for select to authenticated
	using ((select auth.uid()) = id);

create function private.sync_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if new.email is null then
		return new;
	end if;
	insert into public.profiles (id, email) values (new.id, new.email)
	on conflict (id) do update set email = excluded.email;
	return new;
end;
$$;

create trigger on_auth_user_upsert
	after insert or update of email on auth.users
	for each row execute function private.sync_profile();

-- ---------------------------------------------------------------------------
-- consent_logs: append-only. Current state = latest row per (user, purpose).
-- No email stored; user_id is nulled (not deleted) on account erasure so proof
-- of consent survives without identifying anyone.
-- ---------------------------------------------------------------------------
create table public.consent_logs (
	id bigint generated always as identity primary key,
	user_id uuid references auth.users (id) on delete set null,
	purpose text not null check (purpose in ('processing')),
	granted boolean not null,
	-- Version of the privacy-policy / consent wording shown to the user.
	policy_version text not null,
	created_at timestamptz not null default now()
);

create index consent_logs_user_purpose_idx on public.consent_logs (user_id, purpose, created_at desc);

alter table public.consent_logs enable row level security;

create policy "consent_logs: read own" on public.consent_logs
	for select to authenticated
	using ((select auth.uid()) = user_id);

-- Append-only: there are no update/delete policies or privileges.
create policy "consent_logs: append own" on public.consent_logs
	for insert to authenticated
	with check ((select auth.uid()) = user_id);

create view public.consents with (security_invoker = true) as
	select distinct on (user_id, purpose) user_id, purpose, granted, policy_version, created_at
	from public.consent_logs
	order by user_id, purpose, created_at desc, id desc;

-- ---------------------------------------------------------------------------
-- survey_answers: the answer store, one row per respondent and sheet.
-- `answer` mirrors the app's `Values` type (field id -> value) for that sheet;
-- a sheet is saved or deleted on its own, never together with the others.
-- Writes are server-only: the API validates the patch against the catalogue and writes with the
-- service role.
-- ---------------------------------------------------------------------------
create table public.survey_answers (
	user_id uuid not null references auth.users (id) on delete cascade,
	sheet_id text not null check (sheet_id ~ '^[A-Za-z0-9_]{1,16}$'),
	answer jsonb not null check (jsonb_typeof(answer) = 'object' and pg_column_size(answer) < 65536),
	-- Version of the sheet catalogue the answer was given against.
	catalogue_version text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (user_id, sheet_id)
);

create trigger survey_answers_updated_at
	before update on public.survey_answers
	for each row execute function extensions.moddatetime(updated_at);

alter table public.survey_answers enable row level security;

create policy "survey_answers: read own" on public.survey_answers
	for select to authenticated
	using ((select auth.uid()) = user_id);

-- Whether the respondent's latest `processing` consent is granted.
create function private.has_consent(uid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
	select coalesce((
		select granted from public.consent_logs
		where user_id = uid and purpose = 'processing'
		order by created_at desc, id desc
		limit 1
	), false);
$$;

-- Defense in depth: even the service role (which bypasses RLS) cannot store answers
-- for someone without consent on record.
create function private.require_consent() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if not private.has_consent(new.user_id) then
		raise exception 'no processing consent on record' using errcode = '42501';
	end if;
	return new;
end;
$$;

create trigger survey_answers_require_consent
	before insert or update on public.survey_answers
	for each row execute function private.require_consent();

-- ---------------------------------------------------------------------------
-- access_logs: who touched whose data. Server-written only (service role);
-- respondents may read entries about themselves (GDPR art. 15). Admins print maps (`print_pdf`)
-- and email them to the respondent (`email_map`); both are logged with actor `consultant`.
-- ---------------------------------------------------------------------------
create table public.access_logs (
	id bigint generated always as identity primary key,
	-- The respondent whose data was touched; nulled on erasure.
	user_id uuid references auth.users (id) on delete set null,
	actor text not null check (actor in ('user', 'consultant', 'system')),
	action text not null constraint access_logs_action_check check (action in (
		'login', 'logout', 'view_answers', 'export_data', 'change_consent',
		'delete_answers', 'delete_account', 'view_lead', 'print_pdf', 'email_map'
	)),
	ip inet,
	user_agent text,
	created_at timestamptz not null default now()
);

create index access_logs_user_idx on public.access_logs (user_id, created_at desc);
-- Supports the retention purge.
create index access_logs_created_idx on public.access_logs (created_at);

alter table public.access_logs enable row level security;

create policy "access_logs: read own" on public.access_logs
	for select to authenticated
	using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- conversation_requests: a respondent asks to talk the map over with the event's consultants.
-- One row per respondent, written server-side; respondents may read their own row.
-- ---------------------------------------------------------------------------
create table public.conversation_requests (
	user_id uuid primary key references auth.users (id) on delete cascade,
	requested_at timestamptz not null default now()
);

alter table public.conversation_requests enable row level security;

create policy "conversation_requests: read own" on public.conversation_requests
	for select to authenticated
	using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- admins: event staff who look up respondents and print their maps.
-- Pre-approved email addresses, synced at deploy time by scripts/seed-admins.ts. They sign in
-- like respondents (emailed code at /profilo); the server checks this table on every /admin
-- request, so removing a row revokes access at once. Server-only: no policy.
-- ---------------------------------------------------------------------------
create table public.admins (
	email text primary key check (email = lower(email) and length(email) <= 254),
	created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- An admin's account cannot be deleted while the address is listed, whoever asks (the profile
-- page, the service role, the dashboard). Remove the address from public.admins first.
create function private.keep_admin_accounts() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if old.email is not null and exists (select 1 from public.admins where email = lower(old.email)) then
		raise exception 'admin accounts cannot be deleted' using errcode = '42501';
	end if;
	return old;
end;
$$;

create trigger keep_admin_accounts
	before delete on auth.users
	for each row execute function private.keep_admin_accounts();

-- ---------------------------------------------------------------------------
-- Survey metrics. Two kinds of data, kept apart from the answers and from any identity:
--   * survey_screen_counts: anonymous daily counters of screens reached (and the synthetic
--     'visit' and 'start'), written for everyone, consent or not. No identifier of any kind.
--   * survey_journeys / survey_journey_events: one journey per consenting respondent, keyed by a
--     random id. The only link to a person is survey_journey_owners, which is deleted with the
--     account (cascade) and by a daily job 30 days after the journey's last event; from then on
--     the journey is anonymous statistics.
-- Abandonment is derived when reading (incomplete and inactive for 7 days), not stored.
-- Server-only: no policies.
-- ---------------------------------------------------------------------------
create table public.survey_screen_counts (
	day date not null,
	catalogue_version text not null check (length(catalogue_version) <= 64),
	screen_id text not null check (screen_id ~ '^[A-Za-z0-9_.:-]{1,64}$'),
	device text not null check (device in ('smartphone', 'tablet', 'computer')),
	n integer not null default 0 check (n >= 0),
	primary key (day, catalogue_version, screen_id, device)
);

create table public.survey_journeys (
	id uuid primary key default gen_random_uuid(),
	catalogue_version text not null check (length(catalogue_version) <= 64),
	start_device text not null check (start_device in ('smartphone', 'tablet', 'computer')),
	-- Minute-rounded, so they cannot be matched to the precise timestamps of other tables.
	started_at timestamptz not null default date_trunc('minute', now()),
	last_event_at timestamptz not null default date_trunc('minute', now()),
	completed_at timestamptz
);

create index survey_journeys_started_idx on public.survey_journeys (started_at);

create table public.survey_journey_events (
	id bigint generated always as identity primary key,
	journey_id uuid not null references public.survey_journeys (id) on delete cascade,
	screen_id text not null check (screen_id ~ '^[A-Za-z0-9_.:-]{1,64}$'),
	-- Question screens only.
	outcome text check (outcome in ('answered', 'skipped', 'unknown', 'withheld')),
	duration_s integer check (duration_s between 0 and 300),
	device text not null check (device in ('smartphone', 'tablet', 'computer')),
	at timestamptz not null default date_trunc('minute', now())
);

create index survey_journey_events_journey_idx on public.survey_journey_events (journey_id, at);

-- The person <-> journey link. One current journey per respondent.
create table public.survey_journey_owners (
	user_id uuid primary key references auth.users (id) on delete cascade,
	journey_id uuid not null unique references public.survey_journeys (id) on delete cascade
);

alter table public.survey_screen_counts enable row level security;
alter table public.survey_journeys enable row level security;
alter table public.survey_journey_events enable row level security;
alter table public.survey_journey_owners enable row level security;

-- ---------------------------------------------------------------------------
-- Server-only functions (service role).
-- ---------------------------------------------------------------------------

-- Merge: an anonymous respondent verifies an address that already has an account. The survey
-- just completed (answers, conversation request, metrics journey) replaces the old one; the
-- anonymous user is then deleted.
create function public.merge_anonymous_respondent(anon uuid, target uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
	if anon = target
		or not exists (select 1 from auth.users where id = anon and is_anonymous)
		or not exists (select 1 from auth.users where id = target and not is_anonymous) then
		raise exception 'invalid merge' using errcode = '22023';
	end if;

	-- The target must have the consent on record before answers move to it (require_consent).
	-- Runs as the function owner, so the security_invoker view `consents` sees every row.
	insert into public.consent_logs (user_id, purpose, granted, policy_version)
	select target, purpose, granted, policy_version
	from public.consents
	where user_id = anon;

	if exists (select 1 from public.survey_answers where user_id = anon) then
		delete from public.survey_answers where user_id = target;
		update public.survey_answers set user_id = target where user_id = anon;
	end if;

	if exists (select 1 from public.conversation_requests where user_id = anon) then
		delete from public.conversation_requests where user_id = target;
		update public.conversation_requests set user_id = target where user_id = anon;
	end if;

	-- The target's previous journey stays in the statistics, unlinked.
	if exists (select 1 from public.survey_journey_owners where user_id = anon) then
		delete from public.survey_journey_owners where user_id = target;
		update public.survey_journey_owners set user_id = target where user_id = anon;
	end if;

	delete from auth.users where id = anon;
end;
$$;

-- The respondents an admin may see: verified (not anonymous) accounts whose latest consents grant
-- processing (which covers preparing the map and sharing it with the event's consultants), with
-- their conversation request (a lead for the consultants), if any. One page at a time.
-- - `search`: empty lists everyone, most recent answers first. Otherwise a substring match, or a
--   fuzzy one (word similarity >= 0.4), best match first. No pattern syntax is interpreted.
-- - `respondent`: narrows to one (the PDF route re-checks eligibility with it).
-- - `requested_only`: only those who asked for a conversation with the consultants.
-- - `total`: the number of matches across all pages, on every row.
create function public.admin_respondents(
	search text default '',
	respondent uuid default null,
	page_size int default 25,
	page_offset int default 0,
	requested_only boolean default false
)
returns table (
	id uuid, email text, answered int, last_answer timestamptz, requested_at timestamptz,
	total bigint
)
language sql stable security definer set search_path = ''
as $$
	with verified as (
		select p.id, p.email
		from public.profiles p
		join auth.users u on u.id = p.id and not u.is_anonymous and u.email_confirmed_at is not null
		where (respondent is null or p.id = respondent)
			-- Runs as the function owner, so the security_invoker view sees every respondent's rows.
			and exists (
				select 1 from public.consents c
				where c.user_id = p.id and c.granted and c.purpose = 'processing'
			)
	),
	eligible as (
		select v.id, v.email, count(a.sheet_id)::int as answered,
			max(a.updated_at) as last_answer, r.requested_at,
			case
				when search = '' or strpos(lower(v.email), lower(search)) > 0 then 1
				else extensions.word_similarity(lower(search), lower(v.email))
			end as score
		from verified v
		left join public.survey_answers a on a.user_id = v.id
		left join public.conversation_requests r on r.user_id = v.id
		where not requested_only or r.user_id is not null
		group by v.id, v.email, r.requested_at
	)
	select e.id, e.email, e.answered, e.last_answer, e.requested_at, count(*) over ()
	from eligible e
	where e.score >= 0.4
	order by e.score desc, e.last_answer desc nulls last, e.email
	limit least(greatest(page_size, 1), 100)
	offset greatest(page_offset, 0);
$$;

-- Adds `counts` ([{screen_id, device}], already validated by the server) to today's counters.
create function public.count_screens(version text, counts jsonb) returns void
language sql security definer set search_path = ''
as $$
	insert into public.survey_screen_counts as c (day, catalogue_version, screen_id, device, n)
	select current_date, version, item ->> 'screen_id', item ->> 'device', count(*)
	from jsonb_array_elements(counts) as item
	group by item ->> 'screen_id', item ->> 'device'
	on conflict (day, catalogue_version, screen_id, device) do update set n = c.n + excluded.n;
$$;

revoke execute on function public.merge_anonymous_respondent(uuid, uuid),
	public.admin_respondents(text, uuid, int, int, boolean),
	public.count_screens(text, jsonb)
	from public, anon, authenticated;
grant execute on function public.merge_anonymous_respondent(uuid, uuid),
	public.admin_respondents(text, uuid, int, int, boolean),
	public.count_screens(text, jsonb)
	to service_role;

-- ---------------------------------------------------------------------------
-- Privileges. Reset every table to nothing, then grant exactly what the RLS policies are meant to
-- allow, so local and hosted projects end up the same.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.consent_logs, public.consents, public.survey_answers,
	public.access_logs, public.conversation_requests, public.admins,
	public.survey_screen_counts, public.survey_journeys, public.survey_journey_events,
	public.survey_journey_owners
	from public, anon, authenticated, service_role;

-- Server side (secret key): reads and writes everything, RLS bypassed.
grant select, insert, update, delete on public.profiles, public.consent_logs, public.survey_answers,
	public.access_logs, public.conversation_requests, public.admins,
	public.survey_screen_counts, public.survey_journeys, public.survey_journey_events,
	public.survey_journey_owners
	to service_role;
grant select on public.consents to service_role;

-- Respondents (signed in, anonymous or verified): read their own rows, append their consents.
-- The "read own" / "append own" policies narrow these to the respondent's rows.
grant select on public.profiles, public.consent_logs, public.consents, public.survey_answers,
	public.access_logs, public.conversation_requests
	to authenticated;
grant insert on public.consent_logs to authenticated;

-- anon: nothing. admins and metrics: server only.

-- ---------------------------------------------------------------------------
-- Retention jobs (pg_cron).
-- ---------------------------------------------------------------------------

-- Respondents who never verified an email are purged after 7 days. Their answers cascade;
-- consent and access logs keep their rows with user_id nulled.
select cron.schedule(
	'purge-unverified-respondents',
	'17 3 * * *',
	$$delete from auth.users where is_anonymous and created_at < now() - interval '7 days'$$
);

-- The link between a person and their metrics journey lasts 30 days after its last event.
select cron.schedule(
	'unlink-survey-journeys',
	'27 3 * * *',
	$$delete from public.survey_journey_owners o
		using public.survey_journeys j
		where j.id = o.journey_id and j.last_event_at < now() - interval '30 days'$$
);
