import { resolveEvaluationFile } from "../engine/evaluationEngine";
import { supabase } from "./supabaseClient";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function mapEvaluationRow(row) {
  const evaluationJson = row.evaluation_json ?? row.evaluationJson;
  const resolvedEvaluation = resolveEvaluationFile(evaluationJson);

  return {
    ...row,
    fileCode: row.file_code,
    evaluation: resolvedEvaluation,
    questionCount: row.question_count ?? resolvedEvaluation.questionCount,
  };
}

function mapAssignedChallenge(row) {
  const challenge = row.challenges;
  const evaluationRow = challenge?.evaluation_files;

  if (!challenge || !evaluationRow) {
    throw new Error("Assigned challenge is missing challenge or evaluation data.");
  }

  const evaluation = mapEvaluationRow(evaluationRow).evaluation;
  const status =
    row.status === "active"
      ? "In progress"
      : row.status === "completed"
        ? "Funded"
        : row.status === "failed"
          ? "Failed"
          : row.status === "revoked"
            ? "Revoked"
            : "Ready";

  return {
    id: row.id,
    assignmentId: row.id,
    assignmentCode: row.assignment_code,
    challengeId: row.challenge_id,
    title: challenge.name,
    evaluationId: evaluation.id,
    status,
    purchasedAt: row.assigned_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    score: row.score ?? 0,
    earnedPoints: row.earned_points ?? 0,
    totalPossiblePoints: row.total_possible_points ?? evaluation.totalPossiblePoints,
    funded: Boolean(row.funded),
    scenarioResults: row.scenario_results ?? [],
    progressResults: row.progress_results ?? row.scenario_results ?? [],
    currentQuestionIndex: row.current_question_index ?? 0,
    decisionTimeLimitSeconds: row.decision_time_limit_seconds ?? 25,
    lastProgressAt: row.last_progress_at,
    isTestAssignment: Boolean(row.is_test_assignment),
    resetCount: row.reset_count ?? 0,
    lastResetAt: row.last_reset_at,
    dbBacked: true,
    evaluation,
  };
}

function normalizeSearchQuery(query) {
  return query.trim().replace(/[%,()]/g, " ");
}

function exactEmailFirst(query) {
  const normalizedQuery = query.trim().toLowerCase();

  return (left, right) => {
    const leftExact = left.email?.toLowerCase() === normalizedQuery;
    const rightExact = right.email?.toLowerCase() === normalizedQuery;

    if (leftExact !== rightExact) return leftExact ? -1 : 1;

    return String(left.email ?? "").localeCompare(String(right.email ?? ""));
  };
}

const ASSIGNMENT_LOOKUP_SELECT = `
  *,
  challenges (
    id,
    name,
    created_at,
    evaluation_files (
      id,
      file_code,
      slug,
      title,
      version,
      question_count,
      funded_threshold_percent,
      total_possible_points
    )
  )
`;

async function getCurrentUser(client) {
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;

  return userData.user ?? null;
}

function isMissingRpcError(error) {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`;

  return message.includes("PGRST202") || message.includes("Could not find the function");
}

function isMissingAssignmentTableError(error) {
  const message = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`;

  return (
    message.includes("42P01") ||
    message.includes("user_challenges") &&
      (message.includes("schema cache") ||
        message.includes("does not exist") ||
        message.includes("relation"))
  );
}

async function addAssignedByProfiles(client, assignments) {
  const assignedByIds = [
    ...new Set(
      assignments
        .map((assignment) => assignment.assigned_by)
        .filter(Boolean),
    ),
  ];

  if (assignedByIds.length === 0) {
    return assignments.map((assignment) => ({
      ...assignment,
      assignedByProfile: null,
    }));
  }

  const { data: assignedByProfiles, error } = await client
    .from("profiles")
    .select("id,email,display_name")
    .in("id", assignedByIds);

  if (error) throw error;

  const assignedByProfileById = new Map(
    (assignedByProfiles ?? []).map((profile) => [profile.id, profile]),
  );

  return assignments.map((assignment) => ({
    ...assignment,
    assignedByProfile: assignedByProfileById.get(assignment.assigned_by) ?? null,
  }));
}

export async function getCurrentChallengeUser() {
  const client = requireSupabase();
  const user = await getCurrentUser(client);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? "",
  };
}

export async function listDatabaseEvaluationFiles() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("evaluation_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapEvaluationRow);
}

