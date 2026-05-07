import { cn } from "../../lib/utils";

export function Progress({ value = 0, className }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        "h-2.5 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/10",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-felt-500 via-gold-400 to-gold-500 transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
