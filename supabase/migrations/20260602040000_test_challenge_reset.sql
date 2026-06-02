alter table public.user_challenges
add column if not exists is_test_assignment boolean not null default false;

alter table public.user_challenges
add column if not exists reset_count integer not null default 0;

alter table public.user_challenges
add column if not exists last_reset_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_challenges_reset_count_check'
      and conrelid = 'public.user_challenges'::regclass
  ) then
    alter table public.user_challenges
    add constraint user_challenges_reset_count_check
    check (reset_count >= 0);
  end if;
end $$;

create index if not exists user_challenges_test_assignment_idx
on public.user_challenges (user_id, is_test_assignment, assigned_at desc);

create or replace function public.reset_test_user_challenge(target_assignment_id uuid)
returns public.user_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.user_challenges;
begin
  if not public.current_user_is_developer() then
    raise exception 'Developer access required.'
      using errcode = '42501';
  end if;

  update public.user_challenges
  set
    status = 'assigned',
    started_at = null,
    completed_at = null,
    score = 0,
    earned_points = 0,
    funded = false,
    scenario_results = '[]'::jsonb,
    progress_results = '[]'::jsonb,
    current_question_index = 0,
    last_progress_at = null,
    reset_count = reset_count + 1,
    last_reset_at = now()
  where id = target_assignment_id
    and is_test_assignment = true
    and exists (
      select 1
      from public.profiles
      where profiles.id = user_challenges.user_id
        and lower(profiles.email) = 'arcxx1995@gmail.com'
    )
  returning * into assignment;

  if assignment.id is null then
    raise exception 'Only the arcxx1995 test assignment can be reset.'
      using errcode = '42501';
  end if;

  return assignment;
end;
$$;

do $$
declare
  target_user_id uuid;
  source_challenge public.challenges;
  replica_challenge_id uuid;
begin
  select profiles.id
  into target_user_id
  from public.profiles
  where lower(profiles.email) = 'arcxx1995@gmail.com'
  order by profiles.created_at
  limit 1;

  if target_user_id is null then
    return;
  end if;

  select challenges.*
  into source_challenge
  from public.user_challenges
  join public.challenges
    on challenges.id = user_challenges.challenge_id
  where user_challenges.user_id = target_user_id
    and coalesce(user_challenges.is_test_assignment, false) = false
    and challenges.name not ilike '%testing replica%'
  order by user_challenges.assigned_at desc
  limit 1;

  if source_challenge.id is null then
    select challenges.*
    into source_challenge
    from public.challenges
    where challenges.name not ilike '%testing replica%'
    order by challenges.created_at desc
    limit 1;
  end if;

  if source_challenge.id is null then
    return;
  end if;

  select challenges.id
  into replica_challenge_id
  from public.challenges
  where challenges.evaluation_file_id = source_challenge.evaluation_file_id
    and challenges.name = source_challenge.name || ' (Testing Replica)'
  order by challenges.created_at desc
  limit 1;

  if replica_challenge_id is null then
    insert into public.challenges (
      name,
      evaluation_file_id,
      created_by
    )
    values (
      source_challenge.name || ' (Testing Replica)',
      source_challenge.evaluation_file_id,
      source_challenge.created_by
    )
    returning id into replica_challenge_id;
  end if;

  if not exists (
    select 1
    from public.user_challenges
    where user_id = target_user_id
      and challenge_id = replica_challenge_id
      and is_test_assignment = true
      and status in ('assigned', 'active', 'completed', 'failed')
  ) then
    insert into public.user_challenges (
      user_id,
      challenge_id,
      assignment_code,
      status,
      assigned_by,
      is_test_assignment,
      decision_time_limit_seconds
    )
    values (
      target_user_id,
      replica_challenge_id,
      public.generate_user_challenge_assignment_code(),
      'assigned',
      source_challenge.created_by,
      true,
      25
    );
  end if;
end $$;

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
    'only the marked arcxx1995 test assignment should be resettable'::text;
end;
$$;