export async function saveEvaluationFileToDatabase(evaluationFile) {
  const client = requireSupabase();
  const normalizedEvaluation = resolveEvaluationFile(evaluationFile);
  const user = await getCurrentUser(client);

  const { data, error } = await client
    .from("evaluation_files")
    .upsert(
      {
        slug: normalizedEvaluation.id,
        title: normalizedEvaluation.title,
        description: normalizedEvaluation.description,
        audience: normalizedEvaluation.audience,
        version: normalizedEvaluation.version,
        question_count: normalizedEvaluation.questionCount,
        funded_threshold_percent: normalizedEvaluation.fundedThresholdPercent,
        total_possible_points: normalizedEvaluation.totalPossiblePoints,
        evaluation_json: evaluationFile,
        created_by: user?.id,
      },
      { onConflict: "slug" },
    )
    .select("*")
    .single();

  if (error) throw error;

  return mapEvaluationRow(data);
}

export async function listDatabaseChallenges() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("challenges")
    .select("*, evaluation_files(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function createChallengeForEvaluation({ name, evaluationFileId }) {
  const client = requireSupabase();
  const user = await getCurrentUser(client);

  const { data, error } = await client
    .from("challenges")
    .insert({
      name,
      evaluation_file_id: evaluationFileId,
      created_by: user?.id,
    })
    .select("*, evaluation_files(*)")
    .single();

  if (error) throw error;

  return data;
}

export async function searchProfiles(query) {
  const client = requireSupabase();
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.length < 2) return [];

  const { data: rpcData, error: rpcError } = await client.rpc(
    "search_assignable_users",
    {
      profile_query: normalizedQuery,
      result_limit: 8,
    },
  );

  if (!rpcError) {
    return (rpcData ?? []).sort(exactEmailFirst(query));
  }

  console.error("Could not search assignable users through RPC.", rpcError);

  const { data, error } = await client
    .from("profiles")
    .select("id,email,display_name,created_at")
    .or(`email.ilike.%${normalizedQuery}%,display_name.ilike.%${normalizedQuery}%`)
    .order("email", { ascending: true })
    .limit(8);

  if (error) throw error;

  return (data ?? []).sort(exactEmailFirst(query));
}

