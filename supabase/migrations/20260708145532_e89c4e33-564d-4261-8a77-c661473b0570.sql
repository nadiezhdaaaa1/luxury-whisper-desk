
CREATE TABLE public.portfolio_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category category_kind NOT NULL,
  brand text NOT NULL,
  model text,
  photo_url text,
  notes text,
  purchase_price numeric,
  currency text NOT NULL DEFAULT 'USD',
  signal_every_move boolean NOT NULL DEFAULT false,
  alert_below_enabled boolean NOT NULL DEFAULT false,
  alert_below_price numeric,
  alert_above_enabled boolean NOT NULL DEFAULT false,
  alert_above_price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolio items"
  ON public.portfolio_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio items"
  ON public.portfolio_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio items"
  ON public.portfolio_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio items"
  ON public.portfolio_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX portfolio_items_user_idx ON public.portfolio_items(user_id, created_at DESC);

-- Storage policies for portfolio-photos bucket (per-user folder access)
CREATE POLICY "Users can view own portfolio photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portfolio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own portfolio photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own portfolio photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own portfolio photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
