// Seeds the user's watchlist from their onboarding brand picks the first time
// they land in the authenticated app. Runs at most once per user: we flip
// profiles.onboarding_completed = true after the first attempt so that a user
// who deliberately empties their watchlist doesn't get re-seeded on refresh.
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

    const markDone = async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as never)
        .eq("id", userId);
      if (error) console.error("[watchlist] mark onboarding_completed failed", error);
      await qc.invalidateQueries({ queryKey: ["me"] });
    };

    void (async () => {
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
      } finally {
        await markDone();
      }
    })();
  }, [profileQ.data, wlQ.data, catalogQ.data, qc]);
}

