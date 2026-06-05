import { useEffect } from "react";
import EvaluationSummary from "./EvaluationSummary";
import PokerTable from "./PokerTable";
import ScenarioDashboard from "./ScenarioDashboard";
import { scenarios } from "../data/scenarios";
import { useEvaluationStore } from "../store/useEvaluationStore";

function getPreviewStartIndex() {
  if (typeof window === "undefined") return 0;

  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get("scenario");
  const questionNumber = Number.parseInt(params.get("question") ?? "", 10);

  if (scenarioId) {
    const scenarioIndex = scenarios.findIndex((scenario) => scenario.id === scenarioId);
    if (scenarioIndex >= 0) return scenarioIndex;
  }

  if (Number.isInteger(questionNumber) && questionNumber > 0) {
    return Math.min(questionNumber - 1, scenarios.length - 1);
  }

  return 0;
}

export default function PokerEnginePreview() {
  const mode = useEvaluationStore((state) => state.mode);
  const loadPokerEnginePreview = useEvaluationStore(
    (state) => state.loadPokerEnginePreview,
  );

  useEffect(() => {
    loadPokerEnginePreview({
      scenarios,
      startIndex: getPreviewStartIndex(),
    });
  }, [loadPokerEnginePreview]);

  if (mode === "summary") return <EvaluationSummary />;
  if (mode === "table") return <PokerTable />;

  return <ScenarioDashboard />;
}
