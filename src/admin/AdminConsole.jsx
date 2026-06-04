import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
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
  X,
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
  const [, setEvaluationFiles] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [, setSelectedEvaluationId] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [challengeControlFile, setChallengeControlFile] = useState(null);
  const [challengeFileCheck, setChallengeFileCheck] = useState({
    status: "idle",
    text: "Upload a challenge JSON file to check compatibility.",
  });
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignmentPending, setAssignmentPending] = useState(false);
  const [assignmentReceipt, setAssignmentReceipt] = useState(null);
  const [activeSection, setActiveSection] = useState("challenges");
  const [assignmentLookupMode, setAssignmentLookupMode] = useState("email");
  const [assignmentLookupEmail, setAssignmentLookupEmail] = useState("");
  const [assignmentLookupCode, setAssignmentLookupCode] = useState("");
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [assignmentLookupLoading, setAssignmentLookupLoading] = useState(false);
  const [assignmentLookupSearched, setAssignmentLookupSearched] = useState(false);
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState(null);
  const [healthRows, setHealthRows] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthSearched, setHealthSearched] = useState(false);
  const [, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const selectedChallenge = useMemo(() => {
    return challenges.find((challenge) => challenge.id === selectedChallengeId);
  }, [challenges, selectedChallengeId]);

  useEffect(() => {
    setAssignmentReceipt(null);
  }, [selectedChallengeId, selectedUser?.id]);

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

    setChallengeControlFile(null);
    setChallengeFileCheck({
      status: "checking",
      text: "Checking compatibility with the poker engine...",
    });

    try {
      const content = await file.text();
      const parsedEvaluation = JSON.parse(content);
      const savedFile = await saveEvaluationFileToDatabase(parsedEvaluation);

      setChallengeControlFile(savedFile);
      setChallengeFileCheck({
        status: "valid",
        text: `${savedFile.file_code ?? savedFile.fileCode} is compatible with the poker engine.`,
      });
      setMessage({
        type: "success",
        text: `Saved challenge file ${savedFile.file_code ?? savedFile.fileCode}.`,
      });
      await loadAdminData();
      setSelectedEvaluationId(savedFile.id);
      setChallengeName(savedFile.evaluation.title);
    } catch (error) {
      setChallengeFileCheck({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Challenge JSON is not compatible with the poker engine.",
      });
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save JSON file.",
      });
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeControlFile) {
      setMessage({
        type: "error",
        text: "Upload a compatible challenge JSON file first.",
      });
      return;
    }

    const name = challengeName.trim() || challengeControlFile.evaluation.title;

    try {
      const challenge = await createChallengeForEvaluation({
        name,
        evaluationFileId: challengeControlFile.id,
      });

      setMessage({
        type: "success",
        text: `Created challenge ${challenge.name} in the database.`,
      });
      await loadAdminData();
      setSelectedChallengeId(challenge.id);
      setChallengeName("");
      setChallengeControlFile(null);
      setChallengeFileCheck({
        status: "idle",
        text: "Upload a challenge JSON file to check compatibility.",
      });
      setActiveSection("database");
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

    setAssignmentPending(true);
    setAssignmentReceipt(null);

    try {
      const assignment = await assignChallengeToUser({
        challengeId: selectedChallenge.id,
        userId: selectedUser.id,
      });
      const [verifiedAssignment] = await searchAssignmentByCode(
        assignment.assignment_code,
      );

      if (
        !verifiedAssignment ||
        verifiedAssignment.user_id !== selectedUser.id ||
        verifiedAssignment.challenge_id !== selectedChallenge.id
      ) {
        throw new Error("Assignment was created but could not be verified.");
      }

      setAssignmentReceipt({
        assignmentCode: verifiedAssignment.assignment_code,
        challengeName:
          verifiedAssignment.challenges?.name ?? selectedChallenge.name,
        userEmail: selectedUser.email,
        assignedAt: verifiedAssignment.assigned_at,
        status: verifiedAssignment.status,
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
    } finally {
      setAssignmentPending(false);
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
      setSelectedAssignmentDetails(null);
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

  return (
    <main className="h-dvh overflow-y-scroll bg-aurora text-green">
      <section className="grid-shell min-h-screen overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-5 sm:px-8 sm:pb-14 sm:pt-7 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <a href="#" className="font-display text-2xl tracking-[0.18em]">
              RABBITSTAKE
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
                    Search Supabase users by email or name, select a user, then
                    assign the selected challenge. It appears on that user's dashboard.
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
                            onChange={(event) => {
                              const nextQuery = event.target.value;
                              setUserQuery(nextQuery);
                              setAssignmentReceipt(null);

                              if (
                                selectedUser &&
                                nextQuery.trim().toLowerCase() !==
                                  selectedUser.email?.toLowerCase()
                              ) {
                                setSelectedUser(null);
                              }
                            }}
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
                            onClick={() => {
                              setSelectedUser(user);
                              setUserQuery(user.email ?? "");
                              setAssignmentReceipt(null);
                            }}
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

                      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <Button
                          className="h-full min-h-12 w-full"
                          onClick={handleAssignChallenge}
                          disabled={!selectedChallenge || !selectedUser || assignmentPending}
                        >
                          {assignmentPending ? (
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <UserPlus className="mr-2 h-5 w-5" />
                          )}
                          {assignmentPending ? "Assigning" : "Assign Challenge"}
                        </Button>
                        {assignmentReceipt ? (
                          <div className="rounded-xl border border-green/30 bg-green/10 p-3 text-sm leading-5 text-green">
                            <div className="font-bold">
                              Assigned #{assignmentReceipt.assignmentCode}
                            </div>
                            <div className="mt-1 text-xs text-white/60">
                              {assignmentReceipt.challengeName}
                            </div>
                            <div className="mt-1 text-xs text-white/60">
                              {assignmentReceipt.userEmail}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className={getStatusBadgeClass(assignmentReceipt.status)}>
                                {assignmentReceipt.status}
                              </Badge>
                              <Badge>{formatDateTime(assignmentReceipt.assignedAt)}</Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/45">
                            Select exactly one user and challenge. The assignment
                            number appears here after DB verification.
                          </div>
                        )}
                      </div>
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
                            {selectedChallenge.evaluation_files?.file_code ? (
                              <Badge>
                                {selectedChallenge.evaluation_files.file_code}
                              </Badge>
                            ) : null}
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
                    <Badge>Created challenges</Badge>
                  </div>
                  <h2 className="font-display text-3xl font-black sm:text-4xl">
                    Database challenges.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    Challenges created from compatible JSON uploads appear here.
                    Each one is linked to a stored challenge file with a unique
                    C-number.
                  </p>

                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/45 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl font-bold">
                        Database Challenges
                      </h3>
                      <Badge>{challenges.length} total</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {challenges.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-6 text-white/55 md:col-span-2">
                          No database challenges yet. Upload a compatible JSON
                          file in Challenge Control, then create a challenge.
                        </div>
                      ) : null}
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
                              {challenge.evaluation_files?.file_code ??
                                "No file code"}
                            </Badge>
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
                            setSelectedAssignmentDetails(null);
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

                        return (
                          <div
                            key={assignment.id}
                            className="rounded-2xl border border-white/10 bg-black/40"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedAssignmentDetails(assignment)}
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
                              </div>
                            </button>
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
                            The file is checked against the poker engine and saved
                            when compatible.
                          </span>
                          <input
                            className="sr-only"
                            type="file"
                            accept="application/json,.json"
                            onChange={handleUpload}
                          />
                        </label>

                        <div
                          className={[
                            "mb-4 flex items-start gap-3 rounded-xl border p-3 text-sm leading-6",
                            challengeFileCheck.status === "valid"
                              ? "border-green/30 bg-green/10 text-green"
                              : challengeFileCheck.status === "error"
                                ? "border-red-300/30 bg-red-500/10 text-red-200"
                                : challengeFileCheck.status === "checking"
                                  ? "border-yellow-200/30 bg-yellow-300/10 text-yellow-100"
                                  : "border-white/10 bg-white/[0.04] text-white/52",
                          ].join(" ")}
                        >
                          {challengeFileCheck.status === "valid" ? (
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />
                          ) : challengeFileCheck.status === "error" ? (
                            <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
                          ) : challengeFileCheck.status === "checking" ? (
                            <RefreshCw className="mt-1 h-4 w-4 shrink-0" />
                          ) : (
                            <FileJson2 className="mt-1 h-4 w-4 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold">
                              {challengeFileCheck.status === "valid"
                                ? "Compatible"
                                : challengeFileCheck.status === "error"
                                  ? "Not compatible"
                                  : challengeFileCheck.status === "checking"
                                    ? "Checking file"
                                    : "Awaiting upload"}
                            </div>
                            <div className="text-xs opacity-80">
                              {challengeFileCheck.text}
                            </div>
                          </div>
                        </div>

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
                        <Button
                          className="mt-4 w-full"
                          onClick={handleCreateChallenge}
                          disabled={!challengeControlFile}
                        >
                          <FileJson2 className="mr-2 h-5 w-5" />
                          Create Challenge
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAssignmentDetails ? (() => {
                const assignment = selectedAssignmentDetails;
                const challenge = assignment.challenges;
                const evaluationFile = challenge?.evaluation_files;
                const canRevoke =
                  assignment.status === "assigned" || assignment.status === "active";
                const canResetTest = Boolean(assignment.is_test_assignment);

                return (
                  <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md"
                    onClick={() => setSelectedAssignmentDetails(null)}
                    role="presentation"
                  >
                    <div
                      className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-green/25 bg-black/95 p-5 shadow-[0_0_64px_rgba(0,255,136,0.16)] sm:p-6"
                      onClick={(event) => event.stopPropagation()}
                      role="dialog"
                      aria-modal="true"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Badge className="border-green/45 text-green">
                            Assignment Details
                          </Badge>
                          <div className="mt-4 font-display text-3xl font-black tracking-[0.12em] text-green">
                            #{assignment.assignment_code}
                          </div>
                          <h3 className="mt-3 font-display text-2xl font-bold text-white">
                            {challenge?.name ?? "Challenge"}
                          </h3>
                          <div className="mt-1 text-sm text-white/55">
                            {evaluationFile?.title ?? "Evaluation file"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedAssignmentDetails(null)}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-green/35 hover:text-green"
                          aria-label="Close assignment details"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Badge className={getStatusBadgeClass(assignment.status)}>
                          {assignment.status}
                        </Badge>
                        {evaluationFile?.file_code ? (
                          <Badge>{evaluationFile.file_code}</Badge>
                        ) : null}
                        <Badge>{evaluationFile?.slug ?? "No evaluation slug"}</Badge>
                        <Badge>
                          Target {evaluationFile?.funded_threshold_percent ?? 80}%
                        </Badge>
                        <Badge>{assignment.funded ? "Funded" : "Not funded"}</Badge>
                        {assignment.is_test_assignment ? (
                          <>
                            <Badge className="border-yellow-200/45 text-yellow-100">
                              Testing Replica
                            </Badge>
                            <Badge>Resets {assignment.reset_count ?? 0}</Badge>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {[
                          ["User", assignment.profile?.email ?? assignment.user_id],
                          ["Assigned", formatDateTime(assignment.assigned_at)],
                          ["Started", formatDateTime(assignment.started_at)],
                          ["Completed", formatDateTime(assignment.completed_at)],
                          ["Questions", evaluationFile?.question_count ?? "Not set"],
                          ["Score", assignment.score ?? "Not scored"],
                          [
                            "Points",
                            `${assignment.earned_points ?? 0}/${
                              assignment.total_possible_points ??
                              evaluationFile?.total_possible_points ??
                              "Not set"
                            }`,
                          ],
                          [
                            "Assigned By",
                            assignment.assignedByProfile?.email ??
                              assignment.assigned_by ??
                              "Not recorded",
                          ],
                          ["Assignment ID", assignment.id],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-lg border border-white/10 bg-black/50 p-3"
                          >
                            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                              {label}
                            </div>
                            <div className="mt-1 break-words text-sm font-bold text-green">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {canRevoke ? (
                          <Button
                            className="h-9 px-4 text-xs"
                            variant="danger"
                            onClick={async () => {
                              await handleRevokeAssignment(assignment);
                              setSelectedAssignmentDetails(null);
                            }}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Revoke
                          </Button>
                        ) : null}
                        {canResetTest ? (
                          <Button
                            className="h-9 px-4 text-xs"
                            variant="secondary"
                            onClick={async () => {
                              await handleResetTestAssignment(assignment);
                              setSelectedAssignmentDetails(null);
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset Test
                          </Button>
                        ) : null}
                      </div>

                      <AssignmentScoreRows assignment={assignment} />
                    </div>
                  </div>
                );
              })() : null}

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
