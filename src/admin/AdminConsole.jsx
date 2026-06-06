import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileJson2,
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
  createChallengeForEvaluation,
  listAssignmentsForUser,
  revokeAssignedChallenge,
  resetTestAssignedChallenge,
  searchAssignmentByCode,
} from "../lib/challengeDatabase";
import { signOutOfApp } from "../lib/authSession";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import AssignmentDetailsModal from "./AssignmentDetailsModal";
import AssignmentLookupPanel from "./AssignmentLookupPanel";
import ChallengesSection from "./ChallengesSection";
import {
  useAdminData,
  useUserSearch,
  useHealthCheck,
  useAssignmentLookup,
  useChallengeFileUpload,
} from "./useAdminHooks";

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

export default function AdminConsole() {
  // UI state
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignmentPending, setAssignmentPending] = useState(false);
  const [assignmentReceipt, setAssignmentReceipt] = useState(null);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [assignmentHistoryLoading, setAssignmentHistoryLoading] = useState(false);
  const [assignmentHistoryLoaded, setAssignmentHistoryLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState("challenges");
  const [message, setMessage] = useState(null);

  // Custom hooks for data and search logic
  const { challenges, loadAdminData } = useAdminData(setMessage);
  const { userQuery, setUserQuery, userResults, userSearchLoading } = useUserSearch(setMessage);
  const { healthRows, healthLoading, healthSearched, loadHealth } = useHealthCheck(
    activeSection,
    setMessage
  );
  const {
    assignmentLookupMode,
    setAssignmentLookupMode,
    assignmentLookupEmail,
    setAssignmentLookupEmail,
    assignmentLookupCode,
    setAssignmentLookupCode,
    assignmentResults,
    setAssignmentResults,
    assignmentLookupLoading,
    assignmentLookupSearched,
    setAssignmentLookupSearched,
    selectedAssignmentDetails,
    setSelectedAssignmentDetails,
    handleAssignmentLookup,
  } = useAssignmentLookup(activeSection, setMessage);
  const {
    challengeControlFile,
    setChallengeControlFile,
    challengeFileCheck,
    setChallengeFileCheck,
    handleUpload,
  } = useChallengeFileUpload(setMessage);

  const selectedChallenge = useMemo(() => {
    return challenges.find((challenge) => challenge.id === selectedChallengeId);
  }, [challenges, selectedChallengeId]);

  const activeAssignmentHistory = useMemo(() => {
    return assignmentHistory.filter((assignment) =>
      ["assigned", "active"].includes(assignment.status),
    );
  }, [assignmentHistory]);

  // Load assignment history for selected user + challenge
  const loadSelectedAssignmentHistory = useCallback(async () => {
    if (!selectedUser?.id || !selectedChallengeId) {
      setAssignmentHistory([]);
      setAssignmentHistoryLoaded(false);
      setAssignmentHistoryLoading(false);
      return;
    }

    setAssignmentHistoryLoading(true);
    setAssignmentHistoryLoaded(true);

    try {
      const history = await listAssignmentsForUser({
        userId: selectedUser.id,
        challengeId: selectedChallengeId,
      });

      setAssignmentHistory(history);
      setAssignmentHistoryLoading(false);
    } catch (error) {
      setAssignmentHistory([]);
      setAssignmentHistoryLoading(false);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not load assignment history.",
      });
    }
  }, [selectedChallengeId, selectedUser?.id]);

  useEffect(() => {
    loadSelectedAssignmentHistory();
  }, [loadSelectedAssignmentHistory]);

  useEffect(() => {
    setAssignmentReceipt(null);
  }, [selectedChallengeId, selectedUser?.id]);

  const logout = async () => {
    try {
      await signOutOfApp();
    } catch (error) {
      console.error("Could not sign out.", error);
    } finally {
      window.location.assign("/");
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeControlFile) {
      setMessage({ type: "error", text: "Upload a compatible challenge JSON file first." });
      return;
    }

    const name = challengeName.trim() || challengeControlFile.evaluation.title;

    try {
      const challenge = await createChallengeForEvaluation({
        name,
        evaluationFileId: challengeControlFile.id,
      });

      setMessage({ type: "success", text: `Created challenge ${challenge.name} in the database.` });
      await loadAdminData();
      setSelectedChallengeId(challenge.id);
      setChallengeName("");
      setChallengeControlFile(null);
      setChallengeFileCheck({ status: "idle", text: "Upload a challenge JSON file to check compatibility." });
      setActiveSection("database");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not create challenge.",
      });
    }
  };

  const handleAssignChallenge = async () => {
    if (!selectedChallenge || !selectedUser) {
      setMessage({ type: "error", text: "Select a challenge and a user before assigning." });
      return;
    }

    setAssignmentPending(true);
    setAssignmentReceipt(null);

    try {
      const assignment = await assignChallengeToUser({
        challengeId: selectedChallenge.id,
        userId: selectedUser.id,
      });
      const [verifiedAssignment] = await searchAssignmentByCode(assignment.assignment_code);

      if (
        !verifiedAssignment ||
        verifiedAssignment.user_id !== selectedUser.id ||
        verifiedAssignment.challenge_id !== selectedChallenge.id
      ) {
        throw new Error("Assignment was created but could not be verified.");
      }

      setAssignmentReceipt({
        assignmentCode: verifiedAssignment.assignment_code,
        challengeName: verifiedAssignment.challenges?.name ?? selectedChallenge.name,
        userEmail: selectedUser.email,
        assignedAt: verifiedAssignment.assigned_at,
        status: verifiedAssignment.status,
      });

      setMessage({
        type: "success",
        text: `Assigned ${selectedChallenge.name} to ${selectedUser.email}. Code: ${assignment.assignment_code}.`,
      });
      await loadSelectedAssignmentHistory();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not assign challenge.",
      });
    } finally {
      setAssignmentPending(false);
    }
  };

  const handleRevokeAssignment = async (assignment) => {
    try {
      const revoked = await revokeAssignedChallenge(assignment.id);

      setMessage({ type: "success", text: `Revoked assignment ${revoked.assignment_code}.` });

      if (assignmentLookupSearched) {
        await handleAssignmentLookup();
      }

      if (assignmentHistoryLoaded) {
        await loadSelectedAssignmentHistory();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not revoke assignment.",
      });
    }
  };

  const handleResetTestAssignment = async (assignment) => {
    try {
      const resetAssignment = await resetTestAssignedChallenge(assignment.id);

      setMessage({ type: "success", text: `Reset test assignment ${resetAssignment.assignment_code}.` });

      if (assignmentLookupSearched) {
        await handleAssignmentLookup();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not reset test assignment.",
      });
    }
  };

  const navSections = [
    { id: "challenges", label: "Challenge Control", Icon: FileJson2 },
    { id: "assign", label: "Assign Challenge", Icon: UserPlus },
    { id: "database", label: "Challenge Database", Icon: Database },
    { id: "lookup", label: "Assignment Lookup", Icon: Search },
    { id: "health", label: "System Health", Icon: HeartPulse },
  ];

  return (
    <main className="h-dvh overflow-y-scroll bg-aurora text-green">
      <section className="grid-shell min-h-screen overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-5 sm:px-8 sm:pb-14 sm:pt-7 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <a href="#" className="font-display text-2xl tracking-[0.18em]">RABBITSTAKE</a>
            <div className="hidden rounded-full border border-green/25 bg-green px-5 py-3 text-sm font-semibold text-black shadow-tide sm:block">Developer Console</div>
          </header>
          <div className="mt-10 grid gap-5 xl:grid-cols-[380px_1fr]">
            <AdminSidebar navSections={navSections} activeSection={activeSection} onSectionChange={setActiveSection} message={message} />
            <AdminSectionContent
              activeSection={activeSection}
              challenges={challenges}
              selectedChallengeId={selectedChallengeId}
              setSelectedChallengeId={setSelectedChallengeId}
              selectedChallenge={selectedChallenge}
              userQuery={userQuery}
              setUserQuery={setUserQuery}
              userSearchLoading={userSearchLoading}
              userResults={userResults}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              setAssignmentReceipt={setAssignmentReceipt}
              assignmentHistoryLoading={assignmentHistoryLoading}
              assignmentHistoryLoaded={assignmentHistoryLoaded}
              assignmentHistory={assignmentHistory}
              activeAssignmentHistory={activeAssignmentHistory}
              assignmentPending={assignmentPending}
              assignmentReceipt={assignmentReceipt}
              onAssign={handleAssignChallenge}
              challengeFileCheck={challengeFileCheck}
              challengeName={challengeName}
              setChallengeName={setChallengeName}
              challengeControlFile={challengeControlFile}
              onUpload={handleUpload}
              onCreate={handleCreateChallenge}
              healthRows={healthRows}
              healthLoading={healthLoading}
              healthSearched={healthSearched}
              onRefreshHealth={loadHealth}
              assignmentLookupMode={assignmentLookupMode}
              setAssignmentLookupMode={setAssignmentLookupMode}
              assignmentLookupEmail={assignmentLookupEmail}
              setAssignmentLookupEmail={setAssignmentLookupEmail}
              assignmentLookupCode={assignmentLookupCode}
              setAssignmentLookupCode={setAssignmentLookupCode}
              assignmentResults={assignmentResults}
              setAssignmentResults={setAssignmentResults}
              assignmentLookupLoading={assignmentLookupLoading}
              assignmentLookupSearched={assignmentLookupSearched}
              setAssignmentLookupSearched={setAssignmentLookupSearched}
              selectedAssignmentDetails={selectedAssignmentDetails}
              setSelectedAssignmentDetails={setSelectedAssignmentDetails}
              onAssignmentLookup={handleAssignmentLookup}
              onRevoke={handleRevokeAssignment}
              onResetTest={handleResetTestAssignment}
              onLogout={logout}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminSidebar({ navSections, activeSection, onSectionChange, message }) {
  return (
    <aside className="glass-panel rounded-[1.75rem] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-green/20 bg-green/10 text-green">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-black">Developer Console</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">Database challenge control</p>
        </div>
      </div>
      <div className="mb-4 grid gap-2">
        {navSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            className={[
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-left text-sm font-bold transition",
              activeSection === section.id
                ? "border-green bg-green text-black"
                : "border-white/10 bg-black/20 text-green hover:border-green/35 hover:bg-green/10",
            ].join(" ")}
          >
            <section.Icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>
      {message ? (
        <div className={["mb-4 flex gap-2 rounded-2xl border px-3 py-2 text-sm leading-5",
          message.type === "success" ? "border-green/30 bg-green/10 text-green"
          : message.type === "warning" ? "border-yellow-200/30 bg-yellow-300/10 text-yellow-100"
          : "border-red-300/30 bg-red-500/10 text-red-200"].join(" ")}>
          {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      ) : null}
    </aside>
  );
}

AdminSidebar.propTypes = {
  navSections: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string, Icon: PropTypes.elementType })).isRequired,
  activeSection: PropTypes.string.isRequired,
  onSectionChange: PropTypes.func.isRequired,
  message: PropTypes.shape({ type: PropTypes.string, text: PropTypes.string }),
};

