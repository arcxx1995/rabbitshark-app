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
  const folded = player.status === "Folded";
  const hasCards = (isHero && showCards) || (active && !folded);
  const cardDockClasses = {
    top: "bottom-[58%] left-1/2 h-16 -translate-x-1/2",
    bottom: "left-1/2 top-[58%] h-16 -translate-x-1/2",
    right: "left-[70%] top-1/2 h-14 -translate-y-1/2",
    left: "right-[70%] top-1/2 h-14 -translate-y-1/2",
  };
  const anchorClasses = {
    center: "-translate-x-1/2 -translate-y-1/2",
    "left-edge": "translate-x-0 -translate-y-1/2",
    "right-edge": "-translate-x-full -translate-y-1/2",
    "top-edge": "-translate-x-1/2 translate-y-0",
    "bottom-edge": "-translate-x-1/2 -translate-y-full",
  };

  return (
    <motion.div
      className={cn("absolute z-20 w-[11%]", anchorClasses[anchor])}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0.86, opacity: 0 }}
      animate={{ scale: 1, opacity: folded ? 0.42 : 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
    >
      {hasCards ? (
        <div
          className={cn(
          "pointer-events-none absolute z-0 overflow-hidden",
            cardDockClasses[cardDock],
          )}
        >
          <div className="flex gap-1">
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
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-20 h-11 rounded-md border px-2 py-1.5 text-center shadow-2xl transition duration-300",
          isHero
            ? "border-cyan-300/30 bg-gradient-to-br from-[#243347] to-[#151722]"
            : "border-white/8 bg-[#191a24]",
          active && !folded && "border-cyan-300/60 shadow-[0_0_28px_rgba(34,211,238,.28)] ring-2 ring-cyan-300/35",
          folded && "grayscale",
        )}
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
          {player.stackBB}
        </div>
      </div>
    </motion.div>
  );
}
