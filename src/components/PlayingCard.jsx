import { motion } from "framer-motion";
import { cn } from "../lib/utils";

const suitMap = {
  h: { symbol: "♥", label: "hearts", red: true },
  d: { symbol: "♦", label: "diamonds", red: true },
  c: { symbol: "♣", label: "clubs", red: false },
  s: { symbol: "♠", label: "spades", red: false },
};

export default function PlayingCard({
  card,
  hidden = false,
  small = false,
  boardSmall = false,
  seat = false,
  hero = false,
  delay = 0,
}) {
  const rank = card?.slice(0, -1) ?? "";
  const suitKey = card?.slice(-1).toLowerCase();
  const suit = suitMap[suitKey];
  const compactSeat = seat || small;

  return (
    <motion.div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl border shadow-card",
        seat && hero
          ? "h-14 w-10 text-sm sm:h-16 sm:w-11 sm:text-base"
          : seat
            ? "h-9 w-6 text-[10px] sm:h-10 sm:w-7 sm:text-[11px]"
            : small
              ? "h-8 w-6 text-[10px]"
              : boardSmall
                ? "h-16 w-11 text-sm sm:h-20 sm:w-14 sm:text-lg"
                : "h-14 w-10 text-base sm:h-24 sm:w-16 sm:text-xl",
        hidden
          ? "border-green/35 bg-gradient-to-br from-black via-[#003a2a] to-green"
          : "border-black/15 bg-[#f8f2df]",
      )}
      initial={{ y: -18, rotate: -5, opacity: 0 }}
      animate={{ y: 0, rotate: 0, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 18 }}
      aria-label={hidden ? "Face down card" : `${rank} of ${suit?.label}`}
    >
      {hidden ? (
        <div className="absolute inset-1 rounded-lg border border-green/45 bg-[radial-gradient(circle_at_50%_35%,rgba(0,255,171,.35),transparent_34%),repeating-linear-gradient(45deg,rgba(0,0,0,.42)_0_1px,transparent_1px_6px)]" />
      ) : (
        <>
          <div
            className={cn(
              compactSeat && hero
                ? "absolute left-1.5 top-1 text-[.68em] font-black leading-none"
                : compactSeat
                ? "absolute left-1 top-0.5 text-[.58em] font-black leading-[.9]"
                : "absolute left-1.5 top-1 text-[.72em] font-black leading-none",
              suit?.red ? "card-suit-red" : "card-suit-black",
            )}
          >
            <div>{rank}</div>
            <div>{suit?.symbol}</div>
          </div>
          <div
            className={cn(
              compactSeat && hero
                ? "mt-2 font-display text-[1.45em] font-black"
                : compactSeat
                ? "mt-1 font-display text-[1.05em] font-black"
                : "font-display text-[1.5em] font-black",
              suit?.red ? "card-suit-red" : "card-suit-black",
            )}
          >
            {suit?.symbol}
          </div>
          {compactSeat ? null : (
            <div
              className={cn(
                compactSeat && hero
                  ? "absolute bottom-1 right-1.5 rotate-180 text-[.68em] font-black leading-none"
                  : "absolute bottom-1 right-1.5 rotate-180 text-[.72em] font-black leading-none",
                suit?.red ? "card-suit-red" : "card-suit-black",
              )}
            >
              <div>{rank}</div>
              <div>{suit?.symbol}</div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
