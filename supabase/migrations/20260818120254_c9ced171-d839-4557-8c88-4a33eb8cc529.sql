CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.account_deletion_requests (
  user_id uuid PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  delete_after timestamptz NOT NULL,
  cancelled_at timestamptz,
  executed_at timestamptz,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  last_error text
);

GRANT SELECT, INSERT, UPDATE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion request"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion request"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deletion request"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.account_deletion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL,
  candidates integer NOT NULL DEFAULT 0,
  executed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  report jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT ALL ON public.account_deletion_runs TO service_role;

ALTER TABLE public.account_deletion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read deletion runs"
  ON public.account_deletion_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.account_deletion_runs TO authenticated;