import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { beginGoogleLink } from "@/lib/link-google";
import { SetPasswordDialog } from "@/components/settings/SetPasswordDialog";
import { track } from "@/lib/analytics";

async function fetchIdentities() {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw error;
  return data?.identities ?? [];
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Account email, shown read-only when setting a first password. */
  email?: string;
};

export function ManageConnectedAccountsDialog({ open, onOpenChange, email: accountEmail }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);

  const {
    data: identities = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auth", "identities"],
    queryFn: fetchIdentities,
    enabled: open,
  });

  const google = identities.find((i) => i.provider === "google");
  const email = identities.find((i) => i.provider === "email");
  const hasMultiple = identities.length > 1;

  async function handleLinkGoogle() {
    setBusy("google-link");
    try {
      track("connected_account_link", { provider: "google" });
      // linkIdentity attaches Google to THIS account and navigates away; success
      // can only be reported after completeGoogleLink() verifies the return trip.
      const res = await beginGoogleLink(window.location.origin + "/app/settings");
      if (!res.ok) toast.error("Couldn't connect Google", { description: res.message });
    } finally {
      setBusy(null);
    }
  }


  async function handleUnlink(identity: NonNullable<typeof google>) {
    if (!hasMultiple) {
      toast.error("Can't unlink your only sign-in method", {
        description: "Set a password or link another provider first.",
      });
      return;
    }
    setBusy(`${identity.provider}-unlink`);
    try {
      track("connected_account_unlink", { provider: identity.provider });
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      await refetch();
      toast.success(`${identity.provider} disconnected`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Couldn't unlink", { description: msg });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connected accounts</DialogTitle>
          <DialogDescription>
            Link providers to sign in faster. You need at least one sign-in method.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <ProviderRow
              name="Email & password"
              status={email ? ((email.identity_data?.email as string) ?? "Linked") : "Not set"}
              linked={!!email}
              action={null}
            />
            <ProviderRow
              name="Google"
              status={google ? ((google.identity_data?.email as string) ?? "Linked") : "Not linked"}
              linked={!!google}
              action={
                google ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null || !hasMultiple}
                    onClick={() => handleUnlink(google)}
                  >
                    {busy === "google-unlink" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                ) : (
                  <Button size="sm" disabled={busy !== null} onClick={handleLinkGoogle}>
                    {busy === "google-link" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProviderRow({
  name,
  status,
  linked,
  action,
}: {
  name: string;
  status: string;
  linked: boolean;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline p-4">
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground truncate">{linked ? status : status}</div>
      </div>
      {action}
    </div>
  );
}
