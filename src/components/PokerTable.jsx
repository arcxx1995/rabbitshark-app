import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Timer } from "lucide-react";
import ActionPanel from "./ActionPanel";
import PlayerSeat from "./PlayerSeat";
import PlayingCard from "./PlayingCard";
import ScenarioLog from "./ScenarioLog";
import ScorePanel from "./ScorePanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getBetChipPosition } from "../config/betChipLayouts";
import { tableCenterLayout } from "../config/tableCenterLayout";
import { seatLayouts } from "../config/seatLayouts";
import { useEvaluationStore } from "../store/useEvaluationStore";

const positionOrders = {
  "6-max": ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  "9-max": ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
};

function parseBigBlind(blinds) {
  const bigBlindToken = blinds.split("/")[1] ?? blinds;
  const normalized = bigBlindToken.trim().toLowerCase();
  const multiplier = normalized.endsWith("k") ? 1000 : 1;
  const number = Number.parseFloat(normalized.replace("k", ""));

  return Number.isFinite(number) && number > 0 ? number * multiplier : 1;
}

function formatStackInBB(stack, blinds) {
  const bigBlind = parseBigBlind(blinds);
  const value = stack / bigBlind;
  const rounded = Number.isInteger(value) ? value : value.toFixed(1);

  return `${rounded} BB`;
}

function getVisibleBoard(scenario, animationStep) {
  const structuredReveal = scenario.revealSteps?.find(
    (step) => step.animationStep === animationStep,
  );

  if (structuredReveal?.boardCount !== undefined) {
    return scenario.board.slice(0, structuredReveal.boardCount);
  }

  const flopIndex = scenario.previousActions.findIndex((action) =>
    action.toLowerCase().includes("flop comes"),
  );
  const turnIndex = scenario.previousActions.findIndex((action) =>
    action.toLowerCase().includes("turn comes"),
  );
  const riverIndex = scenario.previousActions.findIndex((action) =>
    action.toLowerCase().includes("river comes"),
  );

  if (scenario.street === "Preflop") return [];
  if (riverIndex >= 0 && animationStep > riverIndex) return scenario.board.slice(0, 5);
  if (turnIndex >= 0 && animationStep > turnIndex) return scenario.board.slice(0, 4);
  if (flopIndex >= 0 && animationStep > flopIndex) return scenario.board.slice(0, 3);
  if (animationStep >= scenario.previousActions.length) return scenario.board;
  return [];
}

function buildSeatList(scenario) {
  const villains = Array.isArray(scenario.villains) ? scenario.villains : [];
  const players = [
    {
      ...scenario.hero,
      isHero: true,
      stackBB: formatStackInBB(scenario.hero.stack, scenario.blinds),
    },
    ...villains.map((villain) => ({
      ...villain,
      isHero: false,
      stackBB: formatStackInBB(villain.stack, scenario.blinds),
    })),
  ];
  const positionOrder = positionOrders[scenario.tableFormat];

  if (!positionOrder?.includes(scenario.hero.position)) {
    return players;
  }

  const rotatedPositions = [
    ...positionOrder.slice(positionOrder.indexOf(scenario.hero.position)),
    ...positionOrder.slice(0, positionOrder.indexOf(scenario.hero.position)),
  ];

  return rotatedPositions
    .map((position) => players.find((player) => player.position === position))
    .filter(Boolean);
}

function coordinateStyle(position) {
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
  };
}

function parseActionAmount(action) {
  if (!/\b(bets?|raises?|calls?|posts?|3-bets?)\b/i.test(action)) return null;

  const numberMatches = action.match(/\d+(?:\.\d+)?/g);
  if (!numberMatches?.length) return null;

  return `${numberMatches[numberMatches.length - 1]} BB`;
}

function getActionActor(action, seats) {
  const normalizedAction = action.toLowerCase();

  return seats.find((player) => {
    return (
      normalizedAction.includes(String(player.position).toLowerCase()) ||
      normalizedAction.includes(String(player.name).toLowerCase())
    );
  });
}

