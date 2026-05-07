import { cn } from "../../lib/utils";

const variants = {
  default:
    "bg-gold-500 text-room-950 hover:bg-gold-400 shadow-[0_14px_34px_rgba(216,185,104,.22)]",
  secondary:
    "bg-white/10 text-white hover:bg-white/16 border border-white/12",
  ghost: "text-white/75 hover:bg-white/10 hover:text-white",
  danger: "bg-danger-500 text-white hover:bg-red-400",
  felt: "bg-felt-700 text-white hover:bg-felt-500 shadow-glow",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.14em] transition duration-200 disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
