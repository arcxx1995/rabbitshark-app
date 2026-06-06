import PropTypes from "prop-types";
import {
  AlertCircle,
  CheckCircle2,
  FileJson2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

export default function ChallengesSection({
  challengeFileCheck,
  challengeName,
  setChallengeName,
  challengeControlFile,
  onUpload,
  onCreate,
}) {
  return (
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
            Uploaded challenge files live in Supabase. A challenge points to
            one challenge file, then that challenge can be assigned to a specific user.
          </p>
        </div>

        <div className="min-h-[282px] rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
          <label className="mb-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-green/35 bg-green/10 px-4 py-5 text-center transition hover:bg-green/15">
            <Upload className="mb-2 h-6 w-6 text-green" />
            <span className="text-sm font-bold uppercase tracking-[0.14em] text-green">
              Upload Challenge JSON
            </span>
            <span className="mt-1 text-xs leading-5 text-white/48">
              The file is checked against the poker engine and saved when compatible.
            </span>
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={onUpload}
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
              <div className="text-xs opacity-80">{challengeFileCheck.text}</div>
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
          <Button className="mt-4 w-full" onClick={onCreate} disabled={!challengeControlFile}>
            <FileJson2 className="mr-2 h-5 w-5" />
            Create Challenge
          </Button>
        </div>
      </div>
    </div>
  );
}

ChallengesSection.propTypes = {
  challengeFileCheck: PropTypes.shape({
    status: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
  challengeName: PropTypes.string.isRequired,
  setChallengeName: PropTypes.func.isRequired,
  challengeControlFile: PropTypes.object,
  onUpload: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};