function isStreetRevealAction(action) {
  return /\b(flop|turn|river)\b/i.test(action);
}

function getBetForAction(action, seats, positions, tableFormat) {
  const amount = parseActionAmount(action);
  if (!amount) return null;

  const actor = getActionActor(action, seats) ?? seats.find((player) => player.isHero);
  const actorIndex = seats.findIndex((player) => player === actor);
  const origin = positions[actorIndex];

  if (!origin) return null;

  return {
    id: actor?.position ?? actor?.name ?? `seat-${actorIndex}`,
    amount,
    from: origin,
    spot: getBetChipPosition(tableFormat, origin),
  };
}

function buildVisibleBets(actions, seats, positions, tableFormat) {
  const bets = new Map();

  actions.forEach((action) => {
    if (isStreetRevealAction(action)) {
      bets.clear();
      return;
    }

    const bet = getBetForAction(action, seats, positions, tableFormat);
    if (bet) {
      bets.set(bet.id, bet);
    }
  });

  return [...bets.values()];
}

function buildTableViewModel(scenario, animationStep) {
  const positions = seatLayouts[scenario.tableFormat] ?? seatLayouts["6-max"];
  const seats = buildSeatList(scenario).slice(0, positions.length);
  const visibleActions = scenario.previousActions.slice(0, animationStep);
  const latestAction =
    animationStep > 0 ? scenario.previousActions[animationStep - 1] : null;
  const tableBets = buildVisibleBets(
    visibleActions,
    seats,
    positions,
    scenario.tableFormat,
  );
  const previousTableBets = buildVisibleBets(
    scenario.previousActions.slice(0, Math.max(animationStep - 1, 0)),
    seats,
    positions,
    scenario.tableFormat,
  );

  return {
    positions,
    seats,
    visibleBoard: getVisibleBoard(scenario, animationStep),
    decisionReady: animationStep >= scenario.previousActions.length,
    tableBets,
    chipAnimation:
      latestAction && isStreetRevealAction(latestAction) && previousTableBets.length > 0
        ? {
            type: "collect",
            bets: previousTableBets,
          }
        : null,
  };
}

function ChipMarker({ amount }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-green/35 bg-black/75 px-3 py-1.5 text-green shadow-[0_0_28px_rgba(0,255,171,.24)]">
      <div className="relative h-4 w-7">
        {[0, 1, 2].map((chip) => (
          <span
            key={chip}
            className="absolute left-0 h-2 w-7 rounded-full border border-black/40 bg-green"
            style={{ bottom: chip * 3 }}
          >
            <span className="absolute inset-x-2 top-1 h-px bg-black/30" />
          </span>
        ))}
      </div>
      <span className="font-display text-xs font-black tracking-[0.12em]">
        {amount}
      </span>
    </div>
  );
}

function TableBetChips({ bets }) {
  return bets.map((bet) => (
    <motion.div
      key={`table-bet-${bet.id}-${bet.amount}`}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      initial={{
        left: `${bet.from.x}%`,
        top: `${bet.from.y}%`,
        scale: 0.82,
        opacity: 1,
      }}
      animate={{
        left: `${bet.spot.x}%`,
        top: `${bet.spot.y}%`,
        scale: 1,
        opacity: 1,
      }}
      transition={{ duration: 0.58, ease: "easeInOut" }}
    >
      <ChipMarker amount={bet.amount} />
    </motion.div>
  ));
}

