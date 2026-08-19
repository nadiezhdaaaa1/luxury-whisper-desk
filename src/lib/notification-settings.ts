// Shared access to `public.notification_settings` — one row per user, owner-only
// RLS. Both the email-channel preferences (`notification-prefs.ts`) and the
// alert-delivery / quiet-hours settings (`alert-delivery.ts`) live in that
// single row, so they share one query and one cache entry here.
//
// The row is created LAZILY: a user who never touches a setting has no row, and
// reads fall back to the defaults declared by those two modules. The first write
// upserts the row.
//
// DELIBERATE OMISSION: values previously held in the localStorage keys
// `lux.notifications.prefs.v1` and `lux.alert.delivery.v1` are NOT migrated into
// the table. They are test data from the pre-handoff build; a one-shot importer
// is not worth the code. Both keys are cleared at sign-out (see
// `src/lib/local-reset.ts`) so no stale copy lingers on a shared browser.

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type NotificationSettingsRow = Tables<"notification_settings">;
export type NotificationSettingsPatch = Omit<
  TablesInsert<"notification_settings">,
  "user_id" | "created_at" | "updated_at"
>;

export const notificationSettingsKey = (userId: string | null) =>
  ["notification-settings", userId] as const;

export async function fetchNotificationSettings(): Promise<NotificationSettingsRow | null> {
  const { data, error } = await supabase.from("notification_settings").select("*").maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * The signed-in user's settings row, or `null` when they have never saved one.
 *
 * SSR / signed-out: the query is disabled — the server holds no bearer token, so
 * an anonymous request would be a guaranteed failure. `ready` stays false until
 * the real row (or a confirmed absence) has arrived, and every consumer must
 * render a placeholder rather than defaults while it is false. Painting default
 * toggle positions and then correcting them reads as a bug even though it
 * settles.
 */
export function useNotificationSettings() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: notificationSettingsKey(userId),
    queryFn: fetchNotificationSettings,
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });

  return {
    row: query.data ?? null,
    // No user => nothing to wait for; the consumer renders its signed-out shape.
    ready: userId ? query.isSuccess : true,
    userId,
  };
}

/** Lazily upserts the row and patches the given columns. */
export function useNotificationSettingsMutation() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const key = notificationSettingsKey(userId);

  const mutation = useMutation({
    mutationFn: async (patch: NotificationSettingsPatch) => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("notification_settings")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: (patch: NotificationSettingsPatch) => {
      // Optimistic: the switch must move under the finger, not a round trip later.
      qc.setQueryData<NotificationSettingsRow | null>(key, (cur) =>
        cur ? { ...cur, ...patch } : cur,
      );
    },
    onSuccess: (row) => {
      qc.setQueryData<NotificationSettingsRow | null>(key, row);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  const save = useCallback(
    (patch: NotificationSettingsPatch) => {
      mutation.mutate(patch);
    },
    [mutation],
  );

  return { save };
}
