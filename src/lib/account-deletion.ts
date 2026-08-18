// Client-safe helpers + types for the real (server-side) account deletion flow.
// The server functions live in account-deletion.functions.ts.

export const GRACE_PERIOD_DAYS = 30;

export type DeletionRequest = {
  user_id: string;
  requested_at: string;
  delete_after: string;
  cancelled_at: string | null;
  executed_at: string | null;
  status: string;
};

export function formatDeletionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function daysUntilDeletion(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
