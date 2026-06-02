do $$
declare
  constraint_record record;
  index_record record;
begin
  for constraint_record in
    select pg_constraint.conname
    from pg_constraint
    join pg_class
      on pg_class.oid = pg_constraint.conrelid
    join pg_namespace
      on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'user_challenges'
      and pg_constraint.contype in ('u', 'x')
      and (
        select array_agg(pg_attribute.attname::text order by pg_attribute.attname::text)
        from unnest(pg_constraint.conkey) as key(attnum)
        join pg_attribute
          on pg_attribute.attrelid = pg_constraint.conrelid
         and pg_attribute.attnum = key.attnum
      ) = array['challenge_id', 'user_id']::text[]
  loop
    execute format(
      'alter table public.user_challenges drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;

  for index_record in
    select index_class.relname as index_name
    from pg_index
    join pg_class table_class
      on table_class.oid = pg_index.indrelid
    join pg_namespace
      on pg_namespace.oid = table_class.relnamespace
    join pg_class index_class
      on index_class.oid = pg_index.indexrelid
    left join pg_constraint
      on pg_constraint.conindid = pg_index.indexrelid
    where pg_namespace.nspname = 'public'
      and table_class.relname = 'user_challenges'
      and pg_index.indisunique
      and pg_constraint.oid is null
      and (
        select array_agg(pg_attribute.attname::text order by pg_attribute.attname::text)
        from unnest(pg_index.indkey) as key(attnum)
        join pg_attribute
          on pg_attribute.attrelid = pg_index.indrelid
         and pg_attribute.attnum = key.attnum
      ) = array['challenge_id', 'user_id']::text[]
  loop
    execute format('drop index if exists public.%I', index_record.index_name);
  end loop;
end $$;

create index if not exists user_challenges_user_challenge_idx
on public.user_challenges (user_id, challenge_id);

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
  violated_constraint text;
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
        get stacked diagnostics violated_constraint = constraint_name;

        if violated_constraint <> 'user_challenges_assignment_code_key' then
          raise;
        end if;

        if attempt = 10 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'Could not generate a unique assignment code.'
    using errcode = '23505';
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
      join pg_class
        on pg_class.oid = pg_constraint.conrelid
      join pg_namespace
        on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relname = 'user_challenges'
        and pg_constraint.contype in ('u', 'x')
        and (
          select array_agg(pg_attribute.attname::text order by pg_attribute.attname::text)
          from unnest(pg_constraint.conkey) as key(attnum)
          join pg_attribute
            on pg_attribute.attrelid = pg_constraint.conrelid
           and pg_attribute.attnum = key.attnum
        ) = array['challenge_id', 'user_id']::text[]
    ) and not exists (
      select 1
      from pg_index
      join pg_class table_class
        on table_class.oid = pg_index.indrelid
      join pg_namespace
        on pg_namespace.oid = table_class.relnamespace
      left join pg_constraint
        on pg_constraint.conindid = pg_index.indexrelid
      where pg_namespace.nspname = 'public'
        and table_class.relname = 'user_challenges'
        and pg_index.indisunique
        and pg_constraint.oid is null
        and (
          select array_agg(pg_attribute.attname::text order by pg_attribute.attname::text)
          from unnest(pg_index.indkey) as key(attnum)
          join pg_attribute
            on pg_attribute.attrelid = pg_index.indrelid
           and pg_attribute.attnum = key.attnum
        ) = array['challenge_id', 'user_id']::text[]
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
