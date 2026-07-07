import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";

const schema = z.string().trim().email("Enter a valid email address");

const TOTAL_STEPS = 3;

export function EmailGate({
  initial,
  onSubmit,
  onBack,
}: {
  initial?: string;
  onSubmit: (email: string) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* Header + progress matching the quiz screens */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-2">
          <div className="flex items-center justify-center">
            <span
              className="text-[1.35rem] leading-none uppercase tracking-[0.05em] text-primary"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <span className="font-semibold">LUX</span>
              <span className="font-normal">TRACKER</span>
            </span>
          </div>
          <div className="mt-5 flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full bg-primary transition-colors duration-500"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-3xl px-2 pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="min-h-[420px] px-3 sm:px-4">
          <div>
            <span className="eyebrow">Almost there</span>
            <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
              Where should we send your collection value report?
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              We'll use this to create your account and send the personalized report.
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-3" noValidate>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!error}
              className="shadow-none rounded-2xl h-12 px-4 bg-white border-hairline focus-visible:ring-0 focus-visible:border-primary"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <button type="submit" className="btn-primary w-full">
              Reveal my preview
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              We won't spam you. See our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-primary font-medium hover:underline px-2"
            >
              Back to site
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="btn-ghost inline-flex items-center gap-1.5 min-w-[120px] pl-4 pr-5"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

