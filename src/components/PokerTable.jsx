import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { ArrowLeft, Timer } from "lucide-react";
import ScenarioLog from "./ScenarioLog";
import ScorePanel from "./ScorePanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  buildPokerTableViewModel,
  isStreetRevealAction,
} from "../engine/pokerEngine";
import { useEvaluationStore } from "../store/useEvaluationStore";
import { PokerTableSurface } from "./PokerTableSurface";

// Re-exported for consumers that import PokerTableSurface from this module
// (e.g. ChipLayoutPreview). Moving it to its own file keeps PokerTable under
// the 300-line limit while preserving the existing import path contract.
export { PokerTableSurface };

// Shared animation timing constants. All *_MS values are milliseconds; divide
// by 1000 when passing to framer-motion transition.duration (which expects seconds).
const CHIP_ANIM = {
  BET_PLACE_MS: 580,
  COLLECT_MS: 720,
  HERO_PREVIEW_MS: 720,
  STEP_ADVANCE_BASE_MS: 650,
  // Must be > COLLECT_MS + render buffer so collect/win chips finish before
  // the next action renders and overwrites their position data.
  STEP_ADVANCE_COLLECT_MS: 900,
  // Board card springs stagger at 80ms/card × up to 5 cards + spring duration (~300ms).
  STEP_ADVANCE_BOARD_REVEAL_MS: 850,
  // Nameplate fade is 400ms + visual dwell before the next action reads.
  STEP_ADVANCE_FOLD_MS: 750,
};

