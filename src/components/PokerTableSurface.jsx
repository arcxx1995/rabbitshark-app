import PropTypes from "prop-types";
import { AnimatePresence, motion } from "framer-motion";
import ActionPanel from "./ActionPanel";
import PlayerSeat from "./PlayerSeat";
import PlayingCard from "./PlayingCard";
import { tableCenterLayout } from "../config/tableCenterLayout";
import { buildSelectedActionMovement } from "../engine/pokerEngine";
import { cn } from "../lib/utils";

// Shared animation timing constants. All *_MS values are milliseconds; divide
// by 1000 when passing to framer-motion transition.duration (which expects seconds).
const CHIP_ANIM = {
  BET_PLACE_MS: 580,
  COLLECT_MS: 720,
  HERO_PREVIEW_MS: 720,
};

function ChipMarker({ amount, isAllIn = false }) {
  // All-in bets get a red/danger border and an extra chip layer to signal
  // the full stack is committed. Normal bets use the standard green style.
  const chipCount = isAllIn ? 4 : 3;
  const borderClass = isAllIn
    ? "border-red-400/60 shadow-[0_0_28px_rgba(248,113,113,.32)] text-red-300"
    : "border-green/35 shadow-[0_0_28px_rgba(0,255,171,.24)] text-green";
  const chipColor = isAllIn ? "bg-red-400" : "bg-green";

  return (
    <div className={`flex items-center gap-2 rounded-full border bg-black/75 px-3 py-1.5 ${borderClass}`}>
      <div className={cn("relative w-7", isAllIn ? "h-[18px]" : "h-4")}>
        {Array.from({ length: chipCount }, (_, chip) => (
          <span
            key={chip}
            // Chip stack offset is computed at runtime; Tailwind JIT cannot
            // statically analyse interpolated arbitrary classes like [bottom:Xpx].
            style={{ bottom: `${chip * 3}px` }}
            className={`absolute left-0 h-2 w-7 rounded-full border border-black/40 ${chipColor}`}
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

ChipMarker.propTypes = {
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  isAllIn: PropTypes.bool,
};

function TableBetChips({ bets, animate = true }) {
  return bets.map((bet) => (
    <motion.div
      key={`table-bet-${bet.id}-${bet.amount}`}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      initial={{
        left: `${animate ? bet.from.x : bet.spot.x}%`,
        top: `${animate ? bet.from.y : bet.spot.y}%`,
        scale: animate ? 0.82 : 1,
        opacity: 1,
      }}
      animate={{
        left: `${bet.spot.x}%`,
        top: `${bet.spot.y}%`,
        scale: [0.86, 1.04, 1],
        opacity: 1,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: CHIP_ANIM.BET_PLACE_MS / 1000, ease: "easeInOut" }}
    >
      <ChipMarker amount={bet.amount} isAllIn={bet.isAllIn} />
    </motion.div>
  ));
}

TableBetChips.propTypes = {
  bets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      isAllIn: PropTypes.bool,
      from: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
      spot: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
    }),
  ).isRequired,
  animate: PropTypes.bool,
};

function AnimatedChipMovement({ animation }) {
  if (!animation) return null;

  return animation.bets.map((bet) => {
    const isCollecting = animation.type === "collect";
    const from = isCollecting ? bet.spot : bet.from;
    const to = isCollecting ? animation.target ?? tableCenterLayout.pot : bet.spot;

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
        transition={{ duration: CHIP_ANIM.COLLECT_MS / 1000, ease: "easeInOut" }}
      >
        <ChipMarker amount={bet.amount} />
      </motion.div>
    );
  });
}

AnimatedChipMovement.propTypes = {
  animation: PropTypes.shape({
    type: PropTypes.string.isRequired,
    target: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    bets: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        from: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
        spot: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
      }),
    ).isRequired,
  }),
};

