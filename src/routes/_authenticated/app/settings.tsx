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
    <div className="space-y-8 max-w-2xl">
      <section>
        <h2 className="font-display text-lg font-medium mb-3">Account</h2>
        <div className="card-soft p-6">
          {isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            <>
              <div className="text-sm text-muted-foreground">Signed in as</div>
              <div className="mt-1 font-medium">{profile?.display_name || "—"}</div>
              <div className="text-sm text-muted-foreground">{profile?.email}</div>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-medium mb-3">Two-factor authentication</h2>
        <div className="card-soft p-6">
          <TwoFactorEnroll />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-medium mb-3">Session</h2>
        <div className="card-soft p-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Sign out on this device.</div>
          <Button variant="outline" onClick={handleLogout}>Log out</Button>
        </div>
      </section>
    </div>
  );
}
