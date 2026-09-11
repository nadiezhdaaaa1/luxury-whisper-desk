import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/preferences")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Email preferences — PriceYou" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreferencesPage,
});

function PreferencesPage() {
  // Read and keep the token: emails link here as /preferences?token=...
  // It is never sent anywhere or logged.
  Route.useSearch();

  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unsubscribe() {
    if (busy) return;
    setError(null);
    // Signed out: prototype mock, nothing to write.
    if (!user?.id) {
      setDone(true);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.from("notification_settings").upsert(
      {
        user_id: user.id,
        price_alerts: false,
        weekly_digest: false,
        product_news: false,
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (err) {
      setError("We couldn't save that just now. Please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-16">
      <div className="mx-auto w-full max-w-[448px] text-left">
        <Link to="/" aria-label="PriceYou home" className="inline-flex">
          <Logo className="text-2xl text-foreground" />
        </Link>

        <div aria-live="polite" className="mt-10">
          {done ? (
            <>
              <h1 className="font-display text-[30px] leading-tight text-foreground">
                <span className="font-display font-bold">Done - no more emails from us</span>
              </h1>
              <p className="mt-4 text-[18px] leading-relaxed text-muted-foreground">
                We won't email you alerts or updates anymore. Your alerts are still saved — turn
                them back on anytime in your account.
              </p>
              <p className="mt-6 text-sm text-muted-foreground">
                <Link to="/login" className="underline text-foreground">
                  Log in
                </Link>{" "}
                to manage notifications
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-[30px] leading-tight text-foreground">
                <span className="font-display font-bold">Stop all PriceYou emails</span>
              </h1>
              <p className="mt-4 text-[18px] leading-relaxed text-muted-foreground">
                You'll stop receiving price alerts, updates, and offers. Account and billing emails
                still arrive when needed.
              </p>

              <button
                type="button"
                onClick={unsubscribe}
                aria-busy={busy}
                className="btn-primary mt-8 h-[56px] w-full"
              >
                {busy ? "Unsubscribing…" : "Unsubscribe from everything"}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Takes effect immediately
              </p>
              {error ? <p className="mt-3 text-center text-xs text-destructive">{error}</p> : null}

              <div className="mt-8 flex items-center gap-3">
                <span className="h-px flex-1 bg-hairline" />
                <span className="text-[12px] text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>

              <p className="mt-8 font-display text-[20px] font-semibold leading-snug text-foreground">
                Too many emails? A less frequent digest might be enough — log in to switch.
              </p>

              <Link to="/login" className="btn-secondary mt-5 h-[56px] w-full">
                Log in to manage notifications
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
