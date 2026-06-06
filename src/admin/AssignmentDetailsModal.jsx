import PropTypes from "prop-types";
import { Ban, RefreshCw, X } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

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

AssignmentScoreRows.propTypes = {
  assignment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    scenario_results: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        selectedAction: PropTypes.string,
        bestAction: PropTypes.string,
        points: PropTypes.number,
        maxPoints: PropTypes.number,
      }),
    ),
  }).isRequired,
};

export default function AssignmentDetailsModal({
  assignment,
  onClose,
  onRevoke,
  onResetTest,
}) {
  const challenge = assignment.challenges;
  const evaluationFile = challenge?.evaluation_files;
  const canRevoke =
    assignment.status === "assigned" || assignment.status === "active";
  const canResetTest = Boolean(assignment.is_test_assignment);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
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
            onClick={onClose}
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
                await onRevoke(assignment);
                onClose();
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
                await onResetTest(assignment);
                onClose();
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
}

AssignmentDetailsModal.propTypes = {
  assignment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    assignment_code: PropTypes.string,
    status: PropTypes.string,
    funded: PropTypes.bool,
    is_test_assignment: PropTypes.bool,
    reset_count: PropTypes.number,
    user_id: PropTypes.string,
    assigned_at: PropTypes.string,
    started_at: PropTypes.string,
    completed_at: PropTypes.string,
    score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    earned_points: PropTypes.number,
    total_possible_points: PropTypes.number,
    assigned_by: PropTypes.string,
    profile: PropTypes.shape({ email: PropTypes.string }),
    assignedByProfile: PropTypes.shape({ email: PropTypes.string }),
    challenges: PropTypes.shape({
      name: PropTypes.string,
      evaluation_files: PropTypes.shape({
        title: PropTypes.string,
        file_code: PropTypes.string,
        slug: PropTypes.string,
        funded_threshold_percent: PropTypes.number,
        question_count: PropTypes.number,
        total_possible_points: PropTypes.number,
      }),
    }),
    scenario_results: PropTypes.array,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
  onResetTest: PropTypes.func.isRequired,
};
