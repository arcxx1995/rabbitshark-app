import PropTypes from "prop-types";
import { Hash, Search } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

function getStatusBadgeClass(status) {
  if (status === "completed") return "border-green/45 text-green";
  if (status === "failed") return "border-red-300/45 text-red-200";
  if (status === "revoked") return "border-white/20 text-white/45";
  if (status === "active") return "border-yellow-200/45 text-yellow-100";

  return "border-green/45 text-green";
}

export default function AssignmentLookupPanel({
  lookupMode,
  lookupEmail,
  lookupCode,
  lookupLoading,
  lookupSearched,
  results,
  onModeChange,
  onEmailChange,
  onCodeChange,
  onSearch,
  onSelectAssignment,
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge>Assignment Lookup</Badge>
        <Badge>Email or assignment number</Badge>
      </div>
      <h2 className="font-display text-3xl font-black sm:text-4xl">
        Find assignment numbers and challenge details.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
        Search by user email ID to show every assigned challenge, or search
        by the 9-digit assignment number to show one exact assignment.
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
              onClick={() => onModeChange(mode)}
              className={[
                "flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-[0.14em] transition",
                lookupMode === mode
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
            {lookupMode === "code" ? "Assignment Number" : "Email ID"}
          </span>
          <div className="mt-2 flex min-h-12 flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 focus-within:border-green sm:flex-row sm:items-center sm:py-0">
            {lookupMode === "code" ? (
              <Hash className="h-4 w-4 shrink-0 text-white/45" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-white/45" />
            )}
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-green outline-none placeholder:text-white/35"
              value={lookupMode === "code" ? lookupCode : lookupEmail}
              onChange={(event) => {
                if (lookupMode === "code") {
                  onCodeChange(event.target.value);
                  return;
                }

                onEmailChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearch();
                }
              }}
              placeholder={lookupMode === "code" ? "#364728949" : "client@example.com"}
            />
            <Button className="h-9 px-4 text-xs sm:w-auto" onClick={onSearch}>
              Search
            </Button>
          </div>
        </label>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold">Assignment Results</h3>
          <Badge>
            {lookupLoading ? "Searching" : `${results.length} found`}
          </Badge>
        </div>

        {lookupSearched && !lookupLoading && results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-5 text-sm leading-6 text-white/55">
            No assignments found for that{" "}
            {lookupMode === "code" ? "assignment number" : "email ID"}.
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {results.map((assignment) => {
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
                  onClick={() => onSelectAssignment(assignment)}
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
  );
}

AssignmentLookupPanel.propTypes = {
  lookupMode: PropTypes.oneOf(["email", "code"]).isRequired,
  lookupEmail: PropTypes.string.isRequired,
  lookupCode: PropTypes.string.isRequired,
  lookupLoading: PropTypes.bool.isRequired,
  lookupSearched: PropTypes.bool.isRequired,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      assignment_code: PropTypes.string,
      status: PropTypes.string,
      user_id: PropTypes.string,
      profile: PropTypes.shape({ email: PropTypes.string }),
      challenges: PropTypes.shape({
        name: PropTypes.string,
        evaluation_files: PropTypes.shape({ title: PropTypes.string }),
      }),
    }),
  ).isRequired,
  onModeChange: PropTypes.func.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onCodeChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onSelectAssignment: PropTypes.func.isRequired,
};
