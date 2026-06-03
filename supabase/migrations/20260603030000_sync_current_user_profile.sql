create or replace function public.sync_current_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  synced_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, email, display_name)
  values (
    auth.uid(),
    coalesce(auth.jwt()->>'email', ''),
    coalesce(
      auth.jwt()->'user_metadata'->>'name',
      auth.jwt()->'user_metadata'->>'full_name'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name)
  returning * into synced_profile;

  return synced_profile;
end;
$$;

grant execute on function public.sync_current_user_profile() to authenticated;
