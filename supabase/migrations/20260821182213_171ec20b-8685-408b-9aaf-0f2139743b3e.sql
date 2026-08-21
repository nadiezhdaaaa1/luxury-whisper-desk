ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_until timestamptz,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_status_check
  CHECK (billing_status = ANY (ARRAY['active'::text, 'past_due'::text, 'canceled'::text]));

COMMENT ON COLUMN public.profiles.access_until IS
  'When paid access ends. NULL = no scheduled end. Written ONLY by the billing webhook via service_role (provisioning.server.ts); read by getAccessState to compute entitlement.';
COMMENT ON COLUMN public.profiles.billing_status IS
  'active | past_due | canceled. Written ONLY by the billing webhook via service_role (provisioning.server.ts); read by getAccessState for display only - entitlement is NOT gated on it.';
COMMENT ON COLUMN public.profiles.past_due_since IS
  'Timestamp of the first failed charge in the current dunning cycle; not reset by repeat failures. Written ONLY by the billing webhook via service_role; read by getAccessState.';

CREATE OR REPLACE FUNCTION public.enforce_plan_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_privileged boolean;
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.billing_period IS DISTINCT FROM OLD.billing_period
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.access_until IS DISTINCT FROM OLD.access_until
     OR NEW.billing_status IS DISTINCT FROM OLD.billing_status
     OR NEW.past_due_since IS DISTINCT FROM OLD.past_due_since THEN
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
$function$;