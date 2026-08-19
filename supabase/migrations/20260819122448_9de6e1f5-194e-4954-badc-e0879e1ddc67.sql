-- A1: restore EXECUTE on the role-check helper for signed-in users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- A2: anon keeps only the public catalog + published blog reads.
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.portfolio_items FROM anon;
REVOKE ALL ON public.portfolio_removals FROM anon;
REVOKE ALL ON public.watchlist FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.signals FROM anon;
REVOKE ALL ON public.contact_submissions FROM anon;
REVOKE ALL ON public.newsletter_subscribers FROM anon;
REVOKE ALL ON public.account_deletion_requests FROM anon;
REVOKE ALL ON public.account_deletion_runs FROM anon;
REVOKE ALL ON public.account_deletion_dispatches FROM anon;
REVOKE ALL ON public.account_deletion_health FROM anon;

REVOKE ALL ON public.brands FROM anon;
REVOKE ALL ON public.models FROM anon;
REVOKE ALL ON public.posts FROM anon;
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.models TO anon;
GRANT SELECT ON public.posts TO anon;

-- authenticated is also wider than its policies on read-only/admin tables.
REVOKE INSERT, UPDATE, DELETE ON public.brands FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.models FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.signals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.contact_submissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.newsletter_subscribers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.account_deletion_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.account_deletion_dispatches FROM authenticated;
REVOKE ALL ON public.account_deletion_health FROM authenticated;
GRANT SELECT ON public.account_deletion_health TO authenticated;
REVOKE DELETE ON public.account_deletion_requests FROM authenticated;

-- A4: a user may only change their own preference fields on their profile.
-- email is owned by the auth trigger; plan/billing_period by billing.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, segments, categories, brands, role, quiz_completed, onboarding_completed)
  ON public.profiles TO authenticated;