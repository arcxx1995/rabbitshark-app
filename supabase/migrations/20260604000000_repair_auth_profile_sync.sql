create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, created_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, display_name, created_at)
select
  auth_users.id,
  coalesce(auth_users.email, ''),
  coalesce(
    auth_users.raw_user_meta_data->>'name',
    auth_users.raw_user_meta_data->>'full_name'
  ),
  coalesce(auth_users.created_at, now())
from auth.users auth_users
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, profiles.display_name);

create or replace function public.search_assignable_users(
  profile_query text,
  result_limit integer default 8
)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_query text := trim(coalesce(profile_query, ''));
  normalized_limit integer := greatest(1, least(coalesce(result_limit, 8), 25));
begin
  if not public.current_user_is_developer() then
    raise exception 'Developer access required.'
      using errcode = '42501';
  end if;

  if length(normalized_query) < 2 then
    return;
  end if;

  insert into public.profiles (id, email, display_name, created_at)
  select
    auth_users.id,
    coalesce(auth_users.email, ''),
    coalesce(
      auth_users.raw_user_meta_data->>'name',
      auth_users.raw_user_meta_data->>'full_name'
    ),
    coalesce(auth_users.created_at, now())
  from auth.users auth_users
  where auth_users.email ilike '%' || normalized_query || '%'
     or coalesce(auth_users.raw_user_meta_data->>'name', '') ilike '%' || normalized_query || '%'
     or coalesce(auth_users.raw_user_meta_data->>'full_name', '') ilike '%' || normalized_query || '%'
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name);

  return query
  select
    profiles.id,
    profiles.email,
    profiles.display_name,
    profiles.created_at
  from public.profiles
  where profiles.email ilike '%' || normalized_query || '%'
     or coalesce(profiles.display_name, '') ilike '%' || normalized_query || '%'
  order by
    case when lower(profiles.email) = lower(normalized_query) then 0 else 1 end,
    profiles.email
  limit normalized_limit;
end;
$$;

revoke execute on function public.search_assignable_users(text, integer) from public;
revoke execute on function public.search_assignable_users(text, integer) from anon;
grant execute on function public.search_assignable_users(text, integer) to authenticated;
