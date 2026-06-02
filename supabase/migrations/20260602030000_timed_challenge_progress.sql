alter table public.user_challenges
add column if not exists current_question_index integer not null default 0;

alter table public.user_challenges
add column if not exists progress_results jsonb not null default '[]'::jsonb;

alter table public.user_challenges
add column if not exists decision_time_limit_seconds integer not null default 25;

alter table public.user_challenges
add column if not exists last_progress_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_challenges_current_question_index_check'
      and conrelid = 'public.user_challenges'::regclass
  ) then
    alter table public.user_challenges
    add constraint user_challenges_current_question_index_check
    check (current_question_index >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_challenges_progress_results_array_check'
      and conrelid = 'public.user_challenges'::regclass
  ) then
    alter table public.user_challenges
    add constraint user_challenges_progress_results_array_check
    check (jsonb_typeof(progress_results) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_challenges_decision_time_limit_seconds_check'
      and conrelid = 'public.user_challenges'::regclass
  ) then
    alter table public.user_challenges
    add constraint user_challenges_decision_time_limit_seconds_check
    check (decision_time_limit_seconds between 10 and 120);
  end if;
end $$;

update public.user_challenges
set
  progress_results = scenario_results,
  current_question_index = coalesce(jsonb_array_length(scenario_results), 0),
  last_progress_at = coalesce(completed_at, started_at, assigned_at)
where status in ('completed', 'failed')
  and jsonb_array_length(progress_results) = 0
  and jsonb_array_length(scenario_results) > 0;

create or replace function public.record_user_challenge_progress(
  target_assignment_id uuid,
  next_question_index integer,
  progress_scenario_results jsonb
)
returns public.user_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.user_challenges;
begin
  if next_question_index < 0 then
    raise exception 'Question index cannot be negative.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(progress_scenario_results) is distinct from 'array' then
    raise exception 'Progress results must be a JSON array.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(progress_scenario_results) <> next_question_index then
    raise exception 'Question index must match recorded result count.'
      using errcode = '22023';
  end if;

  update public.user_challenges
  set
    status = 'active',
    started_at = coalesce(started_at, now()),
    current_question_index = next_question_index,
    progress_results = progress_scenario_results,
    scenario_results = progress_scenario_results,
    last_progress_at = now()
  where id = target_assignment_id
    and user_id = auth.uid()
    and status in ('assigned', 'active')
  returning * into assignment;

  if assignment.id is null then
    raise exception 'Challenge assignment is not available to update.'
      using errcode = '42501';
  end if;

  return assignment;
end;
$$;

create or replace function public.complete_user_challenge(
  target_assignment_id uuid,
  result_score numeric,
  result_earned_points numeric,
  result_total_possible_points numeric,
  result_funded boolean,
  result_scenario_results jsonb
)
returns public.user_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.user_challenges;
begin
  if result_score < 0 or result_score > 100 then
    raise exception 'Challenge score must be between 0 and 100.'
      using errcode = '22023';
  end if;

  if result_earned_points < 0 or result_total_possible_points <= 0 then
    raise exception 'Challenge point totals are invalid.'
      using errcode = '22023';
  end if;

  if result_earned_points > result_total_possible_points then
    raise exception 'Earned points cannot exceed total possible points.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(result_scenario_results) is distinct from 'array' then
    raise exception 'Scenario results must be a JSON array.'
      using errcode = '22023';
  end if;

  update public.user_challenges
  set
    status = case when result_funded then 'completed' else 'failed' end,
    completed_at = now(),
    score = result_score,
    earned_points = result_earned_points,
    total_possible_points = result_total_possible_points,
    funded = result_funded,
    scenario_results = result_scenario_results,
    progress_results = result_scenario_results,
    current_question_index = jsonb_array_length(result_scenario_results),
    last_progress_at = now()
  where id = target_assignment_id
    and user_id = auth.uid()
    and status in ('assigned', 'active')
  returning * into assignment;

  if assignment.id is null then
    raise exception 'Challenge assignment is not available to complete.'
      using errcode = '42501';
  end if;

  return assignment;
end;
$$;

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
    'players should save each question through the progress RPC'::text;
end;
$$;
