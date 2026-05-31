import { cn } from "../../lib/utils";

const variants = {
  default:
    "bg-green text-black hover:bg-white shadow-[0_14px_34px_rgba(0,255,171,.2)]",
  secondary:
    "border border-green/25 bg-white/5 text-green hover:bg-white/10 hover:text-green",
  ghost: "text-white/72 hover:bg-white/10 hover:text-green",
  danger: "border border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/18",
  selected: "border border-green bg-green text-black hover:bg-white shadow-glow",
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
        "inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.14em] transition duration-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
