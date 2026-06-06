-- Replace the hardcoded email guard in reset_test_user_challenge with the
-- standard current_user_is_developer() check used by all other admin RPCs.
-- Any developer-role user may now reset any assignment that carries
-- is_test_assignment = true, which is the correct access boundary.

create or replace function public.reset_test_user_challenge(target_assignment_id uuid)
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
  set
    status = 'assigned',
    started_at = null,
    completed_at = null,
    score = 0,
    earned_points = 0,
    funded = false,
    scenario_results = '[]'::jsonb,
    progress_results = '[]'::jsonb,
    current_question_index = 0,
    last_progress_at = null,
    reset_count = reset_count + 1,
    last_reset_at = now()
  where id = target_assignment_id
    and is_test_assignment = true
  returning * into assignment;

  if assignment.id is null then
    raise exception 'Target assignment not found or is not a test assignment.'
      using errcode = '42501';
  end if;

  return assignment;
end;
$$;
