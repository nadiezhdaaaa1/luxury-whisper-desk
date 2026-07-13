// Seeds the user's watchlist from their onboarding brand picks the first time
// they land in the authenticated app. Runs at most once per user: we flip
// profiles.onboarding_completed = true BEFORE inserting anything so that a
// user who immediately empties their watchlist (or a failed insert) never
// causes a re-seed on refresh.
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyProfile } from "@/lib/profile";
import { useBrandsCatalog } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchWatchlist,
  insertItems,
  planSeedFromProfile,
  FREE_ACTIVE_CAP,
} from "@/lib/watchlist";

export function useSeedWatchlistFromProfile() {
  const qc = useQueryClient();
  const ran = useRef(false);
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  useEffect(() => {
    if (ran.current) return;
    if (!profileQ.data || !wlQ.data || !catalogQ.data) return;
    if (!profileQ.data.quiz_completed) return;
    // Already seeded once — never re-seed, even if the watchlist is now empty.
    if (profileQ.data.onboarding_completed) { ran.current = true; return; }
    ran.current = true;

    const brands = profileQ.data.brands;
    const cats = profileQ.data.categories;
    const userId = profileQ.data.id;

    // Local guard so a same-session reload without profile update still skips.
    const localKey = `pyou:onboarded:${userId}`;
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(localKey) === "1") {
        return;
      }
    } catch { /* ignore */ }

    void (async () => {
      // 1) Mark onboarding_completed = true FIRST so a failure or a rapid
      //    user delete afterwards can never trigger a re-seed on refresh.
      const { error: markErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);
      if (markErr) {
        console.error("[watchlist] mark onboarding_completed failed", markErr);
        // Abort seeding — we can't guarantee single-run, safer to do nothing.
        return;
      }
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(localKey, "1");
      } catch { /* ignore */ }
      await qc.invalidateQueries({ queryKey: ["me"] });

      // 2) Seed only if the watchlist is empty and the user picked brands.
      try {
        if (wlQ.data.length === 0 && Array.isArray(brands) && brands.length > 0) {
          const plan = planSeedFromProfile(brands, cats, FREE_ACTIVE_CAP, catalogQ.data);
          if (plan.length > 0) {
            await insertItems(plan);
            await qc.invalidateQueries({ queryKey: ["watchlist"] });
          }
        }
      } catch (e) {
        console.error("[watchlist] seed failed", e);
      }
    })();
  }, [profileQ.data, wlQ.data, catalogQ.data, qc]);
}
