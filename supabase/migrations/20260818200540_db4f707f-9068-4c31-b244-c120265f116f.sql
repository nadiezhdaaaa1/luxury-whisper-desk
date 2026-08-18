REVOKE EXECUTE ON FUNCTION public.enforce_portfolio_free_cap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_watchlist_free_active_cap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_plan_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_privileged_caller() FROM PUBLIC, anon, authenticated;