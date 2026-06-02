import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import ActionPanel from "./ActionPanel";
import PlayerSeat from "./PlayerSeat";
import PlayingCard from "./PlayingCard";
import ScenarioLog from "./ScenarioLog";
import ScorePanel from "./ScorePanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
  const players = [
    {
      ...scenario.hero,
      isHero: true,
      stackBB: formatStackInBB(scenario.hero.stack, scenario.blinds),
    },
    ...scenario.villains.map((villain) => ({
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

export default function PokerTable() {
  const scenario = useEvaluationStore((state) => state.currentScenario);
  const animationStep = useEvaluationStore((state) => state.animationStep);
  const selectedAction = useEvaluationStore((state) => state.selectedAction);
  const advanceAnimation = useEvaluationStore((state) => state.advanceAnimation);
  const selectAction = useEvaluationStore((state) => state.selectAction);
  const goDashboard = useEvaluationStore((state) => state.goDashboard);

  const isDecisionReady = animationStep >= scenario.previousActions.length;
  const visibleBoard = getVisibleBoard(scenario, animationStep);
  const positions = seatLayouts[scenario.tableFormat] ?? seatLayouts["6-max"];
  const seats = buildSeatList(scenario);

  useEffect(() => {
    if (isDecisionReady || selectedAction) return undefined;

    const timer = window.setTimeout(() => {
      advanceAnimation();
    }, animationStep === 0 ? 650 : 820);

    return () => window.clearTimeout(timer);
  }, [advanceAnimation, animationStep, isDecisionReady, selectedAction]);

  return (
    <main className="h-dvh overflow-hidden bg-aurora text-green">
      <section className="grid-shell h-full px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="mx-auto flex h-full max-w-[1680px] flex-col gap-2 sm:gap-3">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 hidden flex-wrap gap-2 sm:flex">
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
                    {visibleBoard.length > 0
                      ? visibleBoard.map((card, index) => (
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

                {seats.slice(0, positions.length).map((player, index) => (
                  <PlayerSeat
                    key={`${player.position}-${player.name}`}
                    player={player}
                    position={positions[index]}
                    anchor={positions[index].anchor}
                    cardDock={positions[index].cardDock}
                    isHero={player.isHero}
                    showCards={player.isHero && animationStep >= 1}
                    active={player.isHero ? isDecisionReady : player.status === "Active"}
                    isDealer={player.position === "BTN"}
                  />
                ))}

              <div className="absolute inset-x-4 bottom-5 z-40 sm:inset-x-6 sm:bottom-6">
                <ActionPanel
                  scenario={scenario}
                  disabled={!isDecisionReady}
                  selectedAction={selectedAction}
                  onSelectAction={selectAction}
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
