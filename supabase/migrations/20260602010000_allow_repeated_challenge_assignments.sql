alter table public.user_challenges
drop constraint if exists user_challenges_user_id_challenge_id_key;

drop index if exists public.user_challenges_user_id_challenge_id_key;

create or replace function public.generate_user_challenge_assignment_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  loop
    generated_code := lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0');

    exit when not exists (
      select 1
      from public.user_challenges
      where assignment_code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

alter table public.user_challenges
alter column assignment_code set default public.generate_user_challenge_assignment_code();

create unique index if not exists user_challenges_assignment_code_key
on public.user_challenges (assignment_code);

create index if not exists user_challenges_user_challenge_idx
on public.user_challenges (user_id, challenge_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_challenges_assignment_code_format'
      and conrelid = 'public.user_challenges'::regclass
  ) then
    alter table public.user_challenges
    add constraint user_challenges_assignment_code_format
    check (assignment_code ~ '^[0-9]{9}$');
  end if;
end $$;
