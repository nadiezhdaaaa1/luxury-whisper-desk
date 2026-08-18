CREATE OR REPLACE FUNCTION public.enforce_plan_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.billing_period IS DISTINCT FROM OLD.billing_period THEN
    v_privileged := coalesce(
                      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
                      ''
                    ) = 'service_role'
                    OR current_user IN ('service_role', 'supabase_admin', 'postgres');
    IF NOT v_privileged THEN
      RAISE EXCEPTION 'Plan changes must go through billing and cannot be set from the app.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.is_privileged_caller();