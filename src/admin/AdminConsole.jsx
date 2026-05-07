import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileJson2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  getActiveEvaluationId,
  getEvaluationById,
  getEvaluationFiles,
  saveUploadedEvaluation,
  setActiveEvaluationId,
} from "../engine/evaluationEngine";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function AdminConsole() {
  const initialEvaluationFiles = useMemo(() => getEvaluationFiles(), []);
  const [evaluationFiles, setEvaluationFiles] = useState(initialEvaluationFiles);
  const [activeEvaluationId, setActiveEvaluationState] = useState(getActiveEvaluationId);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(activeEvaluationId);
  const [selectedEvaluation, setSelectedEvaluation] = useState(() =>
    getEvaluationById(activeEvaluationId),
  );
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function loadEvaluations() {
      setLoading(true);

      try {
        const files = getEvaluationFiles();
        const activeId = getActiveEvaluationId();
        const selected = getEvaluationById(selectedEvaluationId);

        if (!cancelled) {
          setEvaluationFiles(files);
          setActiveEvaluationState(activeId);
          setSelectedEvaluation(selected);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setUploadMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Could not load evaluations.",
          });
          setSelectedEvaluation(getEvaluationById(selectedEvaluationId));
          setLoading(false);
        }
      }
    }

    loadEvaluations();

    return () => {
      cancelled = true;
    };
  }, [selectedEvaluationId]);

  const activateSelectedEvaluation = () => {
    const evaluation = setActiveEvaluationId(selectedEvaluationId);

    setActiveEvaluationState(evaluation.id);
    setUploadMessage({
      type: "success",
      text: `${evaluation.title} is now the active evaluation.`,
    });
  };

  const handleUpload = async (event) => {
    const [file] = event.target.files;
    event.target.value = "";

    if (!file) return;

    try {
      const content = await file.text();
      const parsedEvaluation = JSON.parse(content);
      const evaluation = saveUploadedEvaluation(parsedEvaluation);

      setEvaluationFiles(getEvaluationFiles());
      setSelectedEvaluationId(evaluation.id);
      setActiveEvaluationState(evaluation.id);
      setSelectedEvaluation(evaluation);
      setUploadMessage({
        type: "success",
        text: `Loaded ${evaluation.title} with ${evaluation.questionCount} questions into local storage.`,
      });
    } catch (error) {
      setUploadMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not load JSON file.",
      });
    }
  };

  return (
    <main className="min-h-dvh bg-room bg-fixed px-4 py-5 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="glass-panel rounded-[1.75rem] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-500/15 text-gold-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight">
                Developer Console
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                Evaluation file control
              </p>
            </div>
          </div>

          <label className="mb-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gold-400/35 bg-gold-500/10 px-4 py-5 text-center transition hover:bg-gold-500/15">
            <Upload className="mb-2 h-6 w-6 text-gold-400" />
            <span className="text-sm font-bold uppercase tracking-[0.14em] text-gold-400">
              Upload JSON File
            </span>
            <span className="mt-1 text-xs leading-5 text-white/48">
              Must contain exactly 25 engine-ready questions.
            </span>
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={handleUpload}
            />
          </label>

          {uploadMessage ? (
            <div
              className={[
                "mb-4 flex gap-2 rounded-2xl border px-3 py-2 text-sm leading-5",
                uploadMessage.type === "success"
                  ? "border-felt-500/30 bg-felt-500/10 text-felt-500"
                  : "border-red-300/30 bg-red-500/10 text-red-200",
              ].join(" ")}
            >
              {uploadMessage.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{uploadMessage.text}</span>
            </div>
          ) : null}

          <div className="space-y-3">
            {evaluationFiles.map((file) => {
              const selected = file.id === selectedEvaluationId;
              const active = file.id === activeEvaluationId;

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedEvaluationId(file.id)}
                  className={[
                    "w-full rounded-2xl border p-4 text-left transition",
                    selected
                      ? "border-gold-400 bg-gold-500/12"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold leading-tight">
                        {file.title}
                      </div>
                      <div className="mt-1 text-xs text-white/52">{file.id}</div>
                    </div>
                    {active ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-felt-500" />
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{file.questionCount} questions</Badge>
                    <Badge>{file.source}</Badge>
                    <Badge className={file.isValid ? "text-felt-500" : "text-red-300"}>
                      {file.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="glass-panel rounded-[1.75rem] p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge>{selectedEvaluation.audience}</Badge>
                <Badge>v{selectedEvaluation.version}</Badge>
                <Badge>
                  {evaluationFiles.find((file) => file.id === selectedEvaluation.id)?.source}
                </Badge>
                {selectedEvaluation.id === activeEvaluationId ? (
                  <Badge className="border-felt-500/45 text-felt-500">
                    Active file
                  </Badge>
                ) : null}
                {loading ? <Badge>Loading</Badge> : null}
              </div>
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                {selectedEvaluation.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                {selectedEvaluation.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button onClick={activateSelectedEvaluation}>
                <FileJson2 className="mr-2 h-5 w-5" />
                Set Active File
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.open("/", "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Open Player App
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {selectedEvaluation.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-2xl border border-white/10 bg-black/22 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">
                      Question {question.questionNumber}
                    </div>
                    <div className="mt-1 font-display text-lg font-bold">
                      {question.title}
                    </div>
                  </div>
                  <Badge>{question.street}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/58">
                  {question.decisionPoint}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/38">
                  <span>Source template: {question.sourceScenarioId ?? "Uploaded"}</span>
                  <span className="font-bold text-gold-400">{question.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
