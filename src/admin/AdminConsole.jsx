import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  ChevronDown,
  CheckCircle2,
  Database,
  FileJson2,
  Hash,
  HeartPulse,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  assignChallengeToUser,
  checkChallengeSystemHealth,
  createChallengeForEvaluation,
  listDatabaseChallenges,
  listDatabaseEvaluationFiles,
  revokeAssignedChallenge,
  resetTestAssignedChallenge,
  saveEvaluationFileToDatabase,
  searchAssignmentByCode,
  searchAssignmentsByEmail,
  searchProfiles,
} from "../lib/challengeDatabase";
import { signOutOfApp } from "../lib/authSession";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

function formatDate(value) {
  if (!value) return "Not set";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Not set";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadgeClass(status) {
  if (status === "completed") return "border-green/45 text-green";
  if (status === "failed") return "border-red-300/45 text-red-200";
  if (status === "revoked") return "border-white/20 text-white/45";
  if (status === "active") return "border-yellow-200/45 text-yellow-100";

  return "border-green/45 text-green";
}

function AssignmentScoreRows({ assignment }) {
  const scenarioResults = assignment.scenario_results ?? [];

  if (scenarioResults.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white/50">
        No scenario results have been recorded for this assignment.
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
      {scenarioResults.map((result, index) => (
        <div
          key={`${assignment.id}-${result.id ?? index}`}
          className="grid gap-2 border-t border-white/10 bg-black/35 p-3 text-sm first:border-t-0 md:grid-cols-[1fr_120px]"
        >
          <div>
            <div className="font-bold text-green">
              {result.title ?? `Scenario ${index + 1}`}
            </div>
            <div className="mt-1 text-xs leading-5 text-white/50">
              Selected {result.selectedAction ?? "Not recorded"}. Best{" "}
              {result.bestAction ?? "Not recorded"}.
            </div>
          </div>
          <div className="text-left font-bold text-green md:text-right">
            {result.points ?? 0}/{result.maxPoints ?? 0} pts
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminConsole() {
  const [evaluationFiles, setEvaluationFiles] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeSection, setActiveSection] = useState("challenges");
  const [assignmentLookupMode, setAssignmentLookupMode] = useState("email");
  const [assignmentLookupEmail, setAssignmentLookupEmail] = useState("");
  const [assignmentLookupCode, setAssignmentLookupCode] = useState("");
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [assignmentLookupLoading, setAssignmentLookupLoading] = useState(false);
  const [assignmentLookupSearched, setAssignmentLookupSearched] = useState(false);
  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState([]);
  const [healthRows, setHealthRows] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthSearched, setHealthSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const selectedEvaluation = useMemo(() => {
    return evaluationFiles.find((file) => file.id === selectedEvaluationId);
  }, [evaluationFiles, selectedEvaluationId]);

  const selectedChallenge = useMemo(() => {
    return challenges.find((challenge) => challenge.id === selectedChallengeId);
  }, [challenges, selectedChallengeId]);

  async function loadAdminData() {
    setLoading(true);

    try {
      const [files, challengeRows] = await Promise.all([
        listDatabaseEvaluationFiles(),
        listDatabaseChallenges(),
      ]);

      setEvaluationFiles(files);
      setChallenges(challengeRows);
      setSelectedEvaluationId((currentId) => currentId || files[0]?.id || "");
      setSelectedChallengeId((currentId) => currentId || challengeRows[0]?.id || "");
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load database admin data.",
      });
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (userQuery.trim().length < 2) {
        setUserResults([]);
        setUserSearchLoading(false);
        return;
      }

      setUserSearchLoading(true);

      try {
        const results = await searchProfiles(userQuery);

        if (!cancelled) {
          setUserResults(results);
          setUserSearchLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setUserSearchLoading(false);
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Could not search users.",
          });
        }
      }
    }

    const timeoutId = window.setTimeout(runSearch, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [userQuery]);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthSearched(true);

    try {
      const rows = await checkChallengeSystemHealth();

      setHealthRows(rows);
      setHealthLoading(false);
    } catch (error) {
      setHealthLoading(false);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load challenge system health.",
      });
    }
  }, []);

  useEffect(() => {
    if (activeSection === "health" && !healthSearched) {
      loadHealth();
    }
  }, [activeSection, healthSearched, loadHealth]);

  const logout = async () => {
    try {
      await signOutOfApp();
    } catch (error) {
      console.error("Could not sign out.", error);
    } finally {
      window.location.assign("/");
    }
  };

  const handleUpload = async (event) => {
    const [file] = event.target.files;
    event.target.value = "";

    if (!file) return;

    try {
      const content = await file.text();
      const parsedEvaluation = JSON.parse(content);
      const savedFile = await saveEvaluationFileToDatabase(parsedEvaluation);

      setMessage({
        type: "success",
        text: `Saved ${savedFile.evaluation.title} to the database.`,
      });
      await loadAdminData();
      setSelectedEvaluationId(savedFile.id);
      setChallengeName(savedFile.evaluation.title);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save JSON file.",
      });
    }
  };

  const handleCreateChallenge = async () => {
    if (!selectedEvaluation) {
      setMessage({ type: "error", text: "Select an evaluation file first." });
      return;
    }

    const name = challengeName.trim() || selectedEvaluation.evaluation.title;

    try {
      const challenge = await createChallengeForEvaluation({
        name,
        evaluationFileId: selectedEvaluation.id,
      });

      setMessage({
        type: "success",
        text: `Created challenge ${challenge.name}.`,
      });
      await loadAdminData();
      setSelectedChallengeId(challenge.id);
      setChallengeName("");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not create challenge.",
      });
    }
  };

  const handleAssignChallenge = async () => {
    if (!selectedChallenge || !selectedUser) {
      setMessage({
        type: "error",
        text: "Select a challenge and a user before assigning.",
      });
      return;
    }

    try {
      const assignment = await assignChallengeToUser({
        challengeId: selectedChallenge.id,
        userId: selectedUser.id,
      });

      setMessage({
        type: "success",
        text: `Assigned ${selectedChallenge.name} to ${selectedUser.email}. Code: ${assignment.assignment_code}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not assign challenge.",
      });
    }
  };

  const handleRevokeAssignment = async (assignment) => {
    try {
      const revoked = await revokeAssignedChallenge(assignment.id);

      setMessage({
        type: "success",
        text: `Revoked assignment ${revoked.assignment_code}.`,
      });

      if (assignmentLookupSearched) {
        await handleAssignmentLookup();
      }

    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not revoke assignment.",
      });
    }
  };

  const handleResetTestAssignment = async (assignment) => {
    try {
      const resetAssignment = await resetTestAssignedChallenge(assignment.id);

      setMessage({
        type: "success",
        text: `Reset test assignment ${resetAssignment.assignment_code}.`,
      });

      if (assignmentLookupSearched) {
        await handleAssignmentLookup();
      }

    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not reset test assignment.",
      });
    }
  };

  const handleAssignmentLookup = async () => {
    const lookupValue =
      assignmentLookupMode === "code"
        ? assignmentLookupCode.trim()
        : assignmentLookupEmail.trim();

    if (assignmentLookupMode === "code") {
      const normalizedCode = lookupValue.replace(/^#/, "").replace(/\D/g, "");

      if (normalizedCode.length !== 9) {
        setMessage({
          type: "error",
          text: "Enter a 9-digit assignment number.",
        });
        return;
      }
    }

    if (assignmentLookupMode === "email" && lookupValue.length < 2) {
      setMessage({
        type: "error",
        text: "Enter at least two characters of an email ID.",
      });
      return;
    }

    setAssignmentLookupLoading(true);
    setAssignmentLookupSearched(true);

    try {
      const results =
        assignmentLookupMode === "code"
          ? await searchAssignmentByCode(lookupValue)
          : await searchAssignmentsByEmail(lookupValue);

      setAssignmentResults(results);
      setExpandedAssignmentIds([]);
      setAssignmentLookupLoading(false);
    } catch (error) {
      setAssignmentLookupLoading(false);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not search assignment details.",
      });
    }
  };

  const toggleExpandedAssignment = (assignmentId) => {
    setExpandedAssignmentIds((currentIds) =>
      currentIds.includes(assignmentId)
        ? currentIds.filter((id) => id !== assignmentId)
        : [...currentIds, assignmentId],
    );
  };

  return (
    <main className="h-dvh overflow-y-scroll bg-aurora text-green">
      <section className="grid-shell min-h-screen overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-5 sm:px-8 sm:pb-14 sm:pt-7 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <a href="#" className="font-display text-2xl tracking-[0.18em]">
              RABBITSHARK
            </a>
            <div className="hidden rounded-full border border-green/25 bg-green px-5 py-3 text-sm font-semibold text-black shadow-tide sm:block">
              Developer Console
            </div>
          </header>

          <div className="mt-10 grid gap-5 xl:grid-cols-[380px_1fr]">
            <aside className="glass-panel rounded-[1.75rem] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-green/20 bg-green/10 text-green">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-black">
                    Developer Console
                  </h1>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    Database challenge control
                  </p>
                </div>
              </div>

              <div className="mb-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection("challenges")}
                  className={[
                    "flex h-11 items-center gap-2 rounded-xl border px-4 text-left text-sm font-bold transition",
                    activeSection === "challenges"
                      ? "border-green bg-green text-black"
                      : "border-white/10 bg-black/20 text-green hover:border-green/35 hover:bg-green/10",
                  ].join(" ")}
                >
                  <FileJson2 className="h-4 w-4" />
                  Challenge Control
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("assign")}
                  className={[
                    "flex h-11 items-center gap-2 rounded-xl border px-4 text-left text-sm font-bold transition",
                    activeSection === "assign"
                      ? "border-green bg-green text-black"
                      : "border-white/10 bg-black/20 text-green hover:border-green/35 hover:bg-green/10",
                  ].join(" ")}
                >
                  <UserPlus className="h-4 w-4" />
                  Assign Challenge
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("database")}
                  className={[
                    "flex h-11 items-center gap-2 rounded-xl border px-4 text-left text-sm font-bold transition",
                    activeSection === "database"
                      ? "border-green bg-green text-black"
                      : "border-white/10 bg-black/20 text-green hover:border-green/35 hover:bg-green/10",
                  ].join(" ")}
                >
                  <Database className="h-4 w-4" />
                  Challenge Database
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("lookup")}
                  className={[
                    "flex h-11 items-center gap-2 rounded-xl border px-4 text-left text-sm font-bold transition",
                    activeSection === "lookup"
                      ? "border-green bg-green text-black"
                      : "border-white/10 bg-black/20 text-green hover:border-green/35 hover:bg-green/10",
                  ].join(" ")}
                >
                  <Search className="h-4 w-4" />
                  Assignment Lookup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("health")}
                  className={[
                    "flex h-11 items-center gap-2 rounded-xl border px-4 text-left text-sm font-bold transition",
                    activeSection === "health"
                      ? "border-green bg-green text-black"
                      : "border-white/10 bg-black/20 text-green hover:border-green/35 hover:bg-green/10",
                  ].join(" ")}
                >
                  <HeartPulse className="h-4 w-4" />
                  System Health
                </button>
              </div>

              {message ? (
                <div
                  className={[
                    "mb-4 flex gap-2 rounded-2xl border px-3 py-2 text-sm leading-5",
                    message.type === "success"
                      ? "border-green/30 bg-green/10 text-green"
                      : message.type === "warning"
                        ? "border-yellow-200/30 bg-yellow-300/10 text-yellow-100"
                        : "border-red-300/30 bg-red-500/10 text-red-200",
                  ].join(" ")}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              ) : null}
            </aside>

            <section className="glass-panel rounded-[1.75rem] p-5 sm:p-7">
              {activeSection === "assign" ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge>Assign Challenge</Badge>
                    <Badge>Challenge to user</Badge>
                  </div>
                  <h2 className="font-display text-3xl font-black sm:text-4xl">
                    Assign a challenge to a user.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    Search profiles by email or name, select a user, then assign
                    the selected challenge. It appears on that user's dashboard.
                  </p>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                          Select Challenge
                        </span>
                        <select
                          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-green outline-none focus:border-green"
                          value={selectedChallengeId}
                          onChange={(event) =>
                            setSelectedChallengeId(event.target.value)
                          }
                        >
                          <option value="">Choose challenge</option>
                          {challenges.map((challenge) => (
                            <option key={challenge.id} value={challenge.id}>
                              {challenge.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                          Search User
                        </span>
                        <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-green">
                          <Search className="h-4 w-4 text-white/45" />
                          <input
                            className="min-w-0 flex-1 bg-transparent text-sm text-green outline-none placeholder:text-white/35"
                            value={userQuery}
                            onChange={(event) => setUserQuery(event.target.value)}
                            placeholder="developer@example.com"
                          />
                        </div>
                      </label>

                      <div className="mt-3 grid gap-2">
                        {userSearchLoading ? (
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/50">
                            Searching users...
                          </div>
                        ) : null}
                        {!userSearchLoading &&
                        userQuery.trim().length >= 2 &&
                        userResults.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-sm text-white/45">
                            No matching users found.
                          </div>
                        ) : null}
                        {userResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className={[
                              "rounded-xl border px-3 py-3 text-left text-sm transition",
                              selectedUser?.id === user.id
                                ? "border-green bg-green/10"
                                : "border-white/10 bg-white/5 hover:border-white/20",
                            ].join(" ")}
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="font-bold text-green">{user.email}</div>
                            <div className="mt-1 text-xs text-white/45">
                              {user.display_name || user.id}
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedUser ? (
                        <div className="mt-4 rounded-xl border border-green/25 bg-green/10 p-3 text-sm text-green">
                          Selected {selectedUser.email}
                        </div>
                      ) : null}

                      <Button className="mt-4 w-full" onClick={handleAssignChallenge}>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Assign Challenge
                      </Button>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-green">
                        Selected Challenge
                      </div>
                      {selectedChallenge ? (
                        <>
                          <h3 className="mt-2 font-display text-2xl font-bold">
                            {selectedChallenge.name}
                          </h3>
                          <div className="mt-2 text-sm text-white/55">
                            {selectedChallenge.evaluation_files?.title ??
                              "Evaluation file"}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge>
                              Created {formatDate(selectedChallenge.created_at)}
                            </Badge>
                            <Badge>Assignable</Badge>
                          </div>
                        </>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-white/55">
                          Choose a challenge to assign it to a user.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeSection === "database" ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge>Challenge Database</Badge>
                    <Badge>Stored challenge files</Badge>
                  </div>
                  <h2 className="font-display text-3xl font-black sm:text-4xl">
                    Challenge files and created challenges.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    JSON files uploaded from Challenge Control are stored here as
                    challenge files. Created database challenges are listed below
                    and can be selected for assignment.
                  </p>

                  <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-display text-xl font-bold">
                          Challenge Files
                        </h3>
                        <Badge>
                          {loading ? "Loading" : `${evaluationFiles.length} total`}
                        </Badge>
                      </div>

                      {evaluationFiles.length === 0 && !loading ? (
                        <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-6 text-white/55">
                          No challenge files yet. Upload a JSON file in Challenge
                          Control to store one here.
                        </div>
                      ) : null}

                      <div className="grid gap-3 md:grid-cols-2">
                        {evaluationFiles.map((file) => {
                          const selected = file.id === selectedEvaluationId;

                          return (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => {
                                setSelectedEvaluationId(file.id);
                                setChallengeName(file.evaluation.title);
                              }}
                              className={[
                                "rounded-2xl border p-4 text-left transition",
                                selected
                                  ? "border-green bg-green/10"
                                  : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.06]",
                              ].join(" ")}
                            >
                              <div className="font-display text-lg font-bold leading-tight">
                                {file.evaluation.title}
                              </div>
                              <div className="mt-1 text-xs text-white/52">
                                {file.slug}
                              </div>
                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/52">
                                {file.evaluation.description ||
                                  "No description recorded."}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge>{file.questionCount} questions</Badge>
                                <Badge>
                                  Target{" "}
                                  {file.evaluation.fundedThresholdPercent ?? 80}%
                                </Badge>
                                <Badge>{selected ? "Selected" : "Stored"}</Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-green">
                        Active Selection
                      </div>
                      {selectedEvaluation ? (
                        <>
                          <h3 className="mt-2 font-display text-2xl font-bold">
                            {selectedEvaluation.evaluation.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-white/58">
                            {selectedEvaluation.evaluation.description}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge>{selectedEvaluation.questionCount} questions</Badge>
                            <Badge>{selectedEvaluation.slug}</Badge>
                          </div>
                        </>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-white/55">
                          Select a stored challenge file to use it in Challenge
                          Control.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/45 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl font-bold">
                        Database Challenges
                      </h3>
                      <Badge>{challenges.length} total</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {challenges.map((challenge) => (
                        <button
                          key={challenge.id}
                          type="button"
                          className={[
                            "rounded-2xl border p-4 text-left transition",
                            selectedChallengeId === challenge.id
                              ? "border-green bg-green/10"
                              : "border-white/10 bg-black/22 hover:border-white/20",
                          ].join(" ")}
                          onClick={() => setSelectedChallengeId(challenge.id)}
                        >
                          <div className="font-display text-lg font-bold">
                            {challenge.name}
                          </div>
                          <div className="mt-2 text-xs text-white/45">
                            Created {formatDate(challenge.created_at)}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge>
                              {challenge.evaluation_files?.title ?? "Evaluation"}
                            </Badge>
                            <Badge>Assignable</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeSection === "health" ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge>System Health</Badge>
                    <Badge>Database checks</Badge>
                  </div>
                  <h2 className="font-display text-3xl font-black sm:text-4xl">
                    Verify challenge assignment infrastructure.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    Confirm the live database supports repeated assignments,
                    unique 9-digit codes, RPC workflows, and blocked direct
                    player updates.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={loadHealth} disabled={healthLoading}>
                      <RefreshCw className="mr-2 h-5 w-5" />
                      {healthLoading ? "Checking" : "Refresh Checks"}
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {healthRows.map((row) => (
                      <div
                        key={row.check_name}
                        className={[
                          "rounded-2xl border p-4",
                          row.status === "ok"
                            ? "border-green/25 bg-green/10"
                            : "border-red-300/25 bg-red-500/10",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-display text-lg font-bold">
                              {row.check_name.replaceAll("_", " ")}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-white/58">
                              {row.details}
                            </div>
                          </div>
                          <Badge
                            className={
                              row.status === "ok"
                                ? "border-green/45 text-green"
                                : "border-red-300/45 text-red-200"
                            }
                          >
                            {row.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {healthSearched && !healthLoading && healthRows.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-6 text-white/55">
                      No health rows returned.
                    </div>
                  ) : null}
                </div>
              ) : activeSection === "lookup" ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge>Assignment Lookup</Badge>
                    <Badge>Email or assignment number</Badge>
                  </div>
                  <h2 className="font-display text-3xl font-black sm:text-4xl">
                    Find assignment numbers and challenge details.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    Search by user email ID to show every assigned challenge, or
                    search by the 9-digit assignment number to show one exact
                    assignment.
                  </p>

                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
                    <div className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1 sm:grid-cols-2">
                      {[
                        ["email", "Email ID"],
                        ["code", "Assignment Number"],
                      ].map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setAssignmentLookupMode(mode);
                            setAssignmentResults([]);
                            setExpandedAssignmentIds([]);
                            setAssignmentLookupSearched(false);
                          }}
                          className={[
                            "flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-[0.14em] transition",
                            assignmentLookupMode === mode
                              ? "bg-green text-black"
                              : "text-white/58 hover:bg-white/8 hover:text-white",
                          ].join(" ")}
                        >
                          {mode === "code" ? (
                            <Hash className="h-4 w-4" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                        {assignmentLookupMode === "code"
                          ? "Assignment Number"
                          : "Email ID"}
                      </span>
                      <div className="mt-2 flex min-h-12 flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 focus-within:border-green sm:flex-row sm:items-center sm:py-0">
                        {assignmentLookupMode === "code" ? (
                          <Hash className="h-4 w-4 shrink-0 text-white/45" />
                        ) : (
                          <Search className="h-4 w-4 shrink-0 text-white/45" />
                        )}
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm text-green outline-none placeholder:text-white/35"
                          value={
                            assignmentLookupMode === "code"
                              ? assignmentLookupCode
                              : assignmentLookupEmail
                          }
                          onChange={(event) => {
                            if (assignmentLookupMode === "code") {
                              setAssignmentLookupCode(event.target.value);
                              return;
                            }

                            setAssignmentLookupEmail(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleAssignmentLookup();
                            }
                          }}
                          placeholder={
                            assignmentLookupMode === "code"
                              ? "#364728949"
                              : "client@example.com"
                          }
                        />
                        <Button
                          className="h-9 px-4 text-xs sm:w-auto"
                          onClick={handleAssignmentLookup}
                        >
                          Search
                        </Button>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl font-bold">
                        Assignment Results
                      </h3>
                      <Badge>
                        {assignmentLookupLoading
                          ? "Searching"
                          : `${assignmentResults.length} found`}
                      </Badge>
                    </div>

                    {assignmentLookupSearched &&
                    !assignmentLookupLoading &&
                    assignmentResults.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-6 text-white/55">
                        No assignments found for that{" "}
                        {assignmentLookupMode === "code"
                          ? "assignment number"
                          : "email ID"}
                        .
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                      {assignmentResults.map((assignment) => {
                        const challenge = assignment.challenges;
                        const evaluationFile = challenge?.evaluation_files;
                        const profile = assignment.profile;
                        const expanded = expandedAssignmentIds.includes(assignment.id);
                        const canRevoke =
                          assignment.status === "assigned" ||
                          assignment.status === "active";
                        const canResetTest = Boolean(assignment.is_test_assignment);

                        return (
                          <div
                            key={assignment.id}
                            className="rounded-2xl border border-white/10 bg-black/40"
                          >
                            <button
                              type="button"
                              onClick={() => toggleExpandedAssignment(assignment.id)}
                              className="flex w-full items-start justify-between gap-3 p-4 text-left"
                            >
                              <div className="min-w-0">
                                <div className="font-display text-2xl font-black tracking-[0.12em] text-green">
                                  #{assignment.assignment_code}
                                </div>
                                <div className="mt-1 truncate text-xs text-white/45">
                                  {profile?.email ?? assignment.user_id}
                                </div>
                                <div className="mt-3 font-display text-lg font-bold text-white">
                                  {challenge?.name ?? "Challenge"}
                                </div>
                                <div className="mt-1 text-sm text-white/55">
                                  {evaluationFile?.title ?? "Evaluation file"}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge className={getStatusBadgeClass(assignment.status)}>
                                  {assignment.status}
                                </Badge>
                                <ChevronDown
                                  className={[
                                    "h-5 w-5 text-white/45 transition",
                                    expanded ? "rotate-180" : "",
                                  ].join(" ")}
                                />
                              </div>
                            </button>

                            {expanded ? (
                              <div className="border-t border-white/10 p-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Assigned
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-green">
                                      {formatDateTime(assignment.assigned_at)}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Started
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-green">
                                      {formatDateTime(assignment.started_at)}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Completed
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-green">
                                      {formatDateTime(assignment.completed_at)}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Questions
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-green">
                                      {evaluationFile?.question_count ?? "Not set"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Score
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-green">
                                      {assignment.score ?? "Not scored"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Points
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-green">
                                      {assignment.earned_points ?? 0}/
                                      {assignment.total_possible_points ??
                                        evaluationFile?.total_possible_points ??
                                        "Not set"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Assigned By
                                    </div>
                                    <div className="mt-1 break-words text-sm font-bold text-green">
                                      {assignment.assignedByProfile?.email ??
                                        assignment.assigned_by ??
                                        "Not recorded"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                      Assignment ID
                                    </div>
                                    <div className="mt-1 break-words text-sm font-bold text-green">
                                      {assignment.id}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge>
                                    {evaluationFile?.slug ?? "No evaluation slug"}
                                  </Badge>
                                  <Badge>
                                    Target{" "}
                                    {evaluationFile?.funded_threshold_percent ?? 80}%
                                  </Badge>
                                  <Badge>
                                    {assignment.funded ? "Funded" : "Not funded"}
                                  </Badge>
                                  {assignment.is_test_assignment ? (
                                    <>
                                      <Badge className="border-yellow-200/45 text-yellow-100">
                                        Testing Replica
                                      </Badge>
                                      <Badge>
                                        Resets {assignment.reset_count ?? 0}
                                      </Badge>
                                    </>
                                  ) : null}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {canRevoke ? (
                                    <Button
                                      className="h-9 px-4 text-xs"
                                      variant="danger"
                                      onClick={() => handleRevokeAssignment(assignment)}
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Revoke
                                    </Button>
                                  ) : null}
                                  {canResetTest ? (
                                    <Button
                                      className="h-9 px-4 text-xs"
                                      variant="secondary"
                                      onClick={() =>
                                        handleResetTestAssignment(assignment)
                                      }
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Reset Test
                                    </Button>
                                  ) : null}
                                </div>
                                <AssignmentScoreRows assignment={assignment} />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-6">
                    <div className="flex flex-col">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge>Step 1</Badge>
                          <Badge>Evaluation to challenge</Badge>
                        </div>
                        <h2 className="font-display text-3xl font-black sm:text-4xl">
                          Create a challenge from an uploaded file.
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                          Uploaded challenge files live in Supabase. A challenge
                          points to one challenge file, then that challenge can be
                          assigned to a specific user.
                        </p>
                      </div>

                      <div className="min-h-[282px] rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
                        <label className="mb-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-green/35 bg-green/10 px-4 py-5 text-center transition hover:bg-green/15">
                          <Upload className="mb-2 h-6 w-6 text-green" />
                          <span className="text-sm font-bold uppercase tracking-[0.14em] text-green">
                            Upload Challenge JSON
                          </span>
                          <span className="mt-1 text-xs leading-5 text-white/48">
                            Save the evaluation file, then create a challenge from it.
                          </span>
                          <input
                            className="sr-only"
                            type="file"
                            accept="application/json,.json"
                            onChange={handleUpload}
                          />
                        </label>

                        <label className="mb-4 block">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                            Source Challenge File
                          </span>
                          <select
                            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-sm text-green outline-none focus:border-green"
                            value={selectedEvaluationId}
                            onChange={(event) => {
                              const nextEvaluation = evaluationFiles.find(
                                (file) => file.id === event.target.value,
                              );

                              setSelectedEvaluationId(event.target.value);
                              setChallengeName(
                                nextEvaluation?.evaluation.title ?? challengeName,
                              );
                            }}
                          >
                            <option value="">Choose stored file</option>
                            {evaluationFiles.map((file) => (
                              <option key={file.id} value={file.id}>
                                {file.evaluation.title}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                            Challenge Name
                          </span>
                          <input
                            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-green outline-none placeholder:text-white/35 focus:border-green"
                            value={challengeName}
                            onChange={(event) => setChallengeName(event.target.value)}
                            placeholder="100K Cash Evaluation"
                          />
                        </label>
                        <Button className="mt-4 w-full" onClick={handleCreateChallenge}>
                          <FileJson2 className="mr-2 h-5 w-5" />
                          Create Challenge
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                <Button variant="danger" onClick={logout}>
                  <LogOut className="mr-2 h-5 w-5" />
                  Log Out
                </Button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
