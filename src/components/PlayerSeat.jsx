import PropTypes from "prop-types";
import { motion } from "framer-motion";
import PlayingCard from "./PlayingCard";
import { cn } from "../lib/utils";

export default function PlayerSeat({
  player,
  isHero = false,
  isDealer = false,
  position,
  anchor = "center",
  cardDock = "top",
  showCards = false,
  active = false,
}) {
  const folded = player.status === "Folded" || player.folded;
  const foldedThisStep = Boolean(player.foldedThisStep);
  const hasCards =
    (isHero && showCards) || (active && !folded) || foldedThisStep;
  const cardDockClasses = {
    top: "left-1/2 top-0 -translate-x-1/2",
    "top-inset": "left-1/2 top-0 -translate-x-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2",
    right: "right-0 top-1/2 -translate-y-1/2",
    left: "left-0 top-1/2 -translate-y-1/2",
  };
  const anchorClasses = {
    center: "-translate-x-1/2 -translate-y-1/2",
    "left-edge": "translate-x-0 -translate-y-1/2",
    "right-edge": "-translate-x-full -translate-y-1/2",
    "top-edge": "-translate-x-1/2 translate-y-0",
    "bottom-edge": "-translate-x-1/2 -translate-y-full",
  };

  return (
    <div
      className={cn(
        "absolute z-20 h-[clamp(5rem,13.5cqw,6.75rem)] w-[clamp(5.25rem,11cqw,8.75rem)]",
        anchorClasses[anchor],
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <motion.div
        className="relative h-full w-full"
        initial={false}
        animate={{
          scale: foldedThisStep ? [1, 0.94, 1] : 1,
          opacity: 1,
        }}
        transition={{
          duration: foldedThisStep ? 0.58 : undefined,
          type: foldedThisStep ? "tween" : "spring",
          stiffness: 180,
          damping: 18,
        }}
      >
        {hasCards ? (
          <div
            className={cn(
              "pointer-events-none absolute flex h-[clamp(2.25rem,3.8cqw,3rem)] w-full justify-center overflow-visible sm:h-[clamp(2.75rem,4.2cqw,3.5rem)]",
              "z-10",
              cardDockClasses[cardDock],
            )}
          >
            <motion.div
              className="flex gap-1"
              animate={
                foldedThisStep
                  ? {
                      y: [0, 18, 30],
                      opacity: [1, 1, 0],
                      scale: [1, 0.96, 0.9],
                    }
                  : { y: 0, opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.54, ease: "easeInOut" }}
            >
              {isHero && showCards
                ? player.cards.map((card, index) => (
                    <PlayingCard
                      key={card}
                      card={card}
                      seat
                      hero={isHero}
                      delay={index * 0.08}
                    />
                  ))
                : [0, 1].map((card) => (
                    <PlayingCard key={card} hidden seat delay={card * 0.08} />
                  ))}
            </motion.div>
          </div>
        ) : null}

        <motion.div
          className={cn(
            "absolute inset-x-0 top-[clamp(2.65rem,7cqw,3.5rem)] z-20 h-[clamp(2.35rem,5.8cqw,2.75rem)] rounded-md border px-2 py-1.5 text-center shadow-2xl transition duration-300",
            isHero
              ? "border-cyan-300/30 bg-gradient-to-br from-[#243347] to-[#151722]"
              : "border-white/8 bg-[#191a24]",
            active &&
              !folded &&
              "border-cyan-300/60 shadow-[0_0_28px_rgba(34,211,238,.28)] ring-2 ring-cyan-300/35",
            folded && "border-white/10 bg-[#12131a] grayscale",
            foldedThisStep && "ring-2 ring-white/20",
          )}
          initial={false}
          animate={{ opacity: folded ? 0.62 : 1 }}
          transition={
            foldedThisStep ? { duration: 0.4, ease: "easeInOut" } : { duration: 0 }
          }
        >
          {isDealer ? (
            <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border border-black/30 bg-white text-[10px] font-black text-room-950 shadow-lg">
              D
            </span>
          ) : null}

          <div className="relative z-30 truncate font-display text-[clamp(9px,0.78vw,12px)] font-bold leading-snug text-white">
            {player.name} <span className="text-white/52">({player.position})</span>
          </div>
          <div className="relative z-30 mt-1 px-1 font-display text-[clamp(9px,0.82vw,12px)] font-black leading-none text-gold-400">
            {folded ? "FOLDED" : player.stackBB}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

PlayerSeat.propTypes = {
  player: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.string,
    status: PropTypes.string,
    folded: PropTypes.bool,
    foldedThisStep: PropTypes.bool,
    stackBB: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cards: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  isHero: PropTypes.bool,
  isDealer: PropTypes.bool,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  anchor: PropTypes.oneOf(["center", "left-edge", "right-edge", "top-edge", "bottom-edge"]),
  cardDock: PropTypes.oneOf(["top", "top-inset", "bottom", "right", "left"]),
  showCards: PropTypes.bool,
  active: PropTypes.bool,
};
