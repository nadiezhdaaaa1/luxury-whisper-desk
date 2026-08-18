import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  getMyDeletionRequest,
  cancelAccountDeletion,
} from "@/lib/account-deletion.functions";
import { daysUntilDeletion, formatDeletionDate } from "@/lib/account-deletion";

export function useMyDeletionRequest() {
  const fetchRequest = useServerFn(getMyDeletionRequest);
  return useQuery({
    queryKey: ["deletion-request"],
    queryFn: () => fetchRequest(),
  });
}

/**
 * Server-state driven: a request made on a phone shows up on a laptop.
 */
export function PendingDeletionBanner() {
  const { data } = useMyDeletionRequest();
  const queryClient = useQueryClient();
  const cancel = useServerFn(cancelAccountDeletion);

  if (!data) return null;

  async function handleCancel() {
    try {
      await cancel();
      track("account_deletion_cancelled", {});
      await queryClient.invalidateQueries({ queryKey: ["deletion-request"] });
      toast.success("Account deletion cancelled", {
        description: "Your account and data are safe.",
      });
    } catch {
      toast.error("Couldn't cancel deletion", { description: "Please try again." });
    }
  }

  return (
    <div className="mb-6 rounded-2xl border-2 border-alert/40 bg-alert/5 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
          <div>
            <div className="font-display text-sm font-semibold text-foreground">
              Account scheduled for deletion on {formatDeletionDate(data.delete_after)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {daysUntilDeletion(data.delete_after)} days left. Everything keeps working until
              then. Change your mind anytime before that date.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleCancel} className="rounded-full">
          Cancel deletion
        </Button>
      </div>
    </div>
  );
}
