# Database Challenge System

Run this SQL in Supabase before using the database-backed admin console.
The same setup is also available in the Supabase migrations:

- `supabase/migrations/20260602000000_challenge_system.sql`
- `supabase/migrations/20260602010000_allow_repeated_challenge_assignments.sql`
- `supabase/migrations/20260602020000_assignment_admin_workflow.sql`
- `supabase/migrations/20260602030000_timed_challenge_progress.sql`

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

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  assignment_code text not null default public.generate_user_challenge_assignment_code(),
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
  constraint user_challenges_assignment_code_format check (assignment_code ~ '^[0-9]{9}$'),
  unique (assignment_code)
);
```

If the tables already exist, run this migration once:

```sql
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
alter column assignment_code set default public.generate_user_challenge_assignment_code();

alter table public.user_challenges
alter column assignment_code set not null;

create unique index if not exists user_challenges_assignment_code_key
on public.user_challenges (assignment_code);

create index if not exists user_challenges_user_challenge_idx
on public.user_challenges (user_id, challenge_id);

alter table public.user_challenges
drop constraint if exists user_challenges_user_id_challenge_id_key;

drop index if exists public.user_challenges_user_id_challenge_id_key;

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

create policy "users cannot directly update challenge progress"
on public.user_challenges
for update
to authenticated
using (false)
with check (false);
```

## Assignment RPCs

The deployed app uses RPCs for assignment and progress writes:

- `assign_challenge_to_user(challenge_id, user_id)` creates a new assignment instance.
- `revoke_user_challenge(assignment_id)` revokes assigned or active instances.
- `mark_user_challenge_started(assignment_id)` starts a user's own assignment.
- `complete_user_challenge(...)` completes a user's own assignment with validated result fields.
- `get_challenge_system_health()` returns admin-visible deployment checks.

The latest migration also replaces direct player update access with a blocking
RLS policy. Player progress writes should go through the RPC layer.

## Stored Challenge Outcomes

Each assigned challenge instance stores its own outcome on the same
`user_challenges` row. When a user completes an assignment, the database row is
updated with `status`, `completed_at`, `score`, `earned_points`,
`total_possible_points`, `funded`, and `scenario_results`.

The player app loads active rows from `assigned` and `active` statuses, and past
outcomes from `completed` and `failed` statuses. This means each user's challenge
history is restored from Supabase instead of depending only on browser storage.

## Timed Progress And Resume

Active assignments also store in-progress challenge state:

- `current_question_index`
- `progress_results`
- `decision_time_limit_seconds`
- `last_progress_at`

The default decision timer is 25 seconds. The timer starts only after the hand
history animation finishes and the decision buttons are enabled, so users are not
penalized while the poker engine is revealing pre-decision action.

Every answered or timed-out scenario is saved through
`record_user_challenge_progress()`. If the player reloads or returns later, the
challenge resumes from the next unanswered scenario using the stored progress.
