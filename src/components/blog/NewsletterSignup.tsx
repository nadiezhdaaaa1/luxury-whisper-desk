import { useState } from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/newsletter.functions";
import { track } from "@/lib/analytics";

export function NewsletterSignup({
  source = "blog",
  className = "",
}: {
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    setError(null);

    const result = await subscribeNewsletter({ data: { email, source, website: null } });

    if (result.ok) {
      setStatus("success");
      setEmail("");
      track("newsletter_subscribed", { source });
    } else {
      setStatus("error");
      setError(result.error ?? "Something went wrong.");
    }
  };

  return (
    <div
      className={["rounded-2xl border border-hairline bg-surface p-6 sm:p-8", className].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Subscribe to PriceYou insights
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get one email a week on price signals, portfolio moves, and what we're building.
          </p>

          {status === "success" ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-positive">
              <CheckCircle2 className="h-4 w-4" />
              <span>You're subscribed — welcome aboard.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-full border border-hairline bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {/* Honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
                value=""
                readOnly
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-primary whitespace-nowrap disabled:opacity-60"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe"
                )}
              </button>
            </form>
          )}

          {status === "error" && error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}

          <p className="mt-3 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </div>
  );
}
