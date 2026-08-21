-- The Free tier no longer exists: the paywall is trial / quarterly / annual only.
-- Drop the two hardcoded Free-plan cap triggers and their functions.
-- enforce_plan_immutable is unrelated and intentionally left in place.

DROP TRIGGER IF EXISTS enforce_portfolio_free_cap ON public.portfolio_items;
DROP TRIGGER IF EXISTS enforce_watchlist_free_active_cap ON public.watchlist;

DROP FUNCTION IF EXISTS public.enforce_portfolio_free_cap();
DROP FUNCTION IF EXISTS public.enforce_watchlist_free_active_cap();