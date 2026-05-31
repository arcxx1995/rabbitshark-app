# Developer Console Deployment

The client app and developer console must be deployed as separate Vercel projects.

## Client App

Use the default build:

```bash
npm run build
```

Output directory:

```bash
dist
```

This build only includes `index.html`. It does not ship `admin.html`.

## Developer Console

Use the admin build:

```bash
npm run build:admin
```

Output directory:

```bash
dist-admin
```

Deploy this as a separate Vercel project or separate protected domain.

The admin build emits `dist-admin/index.html`, so the deployed developer console
opens at the project root:

```text
https://your-admin-project.vercel.app/
```

## Supabase Developer Allowlist

Create a developer-only allowlist table in Supabase:

```sql
create table if not exists public.developer_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.developer_users enable row level security;

drop policy if exists "developers can read own allowlist row"
on public.developer_users;

create policy "developers can read own allowlist row"
on public.developer_users
for select
to authenticated
using (user_id = auth.uid());
```

After creating the developer's Supabase Auth account, add that user's ID:

```sql
insert into public.developer_users (user_id, email)
values ('USER_ID_FROM_AUTH_USERS', 'developer@example.com')
on conflict (user_id) do update set email = excluded.email;
```

The admin console checks this table after login. A signed-in user without a row in `developer_users` receives an access denied screen.
