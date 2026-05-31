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

  return {
    id: row.id,
    assignmentId: row.id,
    assignmentCode: row.assignment_code,
    challengeId: row.challenge_id,
    title: challenge.name,
    evaluationId: evaluation.id,
    status: row.status === "active" ? "In progress" : "Ready",
    purchasedAt: row.assigned_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    score: row.score ?? 0,
    earnedPoints: row.earned_points ?? 0,
    totalPossiblePoints: evaluation.totalPossiblePoints,
    funded: Boolean(row.funded),
    scenarioResults: row.scenario_results ?? [],
    dbBacked: true,
    evaluation,
  };
}

function createAssignmentCode() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(100000000 + (values[0] % 900000000));
  }

  return String(Math.floor(100000000 + Math.random() * 900000000));
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
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;

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
        created_by: userData.user?.id,
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
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;

  const { data, error } = await client
    .from("challenges")
    .insert({
      name,
      evaluation_file_id: evaluationFileId,
      created_by: userData.user?.id,
    })
    .select("*, evaluation_files(*)")
    .single();

  if (error) throw error;

  return data;
}

export async function searchProfiles(query) {
  const client = requireSupabase();
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) return [];

  const { data, error } = await client
    .from("profiles")
    .select("id,email,display_name,created_at")
    .or(`email.ilike.%${normalizedQuery}%,display_name.ilike.%${normalizedQuery}%`)
    .order("email", { ascending: true })
    .limit(8);

  if (error) throw error;

  return data ?? [];
}

export async function assignChallengeToUser({ challengeId, userId }) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;

  let lastCollisionError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await client
      .from("user_challenges")
      .upsert(
        {
          user_id: userId,
          challenge_id: challengeId,
          assignment_code: createAssignmentCode(),
          status: "assigned",
          assigned_by: userData.user?.id,
        },
        { onConflict: "user_id,challenge_id" },
      )
      .select("*")
      .single();

    if (!error) return data;

    const collidedOnAssignmentCode =
      error.code === "23505" && String(error.message).includes("assignment_code");

    if (!collidedOnAssignmentCode) throw error;

    lastCollisionError = error;
  }

  throw lastCollisionError;
}

export async function searchAssignmentsByEmail(query) {
  const client = requireSupabase();
  const normalizedQuery = query.trim();

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
    .select(
      `
        *,
        challenges (
          id,
          name,
          created_at,
          evaluation_files (
            id,
            slug,
            title,
            version,
            question_count,
            funded_threshold_percent,
            total_possible_points
          )
        )
      `,
    )
    .in("user_id", profiles.map((profile) => profile.id))
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((assignment) => ({
    ...assignment,
    profile: profileById.get(assignment.user_id),
  }));
}

export async function getAssignedChallengesForCurrentUser() {
  const client = requireSupabase();
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
    .in("status", ["assigned", "active"])
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapAssignedChallenge);
}

export async function markAssignedChallengeStarted(assignmentId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_challenges")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function completeAssignedChallenge(assignmentId, result) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_challenges")
    .update({
      status: result.funded ? "completed" : "failed",
      completed_at: new Date().toISOString(),
      score: result.score,
      earned_points: result.earnedPoints,
      total_possible_points: result.totalPossiblePoints,
      funded: result.funded,
      scenario_results: result.scenarioResults,
    })
    .eq("id", assignmentId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}
