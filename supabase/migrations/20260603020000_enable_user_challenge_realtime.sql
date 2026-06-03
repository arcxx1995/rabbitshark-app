do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_challenges'
  ) then
    alter publication supabase_realtime add table public.user_challenges;
  end if;
end $$;

alter table public.user_challenges replica identity full;
