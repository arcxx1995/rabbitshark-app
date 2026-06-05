import { readFile } from "node:fs/promises";

const checks = [
  {
    file: "supabase/migrations/20260604010000_dashboard_assignment_sync.sql",
    patterns: [
      "get_current_user_challenge_dashboard",
      "updated_at timestamptz",
      "set_user_challenges_updated_at",
      "dashboard_rpc",
    ],
  },
  {
    file: "supabase/migrations/20260604000000_repair_auth_profile_sync.sql",
    patterns: [
      "on_auth_user_created",
      "public.handle_new_user",
      "public.search_assignable_users",
      "from auth.users auth_users",
    ],
  },
  {
    file: "src/lib/challengeDatabase.js",
    patterns: [
      "getCurrentUserChallengeDashboard",
      'rpc("get_current_user_challenge_dashboard"',
      "search_assignable_users",
      "listAssignmentsForUser",
      "falling back to direct assignment queries",
    ],
  },
  {
    file: "src/App.jsx",
    patterns: [
      "setAssignmentRealtimeStatus",
      "scheduleReconnect",
      "CHANNEL_ERROR",
      "TIMED_OUT",
    ],
  },
  {
    file: "src/admin/AdminConsole.jsx",
    patterns: [
      "assignmentHistory",
      "listAssignmentsForUser",
      "Existing Assignments",
      "creates a separate challenge code",
    ],
  },
];

let failed = false;

for (const check of checks) {
  const content = await readFile(check.file, "utf8");
  const missingPatterns = check.patterns.filter((pattern) => !content.includes(pattern));

  if (missingPatterns.length > 0) {
    failed = true;
    console.error(`${check.file} is missing: ${missingPatterns.join(", ")}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("Challenge sync verification passed.");
}
