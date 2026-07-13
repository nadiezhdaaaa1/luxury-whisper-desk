// Seeds the user's watchlist from their onboarding brand picks the first time
// they land in the authenticated app (any /app page). Idempotent: only runs
// when the watchlist is empty and profile.brands has picks.
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyProfile } from "@/lib/profile";
import { useBrandsCatalog } from "@/lib/catalog";
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
    if (wlQ.data.length > 0) { ran.current = true; return; }
    const brands = profileQ.data.brands;
    const cats = profileQ.data.categories;
    if (!Array.isArray(brands) || brands.length === 0) { ran.current = true; return; }
    ran.current = true;
    const plan = planSeedFromProfile(brands, cats, FREE_ACTIVE_CAP, catalogQ.data);
    if (plan.length === 0) return;
    void (async () => {
      try {
        await insertItems(plan);
        await qc.invalidateQueries({ queryKey: ["watchlist"] });
      } catch (e) {
        console.error("[watchlist] seed failed", e);
      }
    })();
  }, [profileQ.data, wlQ.data, catalogQ.data, qc]);
}
