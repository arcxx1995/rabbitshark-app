import PropTypes from "prop-types";
import { FileJson2, Upload } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useChallengeFileUpload } from "./useAdminHooks";

export default function ChallengeUploadSection({
  onMessage,
  onChallengeSelected,
}) {
  const {
    challengeControlFile,
    setChallengeControlFile,
    challengeFileCheck,
    setChallengeFileCheck,
    handleUpload,
  } = useChallengeFileUpload(onMessage);

  const handleCreateChallenge = async () => {
    if (!challengeControlFile) {
      onMessage({ type: "error", text: "Upload a compatible challenge JSON file first." });
      return;
    }

    const name = challengeControlFile.evaluation.title;

    try {
      const { createChallengeForEvaluation } = await import("../lib/challengeDatabase");
      const challenge = await createChallengeForEvaluation({
        name,
        evaluationFileId: challengeControlFile.id,
      });

      onMessage({ type: "success", text: `Created challenge ${challenge.name} in the database.` });
      setChallengeControlFile(null);
      setChallengeFileCheck({ status: "idle", text: "Upload a challenge JSON file to check compatibility." });
      onChallengeSelected(challenge.id);
    } catch (error) {
      onMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not create challenge.",
      });
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge>Upload Challenge</Badge>
        <Badge>Create challenge</Badge>
      </div>
      <h2 className="font-display text-3xl font-black sm:text-4xl">
        Create a new challenge.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
        Upload a challenge JSON file to validate its compatibility with the poker engine. Once validated, you can create
        it in the database and assign it to users.
      </p>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/60 p-5">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-white/10 p-4 transition hover:border-green/30">
          <Upload className="h-5 w-5 text-white/45" />
          <span className="text-sm text-white/62">
            {challengeFileCheck.status === "checking"
              ? "Validating..."
              : "Choose a challenge JSON file"}
          </span>
          <input
            type="file"
            accept=".json"
            onChange={handleUpload}
            disabled={challengeFileCheck.status === "checking"}
            className="hidden"
          />
        </label>

        {challengeFileCheck.status !== "idle" ? (
          <div
            className={[
              "mt-3 rounded-xl border px-3 py-3 text-sm",
              challengeFileCheck.status === "valid"
                ? "border-green/25 bg-green/10 text-green"
                : challengeFileCheck.status === "checking"
                  ? "border-yellow-200/25 bg-yellow-100/10 text-yellow-100"
                  : "border-red-300/25 bg-red-200/10 text-red-200",
            ].join(" ")}
          >
            {challengeFileCheck.text}
          </div>
        ) : null}

        {challengeControlFile ? (
          <div className="mt-4 rounded-xl border border-green/25 bg-green/10 p-3">
            <div className="flex items-center gap-3">
              <FileJson2 className="h-5 w-5 text-green" />
              <div>
                <div className="text-sm font-bold text-green">{challengeControlFile.file_code ?? challengeControlFile.fileCode}</div>
                <div className="mt-1 text-xs text-green/60">{challengeControlFile.evaluation.title}</div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCreateChallenge}
              className="mt-4 w-full"
            >
              Create Challenge
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

ChallengeUploadSection.propTypes = {
  onMessage: PropTypes.func.isRequired,
  onChallengeSelected: PropTypes.func.isRequired,
};