export default function PokerTable() {
  const scenario = useEvaluationStore((state) => state.currentScenario);
  const currentChallenge = useEvaluationStore((state) => state.currentChallenge);
  const currentScenarioIndex = useEvaluationStore((state) => state.currentScenarioIndex);
  const scenarios = useEvaluationStore((state) => state.scenarios);
  const animationStep = useEvaluationStore((state) => state.animationStep);
  const selectedAction = useEvaluationStore((state) => state.selectedAction);
  const decisionResult = useEvaluationStore((state) => state.decisionResult);
  const decisionSecondsRemaining = useEvaluationStore(
    (state) => state.decisionSecondsRemaining,
  );
  const advanceAnimation = useEvaluationStore((state) => state.advanceAnimation);
  const startDecisionTimer = useEvaluationStore((state) => state.startDecisionTimer);
  const tickDecisionTimer = useEvaluationStore((state) => state.tickDecisionTimer);
  const selectAction = useEvaluationStore((state) => state.selectAction);
  const clearSelectedAction = useEvaluationStore((state) => state.clearSelectedAction);
  const commitSelectedAction = useEvaluationStore((state) => state.commitSelectedAction);
  const nextScenario = useEvaluationStore((state) => state.nextScenario);
  const goDashboard = useEvaluationStore((state) => state.goDashboard);
  const [isAdvancingQuestion, setIsAdvancingQuestion] = useState(false);

  const tableView = buildPokerTableViewModel(scenario, animationStep);
  const isDecisionReady = tableView.decisionReady;
  const latestAction = animationStep > 0 ? scenario.previousActions[animationStep - 1] : null;
  const hasFoldThisStep = tableView.seats.some((s) => s.foldedThisStep);
  const hasBoardRevealNoBets =
    latestAction !== null &&
    isStreetRevealAction(latestAction) &&
    tableView.chipAnimation === null;
  const questionCount = currentChallenge?.evaluation?.questionCount ?? scenarios.length;
  const progressLabel = `${Math.min(currentScenarioIndex + 1, questionCount)}/${questionCount}`;
  const timerDanger = decisionSecondsRemaining <= 8;

  const handleConfirmAdvance = () => {
    if (isAdvancingQuestion) return;

    setIsAdvancingQuestion(true);
    window.setTimeout(async () => {
      const committed = await commitSelectedAction();
      if (!committed) {
        setIsAdvancingQuestion(false);
        return;
      }

      await nextScenario();
      setIsAdvancingQuestion(false);
    }, 980);
  };

  useEffect(() => {
    if (isDecisionReady || selectedAction) return undefined;

    const delay =
      animationStep === 0
        ? CHIP_ANIM.STEP_ADVANCE_BASE_MS
        : tableView.chipAnimation !== null || tableView.winAnimation !== null
          ? CHIP_ANIM.STEP_ADVANCE_COLLECT_MS
          : hasBoardRevealNoBets
            ? CHIP_ANIM.STEP_ADVANCE_BOARD_REVEAL_MS
            : hasFoldThisStep
              ? CHIP_ANIM.STEP_ADVANCE_FOLD_MS
              : CHIP_ANIM.STEP_ADVANCE_BASE_MS;

    const timer = window.setTimeout(() => {
      advanceAnimation();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    advanceAnimation,
    animationStep,
    hasBoardRevealNoBets,
    hasFoldThisStep,
    isDecisionReady,
    selectedAction,
    tableView.chipAnimation,
    tableView.winAnimation,
  ]);

  useEffect(() => {
    if (!isDecisionReady || decisionResult || selectedAction) return;

    startDecisionTimer();
  }, [decisionResult, isDecisionReady, selectedAction, startDecisionTimer]);

  useEffect(() => {
    if (!isDecisionReady || decisionResult || selectedAction) return undefined;

    const timer = window.setInterval(() => {
      tickDecisionTimer();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [decisionResult, isDecisionReady, selectedAction, tickDecisionTimer]);

  return (
    <main className="h-dvh overflow-hidden bg-aurora text-green">
      <section className="grid-shell h-full px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="mx-auto flex h-full max-w-[1680px] flex-col gap-2 sm:gap-3">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 hidden flex-wrap gap-2 sm:flex">
              {currentChallenge?.assignmentCode ? (
                <Badge className="border-green/45 text-green">
                  #{currentChallenge.assignmentCode}
                </Badge>
              ) : null}
              <Badge>{progressLabel}</Badge>
              <Badge>{scenario.gameType}</Badge>
              <Badge>{scenario.tableFormat}</Badge>
              <Badge>{scenario.blinds}</Badge>
              <Badge>{scenario.effectiveStack} BB effective</Badge>
            </div>
            <h1 className="truncate font-display text-sm font-black tracking-tight sm:text-2xl lg:text-3xl">
              {scenario.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              className={[
                "gap-1",
                timerDanger ? "border-red-300/45 text-red-100" : "border-green/45 text-green",
              ].join(" ")}
            >
              <Timer className="h-3.5 w-3.5" />
              {isDecisionReady && !decisionResult
                ? `${decisionSecondsRemaining}s`
                : "Loading"}
            </Badge>
            <Badge className="sm:hidden">{scenario.street}</Badge>
            <Button className="h-9 px-3 text-[10px] sm:h-11 sm:px-5 sm:text-sm" variant="secondary" onClick={goDashboard}>
              <ArrowLeft className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Lobby</span>
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_360px]">
          <section className="grid min-h-0 place-items-center">
            <PokerTableSurface
              scenario={scenario}
              tableView={tableView}
              animationStep={animationStep}
              selectedAction={selectedAction}
              decisionResult={decisionResult}
              isDecisionReady={isDecisionReady}
              isAdvancingQuestion={isAdvancingQuestion}
              onSelectAction={selectAction}
              onClearAction={clearSelectedAction}
              onContinue={handleConfirmAdvance}
            />
          </section>

          <aside className="hidden min-h-0 space-y-3 overflow-hidden xl:block">
            <ScorePanel compact />
            <ScenarioLog
              actions={scenario.previousActions}
              visibleCount={animationStep}
            />
          </aside>
        </div>
        </div>
      </section>
    </main>
  );
}

PokerTable.propTypes = {};
