create or replace function public.current_user_is_developer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.developer_users
    where developer_users.user_id = auth.uid()
  );
$$;

create or replace function public.assign_challenge_to_user(
  target_challenge_id uuid,
  target_user_id uuid
)
returns public.user_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.user_challenges;
  attempt integer;
begin
  if not public.current_user_is_developer() then
    raise exception 'Developer access required.'
      using errcode = '42501';
  end if;

  for attempt in 1..10 loop
    begin
      insert into public.user_challenges (
        user_id,
        challenge_id,
        assignment_code,
        status,
        assigned_by
      )
      values (
        target_user_id,
        target_challenge_id,
        public.generate_user_challenge_assignment_code(),
        'assigned',
        auth.uid()
      )
      returning * into assignment;

      return assignment;
    exception
      when unique_violation then
        if attempt = 10 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'Could not generate a unique assignment code.'
    using errcode = '23505';
end;
$$;

create or replace function public.revoke_user_challenge(target_assignment_id uuid)
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
  set status = 'revoked'
  where id = target_assignment_id
    and status in ('assigned', 'active')
  returning * into assignment;

  if assignment.id is null then
    raise exception 'Only assigned or active challenges can be revoked.'
      using errcode = '22023';
  end if;

  return assignment;
end;
$$;

create or replace function public.mark_user_challenge_started(target_assignment_id uuid)
returns public.user_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.user_challenges;
begin
  update public.user_challenges
  set
    status = 'active',
    started_at = coalesce(started_at, now())
  where id = target_assignment_id
    and user_id = auth.uid()
    and status in ('assigned', 'active')
  returning * into assignment;

  if assignment.id is null then
    raise exception 'Challenge assignment is not available to start.'
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
    scenario_results = result_scenario_results
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

drop policy if exists "users update own active challenge progress" on public.user_challenges;

create policy "users cannot directly update challenge progress"
on public.user_challenges
for update
to authenticated
using (false)
with check (false);

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
    'players should update progress through restricted RPC functions'::text;
end;
$$;
