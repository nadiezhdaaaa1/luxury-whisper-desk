// Shared header for the public quiz flow surfaces (quiz steps, A-ha, plans).
// Logo on the left, CLOSE control on the right — identical to /login.
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";

export function QuizHeader() {
  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 pt-8">
        <div className="flex h-11 items-center justify-between">
          <Logo className="text-[28px]" />
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
      </div>
    </div>
  );
}
