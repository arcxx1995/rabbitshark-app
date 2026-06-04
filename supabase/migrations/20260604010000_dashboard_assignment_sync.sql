alter table public.user_challenges
add column if not exists updated_at timestamptz not null default now();

update public.user_challenges
set updated_at = coalesce(last_progress_at, completed_at, started_at, assigned_at, updated_at, now())
where updated_at is null
   or updated_at < coalesce(last_progress_at, completed_at, started_at, assigned_at, updated_at, now());

create or replace function public.set_user_challenges_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_challenges_updated_at on public.user_challenges;

create trigger set_user_challenges_updated_at
before update on public.user_challenges
for each row execute function public.set_user_challenges_updated_at();

create index if not exists user_challenges_user_status_updated_idx
on public.user_challenges (user_id, status, updated_at desc);

create or replace function public.get_current_user_challenge_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  active_assignments jsonb := '[]'::jsonb;
  past_assignments jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      to_jsonb(user_challenges)
        || jsonb_build_object(
          'challenges',
          to_jsonb(challenges)
            || jsonb_build_object('evaluation_files', to_jsonb(evaluation_files))
        )
      order by user_challenges.assigned_at desc, user_challenges.updated_at desc
    ),
    '[]'::jsonb
  )
  into active_assignments
  from public.user_challenges
  join public.challenges
    on challenges.id = user_challenges.challenge_id
  join public.evaluation_files
    on evaluation_files.id = challenges.evaluation_file_id
  where user_challenges.user_id = current_user_id
    and user_challenges.status in ('assigned', 'active');

  select coalesce(
    jsonb_agg(
      to_jsonb(user_challenges)
        || jsonb_build_object(
          'challenges',
          to_jsonb(challenges)
            || jsonb_build_object('evaluation_files', to_jsonb(evaluation_files))
        )
      order by user_challenges.completed_at desc nulls last, user_challenges.updated_at desc
    ),
    '[]'::jsonb
  )
  into past_assignments
  from public.user_challenges
  join public.challenges
    on challenges.id = user_challenges.challenge_id
  join public.evaluation_files
    on evaluation_files.id = challenges.evaluation_file_id
  where user_challenges.user_id = current_user_id
    and user_challenges.status in ('completed', 'failed');

  return jsonb_build_object(
    'user_id', current_user_id,
    'active_assignments', active_assignments,
    'past_assignments', past_assignments,
    'loaded_at', now()
  );
end;
$$;

revoke execute on function public.get_current_user_challenge_dashboard() from public;
revoke execute on function public.get_current_user_challenge_dashboard() from anon;
grant execute on function public.get_current_user_challenge_dashboard() to authenticated;

create or replace function public.get_challenge_system_health()
returns table (
  check_name text,
  status text,
  details text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_developer() then
    raise exception 'Developer access required.'
      using errcode = '42501';
  end if;

  return query
  select
    'repeated_assignment_constraint_removed'::text,
    case when not exists (
      select 1
      from pg_constraint
      where conname = 'user_challenges_user_id_challenge_id_key'
        and conrelid = 'public.user_challenges'::regclass
    ) then 'ok' else 'error' end,
    'user_id and challenge_id must not be unique together'::text
  union all
  select
    'assignment_code_unique'::text,
    case when exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'user_challenges'
        and indexname = 'user_challenges_assignment_code_key'
    ) then 'ok' else 'error' end,
    'assignment_code must remain globally unique'::text
  union all
  select
    'assignment_code_format'::text,
    case when exists (
      select 1
      from pg_constraint
      where conname = 'user_challenges_assignment_code_format'
        and conrelid = 'public.user_challenges'::regclass
    ) then 'ok' else 'error' end,
    'assignment_code must be exactly 9 digits'::text
  union all
  select
    'assignment_code_default'::text,
    case when exists (
      select 1
      from pg_attrdef
      join pg_attribute
        on pg_attribute.attrelid = pg_attrdef.adrelid
       and pg_attribute.attnum = pg_attrdef.adnum
      where pg_attrdef.adrelid = 'public.user_challenges'::regclass
        and pg_attribute.attname = 'assignment_code'
        and pg_get_expr(pg_attrdef.adbin, pg_attrdef.adrelid)
          like '%generate_user_challenge_assignment_code%'
    ) then 'ok' else 'error' end,
    'assignment_code default should call database generator'::text
  union all
  select
    'assignment_rpc'::text,
    case when exists (
      select 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and pg_proc.proname = 'assign_challenge_to_user'
    ) then 'ok' else 'error' end,
    'developer assignment should use the RPC workflow'::text
  union all
  select
    'direct_user_updates_blocked'::text,
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'user_challenges'
        and policyname = 'users cannot directly update challenge progress'
    ) then 'ok' else 'error' end,
    'players should update progress through restricted RPC functions'::text
  union all
  select
    'timed_progress_columns'::text,
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_challenges'
        and column_name = 'decision_time_limit_seconds'
    ) then 'ok' else 'error' end,
    'assignments should persist per-question progress and a decision timer'::text
  union all
  select
    'progress_rpc'::text,
    case when exists (
      select 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and pg_proc.proname = 'record_user_challenge_progress'
    ) then 'ok' else 'error' end,
    'players should save each question through the progress RPC'::text
  union all
  select
    'test_assignment_reset_rpc'::text,
    case when exists (
      select 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and pg_proc.proname = 'reset_test_user_challenge'
    ) then 'ok' else 'error' end,
    'only marked test assignments should be resettable'::text
  union all
  select
    'dashboard_rpc'::text,
    case when exists (
      select 1
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and pg_proc.proname = 'get_current_user_challenge_dashboard'
    ) then 'ok' else 'error' end,
    'player dashboard should load assignment rows through one server-side RPC'::text
  union all
  select
    'assignment_updated_at'::text,
    case when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_challenges'
        and column_name = 'updated_at'
    ) then 'ok' else 'error' end,
    'assignment rows should have deterministic update timestamps for sync ordering'::text;
end;
$$;
