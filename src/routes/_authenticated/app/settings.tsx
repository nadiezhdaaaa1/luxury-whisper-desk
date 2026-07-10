import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile";
import { TwoFactorEnroll } from "@/components/auth/TwoFactorEnroll";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { downgradeToFree, planLabel } from "@/lib/subscription";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMyProfile,
  });

  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  async function handleLogout() {
    track("log_out", {});
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  async function handleDowngrade() {
    setDowngrading(true);
    try {
      await downgradeToFree();
      track("downgraded_to_free", {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
      toast.success("You're on Free", {
        description: "Nothing was deleted. Extra watchlist items are paused and over-cap portfolio items are read-only.",
      });
    } catch (e) {
      console.error("[downgrade] failed", e);
      toast.error("Couldn't switch plan", { description: "Please try again." });
    } finally {
      setDowngrading(false);
      setConfirmDowngrade(false);
    }
  }

  const isPro = profile?.plan === "pro";

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] text-foreground">
          Account & security
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Manage how you sign in and how your data is protected.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Account</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            {isLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Signed in as
                </div>
                <div className="mt-1 font-display text-lg font-medium">
                  {profile?.display_name || "—"}
                </div>
                <div className="text-sm text-muted-foreground">{profile?.email}</div>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Subscription</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Current plan
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-display text-lg font-medium">
                        {planLabel(profile?.plan, profile?.billing_period)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest ${
                          isPro
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface-2 text-muted-foreground border border-hairline"
                        }`}
                      >
                        {isPro ? "Active" : "Free"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isPro
                        ? "You have unlimited portfolio and watchlist items, and access to every signal."
                        : "Up to 3 portfolio items, 10 watchlist items, and sample signals."}
                    </p>
                  </div>

                  {isPro ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setConfirmDowngrade(true)}
                      disabled={downgrading}
                    >
                      Switch back to Free
                    </Button>
                  ) : (
                    <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Link to="/app/upgrade">
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        Upgrade
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  )}
                </div>

                {isPro ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    <span className="font-display font-semibold text-foreground">Placeholder control.</span>{" "}
                    "Switch back to Free" is a temporary developer stand-in. The real cancel /
                    pause flow (with a reminder before billing) arrives with checkout.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Checkout is coming soon — for now, choosing Pro unlocks it for your account
                    immediately, no card required.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">
            Two-factor authentication
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            <TwoFactorEnroll />
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Session</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Sign out on this device.</div>
            <Button variant="outline" onClick={handleLogout} className="rounded-full">
              Log out
            </Button>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmDowngrade} onOpenChange={(o) => !o && setConfirmDowngrade(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch back to Free?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing gets deleted. Watchlist items beyond the first 10 will move to Paused,
              and portfolio items beyond 3 will become read-only. You can upgrade again at
              any time to restore full access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={downgrading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDowngrade} disabled={downgrading}>
              {downgrading ? "Switching…" : "Switch to Free"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