// Animates a chip group from the pot to the winner's seat position — reverse
// of collect. Fires on win/collect actions resolved by the engine.
function AnimatedWinMovement({ winAnimation }) {
  if (!winAnimation) return null;

  const { potPosition, winnerPosition } = winAnimation;

  return (
    <motion.div
      key={`win-${winAnimation.winner.position}`}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
      initial={{
        left: `${potPosition.x}%`,
        top: `${potPosition.y}%`,
        scale: 0.86,
        opacity: 0,
      }}
      animate={{
        left: `${winnerPosition.x}%`,
        top: `${winnerPosition.y}%`,
        scale: [0.86, 1.04, 1],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: CHIP_ANIM.COLLECT_MS / 1000, ease: "easeInOut" }}
    >
      <ChipMarker amount="POT" />
    </motion.div>
  );
}

AnimatedWinMovement.propTypes = {
  winAnimation: PropTypes.shape({
    winner: PropTypes.shape({ position: PropTypes.string }).isRequired,
    potPosition: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
    winnerPosition: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
  }),
};

function ActionCue({ action }) {
  if (!action) return null;

  const isTableCue = !action.actor || action.type === "street" || action.type === "info";
  const cuePosition = isTableCue ? tableCenterLayout.street : action.position;
  const toneClass =
    {
      "all-in": "border-red-400/60 bg-red-950/80 text-red-100",
      call: "border-cyan-300/45 bg-cyan-950/80 text-cyan-100",
      check: "border-white/25 bg-black/75 text-white",
      fold: "border-white/20 bg-black/75 text-white/75",
      info: "border-green/25 bg-black/75 text-green",
      street: "border-gold-300/45 bg-black/80 text-gold-300",
      wager: "border-green/35 bg-black/75 text-green",
      win: "border-gold-300/55 bg-black/80 text-gold-300",
    }[action.type] ?? "border-green/25 bg-black/75 text-green";

  return (
    <motion.div
      key={`${action.sourceIndex}-${action.label}`}
      className={cn(
        "pointer-events-none absolute z-[35] max-w-[min(18rem,45%)] -translate-x-1/2 -translate-y-1/2 rounded-md border px-3 py-1.5 text-center font-display text-[10px] font-black uppercase tracking-[0.12em] shadow-2xl sm:text-xs",
        toneClass,
      )}
      style={{ left: `${cuePosition.x}%`, top: `${cuePosition.y}%` }}
      initial={{ y: -6, scale: 0.92, opacity: 0 }}
      animate={{ y: 0, scale: [0.96, 1.04, 1], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.72, ease: "easeInOut" }}
    >
      <span className="block truncate">{action.label}</span>
    </motion.div>
  );
}

ActionCue.propTypes = {
  action: PropTypes.shape({
    actor: PropTypes.object,
    label: PropTypes.string.isRequired,
    position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    sourceIndex: PropTypes.number,
    type: PropTypes.string.isRequired,
  }),
};

function SelectedActionMovement({ action, heroPosition, tableFormat, scenario }) {
  if (!action || !heroPosition) return null;

  const movement = buildSelectedActionMovement(
    action,
    heroPosition,
    tableFormat,
    scenario,
  );

  if (!movement) return null;

  return (
    <motion.div
      key={`selected-action-${action.label}`}
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
      initial={{
        left: `${heroPosition.x}%`,
        top: `${heroPosition.y}%`,
        scale: 0.86,
        opacity: 0,
      }}
      animate={{
        left: `${movement.target.x}%`,
        top: `${movement.target.y}%`,
        scale: [0.86, 1.04, 1],
        opacity: 1,
      }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: CHIP_ANIM.HERO_PREVIEW_MS / 1000, ease: "easeInOut" }}
    >
      <ChipMarker amount={movement.amount} />
    </motion.div>
  );
}

SelectedActionMovement.propTypes = {
  action: PropTypes.shape({ label: PropTypes.string }),
  heroPosition: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  tableFormat: PropTypes.string,
  scenario: PropTypes.object,
};

