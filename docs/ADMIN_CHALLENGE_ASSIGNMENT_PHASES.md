# Admin Challenge Assignment Phases

## Phase 1: Assignment Instances

Each admin assignment creates a new `user_challenges` row. Reassigning the same
challenge to the same user creates another assignment instance with a separate
primary key and assignment code.

## Phase 2: Unique 9 Digit Codes

The database generates assignment codes with
`generate_user_challenge_assignment_code()`. `assignment_code` is globally unique
and constrained to exactly 9 digits.

## Phase 3: Assignment RPC

Admins assign challenges through `assign_challenge_to_user()`. The RPC checks
developer access, writes `assigned_by`, and retries rare assignment-code
collisions inside the database.

## Phase 4: Assignment History

The admin assign tab shows existing assignment instances for the selected user
and challenge. If instances already exist, the admin must confirm before adding
another one.

## Phase 5: Revoke Flow

Admins can revoke `assigned` or `active` assignment instances through
`revoke_user_challenge()`. Completed and failed assignments remain immutable from
the revoke control.

## Phase 6: Assignment Audit

Assignment lookup shows who assigned each challenge, using the `assigned_by`
profile where available.

## Phase 7: Search Quality

User and assignment lookup searches normalize special filter characters and
prioritize exact email matches in user search results.

## Phase 8: Player Progress RPCs

Players start and complete assignments through restricted RPCs instead of direct
table updates. Direct player updates to `user_challenges` are blocked by RLS.

## Phase 9: Result Details

Admin lookup exposes scenario-level results for completed assignments, including
selected action, best action, and point totals.

## Phase 10: Health Checks

The admin console includes a system health view backed by
`get_challenge_system_health()`. It checks repeated assignment support,
assignment code uniqueness and format, assignment code default generation, RPC
availability, and direct-update blocking.
