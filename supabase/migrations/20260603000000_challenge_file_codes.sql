create or replace function public.generate_challenge_file_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  loop
    generated_code := 'C' || lpad((floor(random() * 90000) + 10000)::bigint::text, 5, '0');

    exit when not exists (
      select 1
      from public.evaluation_files
      where file_code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

alter table public.evaluation_files
add column if not exists file_code text;

alter table public.evaluation_files
alter column file_code set default public.generate_challenge_file_code();

do $$
declare
  evaluation_file record;
  generated_code text;
begin
  for evaluation_file in
    select id
    from public.evaluation_files
    where file_code is null
    order by created_at, id
  loop
    loop
      generated_code := public.generate_challenge_file_code();

      exit when not exists (
        select 1
        from public.evaluation_files
        where file_code = generated_code
      );
    end loop;

    update public.evaluation_files
    set file_code = generated_code
    where id = evaluation_file.id;
  end loop;
end $$;

alter table public.evaluation_files
alter column file_code set not null;

create unique index if not exists evaluation_files_file_code_key
on public.evaluation_files (file_code);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluation_files_file_code_format'
      and conrelid = 'public.evaluation_files'::regclass
  ) then
    alter table public.evaluation_files
    add constraint evaluation_files_file_code_format
    check (file_code ~ '^C[0-9]{5}$');
  end if;
end $$;
