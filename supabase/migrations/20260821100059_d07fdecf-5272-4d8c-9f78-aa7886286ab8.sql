-- New pricing policy: one product, three billing periods.
ALTER TABLE public.profiles DROP CONSTRAINT profiles_billing_period_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_billing_period_check
  CHECK (billing_period = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text]));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;