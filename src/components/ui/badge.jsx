import { cn } from "../../lib/utils";

export function Badge({ className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/72",
        className,
      )}
    >
      {children}
    </span>
  );
}