export function PokerTableSurface({
  scenario,
  tableView,
  animationStep,
  selectedAction = null,
  decisionResult = null,
  isDecisionReady = false,
  isAdvancingQuestion = false,
  onSelectAction,
  onClearAction,
  onContinue,
  animateTableBets = true,
  showActionPanel = true,
}) {
  const heroPosition = tableView.heroPosition;

  return (
    <motion.div
      key={scenario.id}
      className="relative aspect-[16/10] max-h-[calc(100dvh-72px)] w-full max-w-[1280px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/60 shadow-2xl"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{
        opacity: isAdvancingQuestion ? 0.62 : 1,
        scale: isAdvancingQuestion ? 0.992 : 1,
      }}
      transition={{ duration: 0.34, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(0,255,171,.16),transparent_32%)]" />
      <motion.div
        className="absolute bottom-[25%] left-[9.2%] right-[9.2%] top-[11.8%] rounded-full border border-green/25 table-surface-texture shadow-table ring-[16px] ring-white/5"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <motion.div
          // Pulse the pot display when chips are being collected into it.
          key={`pot-${animationStep}`}
          className="absolute left-[47.5%] top-[31.5%] min-w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/20 px-3 py-1.5 text-center"
          animate={
            tableView.chipAnimation?.type === "collect"
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
          }
          transition={{ duration: CHIP_ANIM.COLLECT_MS / 1000, ease: "easeInOut" }}
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
            Pot
          </div>
          <div className="font-display text-2xl font-black leading-none text-green sm:text-3xl">
            {scenario.pot}
          </div>
        </motion.div>

        <div
          className="absolute left-[53%] top-[61%] flex min-h-20 w-[70%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2.5"
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

      <AnimatePresence>
        <TableBetChips bets={tableView.tableBets} animate={animateTableBets} />
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <AnimatedChipMovement
          key={`chips-${animationStep}`}
          animation={tableView.chipAnimation}
        />
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <AnimatedWinMovement
          key={`win-${animationStep}`}
          winAnimation={tableView.winAnimation}
        />
      </AnimatePresence>

      <AnimatePresence>
        <ActionCue action={tableView.latestAction} />
      </AnimatePresence>

      <AnimatePresence>
        {isAdvancingQuestion ? (
          <SelectedActionMovement
            action={selectedAction}
            heroPosition={heroPosition}
            tableFormat={scenario.tableFormat}
            scenario={scenario}
          />
        ) : null}
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
          active={
            player.activeThisStep ||
            (player.isHero ? isDecisionReady : player.status === "Active")
          }
          isDealer={player.position === "BTN"}
        />
      ))}

      {showActionPanel ? (
        <div className="absolute inset-x-4 bottom-5 z-40 sm:inset-x-6 sm:bottom-6">
          <ActionPanel
            scenario={scenario}
            disabled={!isDecisionReady || Boolean(decisionResult)}
            selectedAction={selectedAction}
            decisionResult={decisionResult}
            onSelectAction={onSelectAction}
            onClearAction={onClearAction}
            onContinue={onContinue}
            advancing={isAdvancingQuestion}
            compact
          />
        </div>
      ) : null}
    </motion.div>
  );
}

PokerTableSurface.propTypes = {
  scenario: PropTypes.shape({
    id: PropTypes.string.isRequired,
    pot: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tableFormat: PropTypes.string,
  }).isRequired,
  tableView: PropTypes.shape({
    heroPosition: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    tableBets: PropTypes.array.isRequired,
    chipAnimation: PropTypes.object,
    winAnimation: PropTypes.object,
    latestAction: PropTypes.object,
    visibleBoard: PropTypes.array.isRequired,
    seats: PropTypes.array.isRequired,
    positions: PropTypes.array.isRequired,
    decisionReady: PropTypes.bool,
  }).isRequired,
  animationStep: PropTypes.number.isRequired,
  selectedAction: PropTypes.shape({ label: PropTypes.string }),
  decisionResult: PropTypes.object,
  isDecisionReady: PropTypes.bool,
  isAdvancingQuestion: PropTypes.bool,
  onSelectAction: PropTypes.func.isRequired,
  onClearAction: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  animateTableBets: PropTypes.bool,
  showActionPanel: PropTypes.bool,
};
