import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 18h18" strokeLinecap="round" />
        <path d="M5 18V9l3.5 3L12 6l3.5 6L19 9v9" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="GrandStay Hotel home">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[1.45rem] font-semibold tracking-tight",
            light ? "text-espresso-foreground" : "text-foreground",
          )}
        >
          GrandStay
        </span>
        <span className="eyebrow mt-0.5 text-[0.55rem] tracking-[0.36em]">Hotel</span>
      </span>
    </Link>
  );
}