function AnimatedChipMovement({ animation }) {
  if (!animation) return null;

  return animation.bets.map((bet) => {
    const isCollecting = animation.type === "collect";
    const from = isCollecting ? bet.spot : bet.from;
    const to = isCollecting ? tableCenterLayout.pot : bet.spot;

    return (
      <motion.div
        key={`${animation.type}-${bet.id}-${bet.amount}-${from.x}-${from.y}`}
        className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
        initial={{
          left: `${from.x}%`,
          top: `${from.y}%`,
          scale: 1,
          opacity: 1,
        }}
        animate={{
          left: `${to.x}%`,
          top: `${to.y}%`,
          scale: 1,
          opacity: isCollecting ? [1, 1, 0] : 1,
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.72, ease: "easeInOut" }}
      >
        <ChipMarker amount={bet.amount} />
      </motion.div>
    );
  });
}

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
  const nextScenario = useEvaluationStore((state) => state.nextScenario);
  const goDashboard = useEvaluationStore((state) => state.goDashboard);

  const tableView = buildTableViewModel(scenario, animationStep);
  const isDecisionReady = tableView.decisionReady;
  const questionCount = currentChallenge?.evaluation?.questionCount ?? scenarios.length;
  const progressLabel = `${Math.min(currentScenarioIndex + 1, questionCount)}/${questionCount}`;
  const timerDanger = decisionSecondsRemaining <= 8;

  useEffect(() => {
    if (isDecisionReady || selectedAction) return undefined;

    const timer = window.setTimeout(() => {
      advanceAnimation();
    }, animationStep === 0 ? 650 : 820);

    return () => window.clearTimeout(timer);
  }, [advanceAnimation, animationStep, isDecisionReady, selectedAction]);

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
            <div className="relative aspect-[16/10] max-h-[calc(100dvh-72px)] w-full max-w-[1280px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/60 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(0,255,171,.16),transparent_32%)]" />
              <motion.div
                className="absolute bottom-[25%] left-[9.2%] right-[9.2%] top-[11.8%] rounded-full border border-green/25 table-surface-texture shadow-table ring-[16px] ring-white/5"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 90, damping: 18 }}
              >
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                  style={coordinateStyle(tableCenterLayout.street)}
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge className="border-green/45 text-green">
                      {scenario.street}
                    </Badge>
                  </div>
                </div>

                <div
                  className="absolute min-w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/20 px-3 py-1.5 text-center"
                  style={coordinateStyle(tableCenterLayout.pot)}
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                    Pot
                  </div>
                  <div className="font-display text-2xl font-black leading-none text-green sm:text-3xl">
                    {scenario.pot}
                  </div>
                </div>

                <div
                  className="absolute flex min-h-20 w-[70%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2.5"
                  style={coordinateStyle(tableCenterLayout.board)}
                >
                  <AnimatePresence mode="popLayout">
                    {tableView.visibleBoard.length > 0
                      ? tableView.visibleBoard.map((card, index) => (
                          <PlayingCard
                            key={card}
                            card={card}
                            boardSmall
                            delay={index * 0.08}
                          />
                        ))
                      : [0, 1, 2].map((slot) => (
                          <div
                            key={slot}
                            className="h-16 w-11 rounded-xl border border-dashed border-white/15 bg-black/12 sm:h-20 sm:w-14"
                          />
                        ))}
                  </AnimatePresence>
                </div>
              </motion.div>

              <TableBetChips bets={tableView.tableBets} />

              <AnimatePresence mode="wait">
                <AnimatedChipMovement
                  key={`chips-${animationStep}`}
                  animation={tableView.chipAnimation}
                />
              </AnimatePresence>

                {tableView.seats.map((player, index) => (
                  <PlayerSeat
                    key={`${player.position}-${player.name}`}
                    player={player}
                    position={tableView.positions[index]}
                    anchor={tableView.positions[index].anchor}
                    cardDock={tableView.positions[index].cardDock}
                    isHero={player.isHero}
                    showCards={player.isHero && animationStep >= 1}
                    active={player.isHero ? isDecisionReady : player.status === "Active"}
                    isDealer={player.position === "BTN"}
                  />
                ))}

              <div className="absolute inset-x-4 bottom-5 z-40 sm:inset-x-6 sm:bottom-6">
                <ActionPanel
                  scenario={scenario}
                  disabled={!isDecisionReady || Boolean(decisionResult)}
                  selectedAction={selectedAction}
                  decisionResult={decisionResult}
                  onSelectAction={selectAction}
                  onContinue={nextScenario}
                  compact
                />
              </div>
            </div>
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
