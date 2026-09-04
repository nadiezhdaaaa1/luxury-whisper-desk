// Seeds the user's watchlist from their onboarding brand picks the first time
// they land in the authenticated app.
//
// Idempotency comes from the DATA, not from a flag: we re-read the watchlist
// immediately before inserting and seed only when the account still has zero
// rows. The `onboarding_completed` flag and the account-scoped local key are
// kept as cheap short-circuits, but neither is load-bearing — a failed flag
// write can no longer suppress seeding, and a stale flag can no longer cause a
// duplicate seed.
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyProfile } from "@/lib/profile";
import { useBrandsCatalog } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { fetchWatchlist, insertItems, planSeedFromProfile } from "@/lib/watchlist";

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
    if (profileQ.data.onboarding_completed) {
      ran.current = true;
      return;
    }
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
    } catch {
      /* ignore */
    }

    void (async () => {
      try {
        // 1) Seed ONLY when the account genuinely has no rows right now.
        const current = await fetchWatchlist();
        if (current.length === 0 && Array.isArray(brands) && brands.length > 0) {
          const plan = planSeedFromProfile(brands, cats, catalogQ.data);
          if (plan.length > 0) {
            await insertItems(plan);
            await qc.invalidateQueries({ queryKey: ["watchlist"] });
          }
        }
      } catch (e) {
        console.error("[watchlist] seed failed", e);
      }

      // 2) Mark it done. A failure here is harmless: the zero-row check above
      //    is what prevents a second seed.
      const { error: markErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);
      if (markErr) {
        console.error("[watchlist] mark onboarding_completed failed", markErr);
        return;
      }
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(localKey, "1");
      } catch {
        /* ignore */
      }
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["access"] });
    })();
  }, [profileQ.data, wlQ.data, catalogQ.data, qc]);
}
