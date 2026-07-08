CREATE TABLE public.signals (
  id text PRIMARY KEY,
  type text NOT NULL,
  category text NOT NULL,
  brand_slug text NOT NULL,
  brand_name text NOT NULL,
  segment text,
  model text,
  title text NOT NULL,
  body text NOT NULL,
  recommended_action text,
  signal_date timestamptz NOT NULL,
  is_sample boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signals_brand_slug_idx ON public.signals(brand_slug);
CREATE INDEX signals_category_idx ON public.signals(category);
CREATE INDEX signals_signal_date_idx ON public.signals(signal_date DESC);
GRANT SELECT ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signals are readable by authenticated users"
  ON public.signals FOR SELECT TO authenticated USING (true);