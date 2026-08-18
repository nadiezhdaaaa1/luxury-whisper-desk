CREATE OR REPLACE FUNCTION public.enforce_portfolio_free_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- MUST stay LANGUAGE plpgsql: plpgsql bumps the command counter before each
-- statement, so the count below sees rows inserted earlier by the SAME
-- multi-row INSERT. A LANGUAGE sql body would let a single batched insert
-- bypass this cap entirely.
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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_watchlist_free_active_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- MUST stay LANGUAGE plpgsql: plpgsql bumps the command counter before each
-- statement, so the count below sees rows inserted/updated earlier by the SAME
-- statement. A LANGUAGE sql body would let one batched INSERT (or one UPDATE
-- flipping many rows false->true) bypass this cap entirely.
DECLARE
  v_plan text;
  v_count integer;
BEGIN
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
$function$;

COMMENT ON FUNCTION public.enforce_portfolio_free_cap() IS 'Free-plan portfolio cap (3). Body must remain LANGUAGE plpgsql or batched inserts bypass it.';
COMMENT ON FUNCTION public.enforce_watchlist_free_active_cap() IS 'Free-plan active watchlist cap (10). Body must remain LANGUAGE plpgsql or batched inserts/updates bypass it.';