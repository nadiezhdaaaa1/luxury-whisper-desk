// Shared visual shell for the auth surfaces (/login, /signup) and the
// registration modal. Visual only — no auth logic lives here.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";

/** Logo row (44px) with the CLOSE control at the right. */
export function AuthHeader() {
  return (
    <div className="flex h-11 items-center justify-between">
      <Link to="/" aria-label="PriceYou home" className="inline-flex items-center leading-none">
        <Logo svgClassName="h-7 w-[121.86px]" />
      </Link>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-foreground"
        aria-label="Close and go to home page"
      >
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.6px] leading-none">
          Close
        </span>
        <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );
}

/** Inner card surface used by both the auth pages and the registration modal. */
export const authCardInnerClass =
  "rounded-[16px] border border-white p-[25px] shadow-[0_1px_2px_rgba(29,20,13,0.04),0_8px_24px_rgba(29,20,13,0.06)]";

/** Two-layer card: tinted outer wrapper + translucent white inner card. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[24px] bg-[#edf4f9] p-3">
      <div className={`${authCardInnerClass} bg-white/80`}>{children}</div>
    </div>
  );
}

/** Hairline rules with an OR label between them. */
export function AuthOrDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 ${className}`}>
      <div className="h-px flex-1 bg-[#cfdbe2]" />
      <span className="text-[10px] uppercase tracking-[1px] text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-[#cfdbe2]" />
    </div>
  );
}
