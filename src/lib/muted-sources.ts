// Per-source mute for price alerts.
// Users get alerts on a brand from many sources (retailers, marketplaces,
// forums). Muting a source hides its alerts everywhere without touching
// the brand subscription itself.
//
// Backed by `public.muted_alert_sources` (owner-only RLS). The model is
// INSERT-and-DELETE, not upsert: the hostname is the natural key and the row
// carries no mutable payload, so there is deliberately no UPDATE policy or
// UPDATE grant on the table.
//
// DELIBERATE OMISSION: values previously held in the localStorage key
// `lux.mutedAlertSources.v1` are NOT migrated into the table. They are test
// data from the pre-handoff build; a one-shot importer is not worth the code.

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Best-effort hostname extraction. Strips leading "www.". Returns null for
 *  non-http URLs or malformed inputs. */
export function sourceHostname(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export const mutedSourcesKey = (userId: string | null) => ["muted-alert-sources", userId] as const;

export async function fetchMutedSources(): Promise<string[]> {
  const { data, error } = await supabase
    .from("muted_alert_sources")
    .select("hostname")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.hostname);
}

/** Muted hostnames for the signed-in user.
 *
 *  SSR / signed-out: the query is disabled (no bearer token exists on the
 *  server, and an anonymous request would be a guaranteed 401/empty), so this
 *  returns `[]` — the same value the old localStorage hook produced during
 *  SSR. After hydration `useAuth` resolves the session, the query runs, and
 *  the mute set settles. Filtering strictly shrinks the feed, so the transient
 *  state shows MORE rows briefly rather than flashing muted content in a list
 *  that had already excluded it; there is no hydration mismatch because both
 *  server and first client render see `[]`. */
export function useMutedSources(): string[] {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: mutedSourcesKey(userId),
    queryFn: fetchMutedSources,
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
  return useMemo(() => query.data ?? [], [query.data]);
}

/** Mute / unmute actions. Both write through to the table and refresh the
 *  cached list; the optimistic cache write keeps the feed responsive. */
export function useMutedSourceActions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const key = mutedSourcesKey(userId);

  const setCache = useCallback(
    (fn: (cur: string[]) => string[]) => {
      qc.setQueryData<string[]>(key, (cur) => fn(cur ?? []));
    },
    [qc, key],
  );

  const muteMutation = useMutation({
    mutationFn: async (host: string) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("muted_alert_sources")
        .insert({ user_id: userId, hostname: host });
      // Re-muting an already-muted host is a no-op, not an error.
      if (error && error.code !== "23505") throw error;
    },
    onMutate: (host: string) => {
      setCache((cur) => (cur.includes(host) ? cur : [...cur, host]));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: async (host: string) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("muted_alert_sources")
        .delete()
        .eq("hostname", host);
      if (error) throw error;
    },
    onMutate: (host: string) => {
      setCache((cur) => cur.filter((h) => h !== host));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  const muteSource = useCallback(
    (host: string) => muteMutation.mutate(host),
    [muteMutation],
  );
  const unmuteSource = useCallback(
    (host: string) => unmuteMutation.mutate(host),
    [unmuteMutation],
  );

  return { muteSource, unmuteSource };
}
