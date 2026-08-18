-- Helper: is the caller a trusted/privileged (non end-user) caller?
-- NOT security definer, and never called from a security-definer context,
-- so current_user reflects the real PostgREST role ('authenticated'/'anon').
CREATE OR REPLACE FUNCTION public.is_privileged_caller()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
           nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
           ''
         ) = 'service_role'
      OR current_user IN ('service_role', 'supabase_admin', 'postgres');
$$;

-- 1) Freeze profiles.plan / profiles.billing_period against end-user writes.
CREATE OR REPLACE FUNCTION public.enforce_plan_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.billing_period IS DISTINCT FROM OLD.billing_period)
     AND NOT public.is_privileged_caller() THEN
    RAISE EXCEPTION 'Plan changes must go through billing and cannot be set from the app.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_plan_immutable ON public.profiles;
CREATE TRIGGER enforce_plan_immutable
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_immutable();

-- 2) Free-tier portfolio insert cap (INSERT only; existing rows untouched).
CREATE OR REPLACE FUNCTION public.enforce_portfolio_free_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_count integer;
BEGIN
  SELECT p.plan::text INTO v_plan FROM public.profiles p WHERE p.id = NEW.user_id;
  IF coalesce(v_plan, 'free') <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count FROM public.portfolio_items WHERE user_id = NEW.user_id;
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Free plan is limited to 3 portfolio items. Upgrade to Pro to add more.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_portfolio_free_cap ON public.portfolio_items;
CREATE TRIGGER enforce_portfolio_free_cap
BEFORE INSERT ON public.portfolio_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_portfolio_free_cap();

-- 3) Free-tier active watchlist cap (INSERT + false->true UPDATE).
CREATE OR REPLACE FUNCTION public.enforce_watchlist_free_active_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_count integer;
BEGIN
  -- Only activations matter.
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT p.plan::text INTO v_plan FROM public.profiles p WHERE p.id = NEW.user_id;
  IF coalesce(v_plan, 'free') <> 'free' THEN
    RETURN NEW;
  END IF;

  -- Count active rows EXCLUDING the row being updated.
  SELECT count(*) INTO v_count
    FROM public.watchlist w
   WHERE w.user_id = NEW.user_id
     AND w.is_active
     AND (TG_OP = 'INSERT' OR w.id <> OLD.id);

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'Free plan is limited to 10 active brand watchlist items. Upgrade to Pro to add more.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_watchlist_free_active_cap ON public.watchlist;
CREATE TRIGGER enforce_watchlist_free_active_cap
BEFORE INSERT OR UPDATE ON public.watchlist
FOR EACH ROW EXECUTE FUNCTION public.enforce_watchlist_free_active_cap();