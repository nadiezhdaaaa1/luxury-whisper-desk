CREATE TABLE public.portfolio_removals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  note text,
  brand text,
  category public.category_kind,
  held_days integer,
  had_target_price boolean NOT NULL DEFAULT false,
  removed_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.portfolio_removals TO authenticated;
GRANT ALL ON public.portfolio_removals TO service_role;

ALTER TABLE public.portfolio_removals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own removal records"
  ON public.portfolio_removals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.portfolio_removals IS 'Churn signal for removed portfolio items. Insert-only for end users; no SELECT policy by design. Never stores purchase_price.';