function AdminSectionContent(props) {
  const {
    activeSection, challenges, selectedChallengeId, setSelectedChallengeId,
    selectedChallenge, userQuery, setUserQuery, userSearchLoading, userResults,
    selectedUser, setSelectedUser, setAssignmentReceipt, assignmentHistoryLoading,
    assignmentHistoryLoaded, assignmentHistory, activeAssignmentHistory,
    assignmentPending, assignmentReceipt, onAssign, challengeFileCheck,
    challengeName, setChallengeName, challengeControlFile, onUpload, onCreate,
    healthRows, healthLoading, healthSearched, onRefreshHealth,
    assignmentLookupMode, setAssignmentLookupMode, assignmentLookupEmail,
    setAssignmentLookupEmail, assignmentLookupCode, setAssignmentLookupCode, assignmentResults,
    setAssignmentResults, assignmentLookupLoading, assignmentLookupSearched,
    setAssignmentLookupSearched, selectedAssignmentDetails, setSelectedAssignmentDetails,
    onAssignmentLookup, onRevoke, onResetTest, onLogout,
  } = props;

  return (
    <section className="glass-panel rounded-[1.75rem] p-5 sm:p-7">
      {activeSection === "assign" ? (
        <AssignSection
          challenges={challenges} selectedChallengeId={selectedChallengeId}
          setSelectedChallengeId={setSelectedChallengeId} selectedChallenge={selectedChallenge}
          userQuery={userQuery} setUserQuery={setUserQuery} userSearchLoading={userSearchLoading}
          userResults={userResults} selectedUser={selectedUser} setSelectedUser={setSelectedUser}
          setAssignmentReceipt={setAssignmentReceipt} assignmentHistoryLoading={assignmentHistoryLoading}
          assignmentHistoryLoaded={assignmentHistoryLoaded} assignmentHistory={assignmentHistory}
          activeAssignmentHistory={activeAssignmentHistory} assignmentPending={assignmentPending}
          assignmentReceipt={assignmentReceipt} onAssign={onAssign}
          getStatusBadgeClass={getStatusBadgeClass} formatDateTime={formatDateTime}
        />
      ) : activeSection === "database" ? (
        <DatabaseSection challenges={challenges} selectedChallengeId={selectedChallengeId} setSelectedChallengeId={setSelectedChallengeId} formatDate={formatDate} />
      ) : activeSection === "health" ? (
        <HealthSection healthRows={healthRows} healthLoading={healthLoading} healthSearched={healthSearched} onRefresh={onRefreshHealth} getStatusBadgeClass={getStatusBadgeClass} />
      ) : activeSection === "lookup" ? (
        <AssignmentLookupPanel
          lookupMode={assignmentLookupMode} lookupEmail={assignmentLookupEmail}
          lookupCode={assignmentLookupCode} lookupLoading={assignmentLookupLoading}
          lookupSearched={assignmentLookupSearched} results={assignmentResults}
          onModeChange={(mode) => { setAssignmentLookupMode(mode); setAssignmentResults([]); setSelectedAssignmentDetails(null); setAssignmentLookupSearched(false); }}
          onEmailChange={setAssignmentLookupEmail} onCodeChange={setAssignmentLookupCode}
          onSearch={onAssignmentLookup} onSelectAssignment={setSelectedAssignmentDetails}
        />
      ) : (
        <ChallengesSection challengeFileCheck={challengeFileCheck} challengeName={challengeName} setChallengeName={setChallengeName} challengeControlFile={challengeControlFile} onUpload={onUpload} onCreate={onCreate} />
      )}
      {selectedAssignmentDetails ? (
        <AssignmentDetailsModal assignment={selectedAssignmentDetails} onClose={() => setSelectedAssignmentDetails(null)} onRevoke={onRevoke} onResetTest={onResetTest} />
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
        <Button variant="danger" onClick={onLogout}>
          <LogOut className="mr-2 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </section>
  );
}

AdminSectionContent.propTypes = {
  activeSection: PropTypes.string.isRequired,
  challenges: PropTypes.array.isRequired,
  selectedChallengeId: PropTypes.string.isRequired,
  setSelectedChallengeId: PropTypes.func.isRequired,
  selectedChallenge: PropTypes.object,
  userQuery: PropTypes.string.isRequired,
  setUserQuery: PropTypes.func.isRequired,
  userSearchLoading: PropTypes.bool.isRequired,
  userResults: PropTypes.array.isRequired,
  selectedUser: PropTypes.object,
  setSelectedUser: PropTypes.func.isRequired,
  setAssignmentReceipt: PropTypes.func.isRequired,
  assignmentHistoryLoading: PropTypes.bool.isRequired,
  assignmentHistoryLoaded: PropTypes.bool.isRequired,
  assignmentHistory: PropTypes.array.isRequired,
  activeAssignmentHistory: PropTypes.array.isRequired,
  assignmentPending: PropTypes.bool.isRequired,
  assignmentReceipt: PropTypes.object,
  onAssign: PropTypes.func.isRequired,
  challengeFileCheck: PropTypes.object.isRequired,
  challengeName: PropTypes.string.isRequired,
  setChallengeName: PropTypes.func.isRequired,
  challengeControlFile: PropTypes.object,
  onUpload: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  healthRows: PropTypes.array.isRequired,
  healthLoading: PropTypes.bool.isRequired,
  healthSearched: PropTypes.bool.isRequired,
  onRefreshHealth: PropTypes.func.isRequired,
  assignmentLookupMode: PropTypes.string.isRequired,
  setAssignmentLookupMode: PropTypes.func.isRequired,
  assignmentLookupEmail: PropTypes.string.isRequired,
  setAssignmentLookupEmail: PropTypes.func.isRequired,
  assignmentLookupCode: PropTypes.string.isRequired,
  setAssignmentLookupCode: PropTypes.func.isRequired,
  assignmentResults: PropTypes.array.isRequired,
  setAssignmentResults: PropTypes.func.isRequired,
  assignmentLookupLoading: PropTypes.bool.isRequired,
  assignmentLookupSearched: PropTypes.bool.isRequired,
  setAssignmentLookupSearched: PropTypes.func.isRequired,
  selectedAssignmentDetails: PropTypes.object,
  setSelectedAssignmentDetails: PropTypes.func.isRequired,
  onAssignmentLookup: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
  onResetTest: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Section sub-components — tightly coupled to AdminConsole, co-located here
// ---------------------------------------------------------------------------


function DatabaseSection({ challenges, selectedChallengeId, setSelectedChallengeId, formatDate }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge>Challenge Database</Badge>
        <Badge>Created challenges</Badge>
      </div>
      <h2 className="font-display text-3xl font-black sm:text-4xl">Database challenges.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
        Challenges created from compatible JSON uploads appear here. Each one is
        linked to a stored challenge file with a unique C-number.
      </p>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/45 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold">Database Challenges</h3>
          <Badge>{challenges.length} total</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {challenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-6 text-white/55 md:col-span-2">
              No database challenges yet. Upload a compatible JSON file in
              Challenge Control, then create a challenge.
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
              <div className="font-display text-lg font-bold">{challenge.name}</div>
              <div className="mt-2 text-xs text-white/45">
                Created {formatDate(challenge.created_at)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{challenge.evaluation_files?.file_code ?? "No file code"}</Badge>
                <Badge>{challenge.evaluation_files?.title ?? "Evaluation"}</Badge>
                <Badge>Assignable</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

DatabaseSection.propTypes = {
  challenges: PropTypes.array.isRequired,
  selectedChallengeId: PropTypes.string.isRequired,
  setSelectedChallengeId: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
};

function HealthSection({ healthRows, healthLoading, healthSearched, onRefresh, getStatusBadgeClass }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge>System Health</Badge>
        <Badge>Database checks</Badge>
      </div>
      <h2 className="font-display text-3xl font-black sm:text-4xl">
        Verify challenge assignment infrastructure.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
        Confirm the live database supports repeated assignments, unique 9-digit
        codes, RPC workflows, and blocked direct player updates.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onRefresh} disabled={healthLoading}>
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
              row.status === "ok" ? "border-green/25 bg-green/10" : "border-red-300/25 bg-red-500/10",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-bold">
                  {row.check_name.replaceAll("_", " ")}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/58">{row.details}</div>
              </div>
              <Badge className={getStatusBadgeClass(row.status)}>{row.status}</Badge>
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
  );
}

HealthSection.propTypes = {
  healthRows: PropTypes.array.isRequired,
  healthLoading: PropTypes.bool.isRequired,
  healthSearched: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  getStatusBadgeClass: PropTypes.func.isRequired,
};

function AssignSection({
  challenges,
  selectedChallengeId,
  setSelectedChallengeId,
  selectedChallenge,
  userQuery,
  setUserQuery,
  userSearchLoading,
  userResults,
  selectedUser,
  setSelectedUser,
  setAssignmentReceipt,
  assignmentHistoryLoading,
  assignmentHistoryLoaded,
  assignmentHistory,
  activeAssignmentHistory,
  assignmentPending,
  assignmentReceipt,
  onAssign,
  getStatusBadgeClass,
  formatDateTime,
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge>Assign Challenge</Badge>
        <Badge>Challenge to user</Badge>
      </div>
      <h2 className="font-display text-3xl font-black sm:text-4xl">
        Assign a challenge to a user.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
        Search Supabase users by email or name, select a user, then assign the
        selected challenge. It appears on that user's dashboard.
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
              onChange={(event) => setSelectedChallengeId(event.target.value)}
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
                    nextQuery.trim().toLowerCase() !== selectedUser.email?.toLowerCase()
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
            {!userSearchLoading && userQuery.trim().length >= 2 && userResults.length === 0 ? (
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

          {selectedUser && selectedChallenge ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                    Existing Assignments
                  </div>
                  <div className="mt-1 text-sm text-white/65">
                    {assignmentHistoryLoading
                      ? "Checking history..."
                      : `${assignmentHistory.length} assignment${
                          assignmentHistory.length === 1 ? "" : "s"
                        } for this user and challenge`}
                  </div>
                </div>
                <Badge
                  className={
                    activeAssignmentHistory.length > 0
                      ? "border-yellow-200/45 text-yellow-100"
                      : "border-green/45 text-green"
                  }
                >
                  {activeAssignmentHistory.length} active
                </Badge>
              </div>

              {assignmentHistoryLoaded && !assignmentHistoryLoading && assignmentHistory.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-white/12 bg-white/5 p-3 text-xs leading-5 text-white/45">
                  No previous assignment exists for this user and challenge.
                </div>
              ) : null}

              {activeAssignmentHistory.length > 0 ? (
                <div className="mt-3 rounded-lg border border-yellow-200/25 bg-yellow-300/10 p-3 text-xs leading-5 text-yellow-100">
                  This user already has an active instance. Assigning again creates a separate challenge code.
                </div>
              ) : null}

              {assignmentHistory.length > 0 ? (
                <div className="mt-3 grid max-h-56 gap-2 overflow-auto pr-1">
                  {assignmentHistory.map((assignment) => (
                    <div key={assignment.id} className="rounded-lg border border-white/10 bg-black/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-display text-lg font-black tracking-[0.12em] text-green">
                            #{assignment.assignment_code}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            Assigned {formatDateTime(assignment.assigned_at)}
                          </div>
                          <div className="mt-1 truncate text-xs text-white/45">
                            By{" "}
                            {assignment.assignedByProfile?.email ??
                              assignment.assigned_by ??
                              "not recorded"}
                          </div>
                        </div>
                        <Badge className={getStatusBadgeClass(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Button
              className="h-full min-h-12 w-full"
              onClick={onAssign}
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
                <div className="font-bold">Assigned #{assignmentReceipt.assignmentCode}</div>
                <div className="mt-1 text-xs text-white/60">{assignmentReceipt.challengeName}</div>
                <div className="mt-1 text-xs text-white/60">{assignmentReceipt.userEmail}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={getStatusBadgeClass(assignmentReceipt.status)}>
                    {assignmentReceipt.status}
                  </Badge>
                  <Badge>{formatDateTime(assignmentReceipt.assignedAt)}</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/45">
                Select exactly one user and challenge. The assignment number
                appears here after DB verification.
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
              <h3 className="mt-2 font-display text-2xl font-bold">{selectedChallenge.name}</h3>
              <div className="mt-2 text-sm text-white/55">
                {selectedChallenge.evaluation_files?.title ?? "Evaluation file"}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedChallenge.evaluation_files?.file_code ? (
                  <Badge>{selectedChallenge.evaluation_files.file_code}</Badge>
                ) : null}
                <Badge>Created {formatDate(selectedChallenge.created_at)}</Badge>
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
  );
}

AssignSection.propTypes = {
  challenges: PropTypes.array.isRequired,
  selectedChallengeId: PropTypes.string.isRequired,
  setSelectedChallengeId: PropTypes.func.isRequired,
  selectedChallenge: PropTypes.object,
  userQuery: PropTypes.string.isRequired,
  setUserQuery: PropTypes.func.isRequired,
  userSearchLoading: PropTypes.bool.isRequired,
  userResults: PropTypes.array.isRequired,
  selectedUser: PropTypes.object,
  setSelectedUser: PropTypes.func.isRequired,
  setAssignmentReceipt: PropTypes.func.isRequired,
  assignmentHistoryLoading: PropTypes.bool.isRequired,
  assignmentHistoryLoaded: PropTypes.bool.isRequired,
  assignmentHistory: PropTypes.array.isRequired,
  activeAssignmentHistory: PropTypes.array.isRequired,
  assignmentPending: PropTypes.bool.isRequired,
  assignmentReceipt: PropTypes.object,
  onAssign: PropTypes.func.isRequired,
  getStatusBadgeClass: PropTypes.func.isRequired,
  formatDateTime: PropTypes.func.isRequired,
};
