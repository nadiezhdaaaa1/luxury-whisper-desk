import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { Input } from "@/components/ui/input";

const schema = z.string().trim().email("Enter a valid email address");

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
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-hairline">
        <div className="mx-auto w-full max-w-2xl px-5 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <span
            className="text-sm uppercase tracking-[0.05em] text-primary"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span className="font-semibold">LUX</span>
            <span className="font-normal">TRACKER</span>
          </span>
          <span className="w-8" />
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-md px-5 py-12">
        <div className="text-[10px] uppercase tracking-widest text-champagne">
          Almost there
        </div>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-medium tracking-tight">
          Where should we send your collection value report?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll use this to create your account and send the personalized report.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!error}
            className="shadow-none rounded-2xl h-12 px-4 bg-background border-hairline focus-visible:ring-0 focus-visible:border-champagne"
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
      </div>
    </div>
  );
}
