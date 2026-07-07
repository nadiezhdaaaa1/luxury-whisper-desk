import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile";
import { TwoFactorEnroll } from "@/components/auth/TwoFactorEnroll";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/analytics";

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

  async function handleLogout() {
    track("log_out", {});
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <span className="eyebrow">Settings</span>
        <h1 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2] text-foreground">
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
    </div>
  );
}