export async function assignChallengeToUser({ challengeId, userId }) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("assign_challenge_to_user", {
    target_challenge_id: challengeId,
    target_user_id: userId,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

export async function searchAssignmentsByEmail(query) {
  const client = requireSupabase();
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.length < 2) return [];

  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id,email,display_name")
    .ilike("email", `%${normalizedQuery}%`)
    .order("email", { ascending: true })
    .limit(8);

  if (profileError) throw profileError;
  if (!profiles?.length) return [];

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const { data, error } = await client
    .from("user_challenges")
    .select(ASSIGNMENT_LOOKUP_SELECT)
    .in("user_id", profiles.map((profile) => profile.id))
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  const assignments = (data ?? []).map((assignment) => ({
    ...assignment,
    profile: profileById.get(assignment.user_id),
  }));

  return addAssignedByProfiles(client, assignments);
}

export async function searchAssignmentByCode(query) {
  const client = requireSupabase();
  const assignmentCode = query.trim().replace(/^#/, "").replace(/\D/g, "");

  if (assignmentCode.length !== 9) return [];

  const { data, error } = await client
    .from("user_challenges")
    .select(ASSIGNMENT_LOOKUP_SELECT)
    .eq("assignment_code", assignmentCode)
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  if (!data?.length) return [];

  const profileIds = [...new Set(data.map((assignment) => assignment.user_id))];
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id,email,display_name")
    .in("id", profileIds);

  if (profileError) throw profileError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const assignments = data.map((assignment) => ({
    ...assignment,
    profile: profileById.get(assignment.user_id),
  }));

  return addAssignedByProfiles(client, assignments);
}

export async function listAssignmentsForUser({ userId, challengeId = null }) {
  const client = requireSupabase();

  if (!userId) return [];

  let query = client
    .from("user_challenges")
    .select(ASSIGNMENT_LOOKUP_SELECT)
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false });

  if (challengeId) {
    query = query.eq("challenge_id", challengeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data?.length) return [];

  const { data: profileRows, error: profileError } = await client
    .from("profiles")
    .select("id,email,display_name")
    .eq("id", userId);

  if (profileError) throw profileError;

  const [profile] = profileRows ?? [];
  const assignments = data.map((assignment) => ({
    ...assignment,
    profile: profile ?? null,
  }));

  return addAssignedByProfiles(client, assignments);
}

export async function revokeAssignedChallenge(assignmentId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("revoke_user_challenge", {
    target_assignment_id: assignmentId,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

export async function resetTestAssignedChallenge(assignmentId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("reset_test_user_challenge", {
    target_assignment_id: assignmentId,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

export async function checkChallengeSystemHealth() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_challenge_system_health");

  if (error) throw error;

  return data ?? [];
}

async function getAssignedChallengeRowsDirect(client, userId) {
  const { data, error } = await client
    .from("user_challenges")
    .select(
      `
        *,
        challenges (
          *,
          evaluation_files (*)
        )
      `,
    )
    .eq("user_id", userId)
    .in("status", ["assigned", "active"])
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

async function getPastChallengeRowsDirect(client, userId) {
  const { data, error } = await client
    .from("user_challenges")
    .select(
      `
        *,
        challenges (
          *,
          evaluation_files (*)
        )
      `,
    )
    .eq("user_id", userId)
    .in("status", ["completed", "failed"])
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  return data ?? [];
}

export async function getCurrentUserChallengeDashboard() {
  const client = requireSupabase();
  const user = await getCurrentUser(client);

  if (!user?.id) {
    return {
      user: null,
      assignedChallenges: [],
      pastChallenges: [],
      source: "none",
    };
  }

  const { data, error } = await client.rpc("get_current_user_challenge_dashboard");

  if (!error) {
    const dashboard = data ?? {};
    const assignedRows = dashboard.active_assignments ?? [];
    const pastRows = dashboard.past_assignments ?? [];

    if (assignedRows.length === 0) {
      try {
        const [directAssignedRows, directPastRows] = await Promise.all([
          getAssignedChallengeRowsDirect(client, user.id),
          pastRows.length > 0
            ? Promise.resolve([])
            : getPastChallengeRowsDirect(client, user.id),
        ]);

        if (directAssignedRows.length > 0) {
          console.warn(
            "Dashboard RPC returned no active assignments; using direct assignment query results.",
          );

          return {
            user: {
              id: user.id,
              email: user.email ?? "",
            },
            assignedChallenges: directAssignedRows.map(mapAssignedChallenge),
            pastChallenges: (pastRows.length > 0 ? pastRows : directPastRows).map(
              mapAssignedChallenge,
            ),
            loadedAt: dashboard.loaded_at,
            source: "rpc-direct-verified",
          };
        }
      } catch (verificationError) {
        if (!isMissingAssignmentTableError(verificationError)) {
          console.warn(
            "Could not verify empty dashboard RPC result with direct assignment query.",
            verificationError,
          );
        }
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      assignedChallenges: assignedRows.map(mapAssignedChallenge),
      pastChallenges: pastRows.map(mapAssignedChallenge),
      loadedAt: dashboard.loaded_at,
      source: "rpc",
    };
  }

  if (isMissingAssignmentTableError(error)) {
    console.warn(
      "Challenge assignment tables are not installed yet; returning an empty dashboard.",
      error,
    );

    return {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      assignedChallenges: [],
      pastChallenges: [],
      source: "unavailable",
    };
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  console.warn(
    "Dashboard RPC is not installed yet; falling back to direct assignment queries.",
    error,
  );

  let assignedRows = [];
  let pastRows = [];

  try {
    [assignedRows, pastRows] = await Promise.all([
      getAssignedChallengeRowsDirect(client, user.id),
      getPastChallengeRowsDirect(client, user.id),
    ]);
  } catch (fallbackError) {
    if (!isMissingAssignmentTableError(fallbackError)) {
      throw fallbackError;
    }

    console.warn(
      "Challenge assignment tables are not installed yet; returning an empty dashboard.",
      fallbackError,
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    assignedChallenges: assignedRows.map(mapAssignedChallenge),
    pastChallenges: pastRows.map(mapAssignedChallenge),
    source: "fallback",
  };
}

export async function getAssignedChallengesForCurrentUser() {
  const client = requireSupabase();
  const user = await getCurrentUser(client);

  if (!user?.id) return [];

  return (await getAssignedChallengeRowsDirect(client, user.id)).map(
    mapAssignedChallenge,
  );
}

export async function getPastChallengesForCurrentUser() {
  const client = requireSupabase();
  const user = await getCurrentUser(client);

  if (!user?.id) return [];

  return (await getPastChallengeRowsDirect(client, user.id)).map(mapAssignedChallenge);
}

export async function markAssignedChallengeStarted(assignmentId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("mark_user_challenge_started", {
    target_assignment_id: assignmentId,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

export async function recordAssignedChallengeProgress(assignmentId, result) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("record_user_challenge_progress", {
    target_assignment_id: assignmentId,
    next_question_index: result.nextQuestionIndex,
    progress_scenario_results: result.scenarioResults,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

export async function completeAssignedChallenge(assignmentId, result) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("complete_user_challenge", {
    target_assignment_id: assignmentId,
    result_score: result.score,
    result_earned_points: result.earnedPoints,
    result_total_possible_points: result.totalPossiblePoints,
    result_funded: result.funded,
    result_scenario_results: result.scenarioResults,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}
