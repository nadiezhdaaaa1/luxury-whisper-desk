// Frontend-only mock for account deletion grace period.
// Real backend integration: soft-delete profile + auth user, hard-delete
// after 30 days via cron. For now we just persist a scheduled date in
// localStorage so the banner + reactivation flow can be built and reviewed.

const KEY = "accountDeletionScheduled";

export type DeletionState = {
  scheduledAt: string; // ISO when requested
  deleteAt: string; // ISO when it happens
  reason?: string;
};

export function getDeletionState(): DeletionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as DeletionState;
    // Auto-clear if the scheduled date has passed (mock only).
    if (new Date(s.deleteAt) <= new Date()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function scheduleDeletion(reason?: string): DeletionState {
  const now = new Date();
  const del = new Date(now);
  del.setDate(del.getDate() + 30);
  const state: DeletionState = {
    scheduledAt: now.toISOString(),
    deleteAt: del.toISOString(),
    reason,
  };
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("account-mock:changed"));
  return state;
}

export function cancelDeletion(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("account-mock:changed"));
}

export function onAccountMockChange(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("account-mock:changed", fn);
  return () => window.removeEventListener("account-mock:changed", fn);
}

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
