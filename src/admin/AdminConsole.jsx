import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileJson2,
  LogOut,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  assignChallengeToUser,
  createChallengeForEvaluation,
  listDatabaseChallenges,
  listDatabaseEvaluationFiles,
  saveEvaluationFileToDatabase,
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

export default function AdminConsole() {
  const [evaluationFiles, setEvaluationFiles] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeSection, setActiveSection] = useState("challenges");
  const [assignmentLookupEmail, setAssignmentLookupEmail] = useState("");
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [assignmentLookupLoading, setAssignmentLookupLoading] = useState(false);
  const [assignmentLookupSearched, setAssignmentLookupSearched] = useState(false);
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
        return;
      }

      try {
        const results = await searchProfiles(userQuery);

        if (!cancelled) {
          setUserResults(results);
        }
      } catch (error) {
        if (!cancelled) {
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
      setUserQuery("");
      setUserResults([]);
      setSelectedUser(null);
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

  const handleAssignmentLookup = async () => {
    if (assignmentLookupEmail.trim().length < 2) {
      setMessage({
        type: "error",
        text: "Enter at least two characters of an email ID.",
      });
      return;
    }

    setAssignmentLookupLoading(true);
    setAssignmentLookupSearched(true);

    try {
      const results = await searchAssignmentsByEmail(assignmentLookupEmail);

      setAssignmentResults(results);
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
              </div>

              {message ? (
                <div
                  className={[
                    "mb-4 flex gap-2 rounded-2xl border px-3 py-2 text-sm leading-5",
                    message.type === "success"
                      ? "border-green/30 bg-green/10 text-green"
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

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">
                  Evaluation Files
                </div>
                {loading ? <Badge>Loading database</Badge> : null}
                {evaluationFiles.length === 0 && !loading ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/58">
                    No database evaluation files yet. Upload a valid JSON file to begin.
                  </div>
                ) : null}
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
                        "w-full rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-green bg-green/10"
                          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <div className="font-display text-lg font-bold leading-tight">
                        {file.evaluation.title}
                      </div>
                      <div className="mt-1 text-xs text-white/52">{file.slug}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge>{file.questionCount} questions</Badge>
                        <Badge>DB</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
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
              ) : activeSection === "lookup" ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge>Assignment Lookup</Badge>
                    <Badge>Email search</Badge>
                  </div>
                  <h2 className="font-display text-3xl font-black sm:text-4xl">
                    Find assignment numbers and challenge details.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    Search by user email ID to see assigned challenge numbers,
                    status, evaluation file, and score details.
                  </p>

                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                        Email ID
                      </span>
                      <div className="mt-2 flex min-h-12 flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 focus-within:border-green sm:flex-row sm:items-center sm:py-0">
                        <Search className="h-4 w-4 shrink-0 text-white/45" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm text-green outline-none placeholder:text-white/35"
                          value={assignmentLookupEmail}
                          onChange={(event) =>
                            setAssignmentLookupEmail(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleAssignmentLookup();
                            }
                          }}
                          placeholder="client@example.com"
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
                        No assignments found for that email ID.
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
                            className="rounded-2xl border border-white/10 bg-black/40 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-display text-2xl font-black tracking-[0.12em] text-green">
                                  {assignment.assignment_code}
                                </div>
                                <div className="mt-1 text-xs text-white/45">
                                  {profile?.email ?? assignment.user_id}
                                </div>
                              </div>
                              <Badge className="border-green/45 text-green">
                                {assignment.status}
                              </Badge>
                            </div>

                            <div className="mt-4 border-t border-white/10 pt-4">
                              <div className="font-display text-lg font-bold">
                                {challenge?.name ?? "Challenge"}
                              </div>
                              <div className="mt-1 text-sm text-white/55">
                                {evaluationFile?.title ?? "Evaluation file"}
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                    Assigned
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-green">
                                    {formatDate(assignment.assigned_at)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/50 p-3">
                                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                                    Started
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-green">
                                    {formatDate(assignment.started_at)}
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
                                    Questions
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-green">
                                    {evaluationFile?.question_count ?? "Not set"}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge>
                                  {evaluationFile?.slug ?? "No evaluation slug"}
                                </Badge>
                                <Badge>
                                  Target {evaluationFile?.funded_threshold_percent ?? 80}%
                                </Badge>
                                <Badge>
                                  {assignment.funded ? "Funded" : "Not funded"}
                                </Badge>
                              </div>
                            </div>
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
                          Uploaded evaluation files live in Supabase. A challenge
                          points to one evaluation file, then that challenge can be
                          assigned to a specific user.
                        </p>
                      </div>

                      <div className="min-h-[282px] rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
                        <label className="mb-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-green/35 bg-green/10 px-4 py-5 text-center transition hover:bg-green/15">
                          <Upload className="mb-2 h-6 w-6 text-green" />
                          <span className="text-sm font-bold uppercase tracking-[0.14em] text-green">
                            Upload Evaluation JSON
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

                      {selectedEvaluation ? (
                        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.16em] text-green">
                                Selected Evaluation
                              </div>
                              <h3 className="mt-2 font-display text-2xl font-bold">
                                {selectedEvaluation.evaluation.title}
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-white/58">
                                {selectedEvaluation.evaluation.description}
                              </p>
                            </div>
                            <Database className="h-6 w-6 shrink-0 text-green" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-5">
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
