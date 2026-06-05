import { useEffect } from "react";
import EvaluationSummary from "./EvaluationSummary";
import PokerTable from "./PokerTable";
import ScenarioDashboard from "./ScenarioDashboard";
import { scenarios } from "../data/scenarios";
import { useEvaluationStore } from "../store/useEvaluationStore";

const previewScenarios = [
  ...scenarios,
  {
    id: "preview_8max",
    title: "8-Max Layout And Chip Flow Preview",
    category: "Engine Preview",
    gameType: "Cash",
    tableFormat: "8-max",
    blinds: "1/2",
    effectiveStack: 100,
    hero: {
      name: "Hero",
      position: "BTN",
      cards: ["As", "Kd"],
      stack: 200,
    },
    villains: [
      { name: "Astra", position: "SB", stack: 202, status: "Active" },
      { name: "Vector", position: "BB", stack: 198, status: "Active" },
      { name: "Kaito", position: "UTG", stack: 220, status: "Active" },
      { name: "Nova", position: "UTG+1", stack: 188, status: "Active" },
      { name: "Mika", position: "LJ", stack: 210, status: "Active" },
      { name: "Orbit", position: "HJ", stack: 196, status: "Active" },
      { name: "Rin", position: "CO", stack: 236, status: "Active" },
    ],
    board: ["Ah", "7d", "2c", "Qs", "4h"],
    street: "Turn",
    pot: 29,
    previousActions: [
      "UTG folds",
      "UTG+1 folds",
      "LJ folds",
      "HJ folds",
      "CO folds",
      "Hero opens BTN to 5",
      "SB folds",
      "BB calls",
      "Flop comes Ah 7d 2c",
      "BB checks",
      "Hero bets 8",
      "BB calls",
      "Turn comes Qs",
      "BB checks",
    ],
    decisionPoint: "Hero action on turn",
    strategicConcept: "8-max engine preview",
    options: [
      {
        label: "Check back",
        type: "Check",
        points: 45,
        feedback: "Checking controls the pot but misses value against worse aces.",
      },
      {
        label: "Bet 50% pot",
        type: "Bet",
        points: 100,
        feedback: "A medium value bet keeps worse pairs and ace-x hands in range.",
      },
      {
        label: "Bet 90% pot",
        type: "Bet large",
        points: 65,
        feedback: "A larger bet is possible but over-polarizes this holding.",
      },
      {
        label: "All-in",
        type: "All-in",
        points: 0,
        feedback: "This risks too much for the hand class and board texture.",
      },
    ],
    explanation:
      "This local-only scenario exists to preview 8-max seating, folded-seat animations, staged chip placement, and street collection timing.",
  },
];

function getPreviewStartIndex() {
  if (typeof window === "undefined") return 0;

  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get("scenario");
  const questionNumber = Number.parseInt(params.get("question") ?? "", 10);

  if (scenarioId) {
    const scenarioIndex = previewScenarios.findIndex(
      (scenario) => scenario.id === scenarioId,
    );
    if (scenarioIndex >= 0) return scenarioIndex;
  }

  if (Number.isInteger(questionNumber) && questionNumber > 0) {
    return Math.min(questionNumber - 1, previewScenarios.length - 1);
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
      scenarios: previewScenarios,
      startIndex: getPreviewStartIndex(),
    });
  }, [loadPokerEnginePreview]);

  if (mode === "summary") return <EvaluationSummary />;
  if (mode === "table") return <PokerTable />;

  return <ScenarioDashboard />;
}
