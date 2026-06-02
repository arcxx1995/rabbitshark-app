with evaluation_seed as (
  insert into public.evaluation_files (
    slug,
    title,
    description,
    audience,
    version,
    question_count,
    funded_threshold_percent,
    total_possible_points,
    evaluation_json,
    created_by
  )
  values (
    'cash-foundations-001',
    'Cash Foundations Evaluation',
    'A 25-question cash-game evaluation focused on position, c-bets, 3-bet pots, turns, and river defense.',
    'Cash game fundamentals',
    '1.0.0',
    25,
    80,
    2500,
    '{
      "id": "cash-foundations-001",
      "title": "Cash Foundations Evaluation",
      "audience": "Cash game fundamentals",
      "description": "A 25-question cash-game evaluation focused on position, c-bets, 3-bet pots, turns, and river defense.",
      "version": "1.0.0",
      "questions": [
        { "id": "cash-foundations-001-q01", "sourceScenarioId": "scenario_001" },
        { "id": "cash-foundations-001-q02", "sourceScenarioId": "scenario_002" },
        { "id": "cash-foundations-001-q03", "sourceScenarioId": "scenario_003" },
        { "id": "cash-foundations-001-q04", "sourceScenarioId": "scenario_005" },
        { "id": "cash-foundations-001-q05", "sourceScenarioId": "scenario_006" },
        { "id": "cash-foundations-001-q06", "sourceScenarioId": "scenario_001" },
        { "id": "cash-foundations-001-q07", "sourceScenarioId": "scenario_002" },
        { "id": "cash-foundations-001-q08", "sourceScenarioId": "scenario_005" },
        { "id": "cash-foundations-001-q09", "sourceScenarioId": "scenario_003" },
        { "id": "cash-foundations-001-q10", "sourceScenarioId": "scenario_006" },
        { "id": "cash-foundations-001-q11", "sourceScenarioId": "scenario_001" },
        { "id": "cash-foundations-001-q12", "sourceScenarioId": "scenario_005" },
        { "id": "cash-foundations-001-q13", "sourceScenarioId": "scenario_002" },
        { "id": "cash-foundations-001-q14", "sourceScenarioId": "scenario_003" },
        { "id": "cash-foundations-001-q15", "sourceScenarioId": "scenario_006" },
        { "id": "cash-foundations-001-q16", "sourceScenarioId": "scenario_005" },
        { "id": "cash-foundations-001-q17", "sourceScenarioId": "scenario_001" },
        { "id": "cash-foundations-001-q18", "sourceScenarioId": "scenario_002" },
        { "id": "cash-foundations-001-q19", "sourceScenarioId": "scenario_006" },
        { "id": "cash-foundations-001-q20", "sourceScenarioId": "scenario_003" },
        { "id": "cash-foundations-001-q21", "sourceScenarioId": "scenario_001" },
        { "id": "cash-foundations-001-q22", "sourceScenarioId": "scenario_005" },
        { "id": "cash-foundations-001-q23", "sourceScenarioId": "scenario_002" },
        { "id": "cash-foundations-001-q24", "sourceScenarioId": "scenario_006" },
        { "id": "cash-foundations-001-q25", "sourceScenarioId": "scenario_003" }
      ]
    }'::jsonb,
    null
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    description = excluded.description,
    audience = excluded.audience,
    version = excluded.version,
    question_count = excluded.question_count,
    funded_threshold_percent = excluded.funded_threshold_percent,
    total_possible_points = excluded.total_possible_points,
    evaluation_json = excluded.evaluation_json,
    updated_at = now()
  returning id
),
challenge_seed as (
  insert into public.challenges (
    name,
    evaluation_file_id,
    created_by
  )
  select
    'Cash Foundations Evaluation (Testing Replica)',
    evaluation_seed.id,
    null
  from evaluation_seed
  where not exists (
    select 1
    from public.challenges
    where challenges.name = 'Cash Foundations Evaluation (Testing Replica)'
      and challenges.evaluation_file_id = evaluation_seed.id
  )
  returning id
),
selected_challenge as (
  select id from challenge_seed
  union all
  select challenges.id
  from public.challenges
  join evaluation_seed
    on evaluation_seed.id = challenges.evaluation_file_id
  where challenges.name = 'Cash Foundations Evaluation (Testing Replica)'
  limit 1
),
target_profile as (
  select id
  from public.profiles
  where lower(email) = 'arcxx1995@gmail.com'
  limit 1
)
insert into public.user_challenges (
  user_id,
  challenge_id,
  assignment_code,
  status,
  assigned_by,
  is_test_assignment,
  decision_time_limit_seconds
)
select
  target_profile.id,
  selected_challenge.id,
  public.generate_user_challenge_assignment_code(),
  'assigned',
  null,
  true,
  25
from target_profile, selected_challenge
where not exists (
  select 1
  from public.user_challenges
  where user_challenges.user_id = target_profile.id
    and user_challenges.challenge_id = selected_challenge.id
    and user_challenges.is_test_assignment = true
    and user_challenges.status in ('assigned', 'active', 'completed', 'failed')
);
