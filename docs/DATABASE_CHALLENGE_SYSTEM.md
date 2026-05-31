# Database Challenge System

Run this SQL in Supabase before using the database-backed admin console.

## Tables And Profiles

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, display_name)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name')
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name;
```

## Developer Allowlist

```sql
create table if not exists public.developer_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
```

Add a developer:

```sql
insert into public.developer_users (user_id, email)
values ('PASTE_AUTH_USER_ID_HERE', 'developer@example.com')
on conflict (user_id) do update
set email = excluded.email;
```

## Evaluation And Challenge Tables

```sql
create table if not exists public.evaluation_files (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  audience text,
  version text,
  question_count integer not null,
  funded_threshold_percent numeric not null default 80,
  total_possible_points numeric not null,
  evaluation_json jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  evaluation_file_id uuid not null references public.evaluation_files(id) on delete restrict,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  assignment_code text not null default lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0'),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned', 'active', 'completed', 'failed', 'revoked')),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  score numeric,
  earned_points numeric,
  total_possible_points numeric,
  funded boolean not null default false,
  scenario_results jsonb not null default '[]'::jsonb,
  unique (assignment_code),
  unique (user_id, challenge_id)
);
```

If the tables already exist, run this migration once:

```sql
alter table public.user_challenges
add column if not exists assignment_code text;

do $$
declare
  assignment record;
  generated_code text;
begin
  for assignment in
    select id
    from public.user_challenges
    where assignment_code is null
  loop
    loop
      generated_code := lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0');

      exit when not exists (
        select 1
        from public.user_challenges
        where assignment_code = generated_code
      );
    end loop;

    update public.user_challenges
    set assignment_code = generated_code
    where id = assignment.id;
  end loop;
end $$;

alter table public.user_challenges
alter column assignment_code set default lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0');

alter table public.user_challenges
alter column assignment_code set not null;

create unique index if not exists user_challenges_assignment_code_key
on public.user_challenges (assignment_code);
```

## RLS Policies

```sql
alter table public.profiles enable row level security;
alter table public.developer_users enable row level security;
alter table public.evaluation_files enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;

drop policy if exists "developers can read profiles" on public.profiles;
drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "developers can read own allowlist row" on public.developer_users;
drop policy if exists "developers manage evaluation files" on public.evaluation_files;
drop policy if exists "assigned users read evaluation files" on public.evaluation_files;
drop policy if exists "developers manage challenges" on public.challenges;
drop policy if exists "assigned users read challenges" on public.challenges;
drop policy if exists "developers manage user challenges" on public.user_challenges;
drop policy if exists "users read own assigned challenges" on public.user_challenges;
drop policy if exists "users update own active challenge progress" on public.user_challenges;

create policy "developers can read profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
);

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "developers can read own allowlist row"
on public.developer_users
for select
to authenticated
using (user_id = auth.uid());

create policy "developers manage evaluation files"
on public.evaluation_files
for all
to authenticated
using (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
);

create policy "assigned users read evaluation files"
on public.evaluation_files
for select
to authenticated
using (
  exists (
    select 1
    from public.user_challenges
    join public.challenges
      on challenges.id = user_challenges.challenge_id
    where user_challenges.user_id = auth.uid()
      and user_challenges.status in ('assigned', 'active', 'completed', 'failed')
      and challenges.evaluation_file_id = evaluation_files.id
  )
);

create policy "developers manage challenges"
on public.challenges
for all
to authenticated
using (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
);

create policy "assigned users read challenges"
on public.challenges
for select
to authenticated
using (
  exists (
    select 1
    from public.user_challenges
    where user_challenges.user_id = auth.uid()
      and user_challenges.challenge_id = challenges.id
      and user_challenges.status in ('assigned', 'active', 'completed', 'failed')
  )
);

create policy "developers manage user challenges"
on public.user_challenges
for all
to authenticated
using (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.developer_users
    where developer_users.user_id = auth.uid()
  )
);

create policy "users read own assigned challenges"
on public.user_challenges
for select
to authenticated
using (user_id = auth.uid());

create policy "users update own active challenge progress"
on public.user_challenges
for update
to authenticated
using (user_id = auth.uid() and status in ('assigned', 'active'))
with check (user_id = auth.uid());
```
