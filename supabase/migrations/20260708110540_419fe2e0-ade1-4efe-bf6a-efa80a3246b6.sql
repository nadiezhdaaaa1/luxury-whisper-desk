
CREATE TYPE public.watchlist_item_kind AS ENUM ('brand', 'piece');

CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.watchlist_item_kind NOT NULL,
  category public.category_kind NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  target_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX watchlist_user_created_idx ON public.watchlist (user_id, created_at);
CREATE UNIQUE INDEX watchlist_unique_brand_per_user ON public.watchlist (user_id, category, brand) WHERE type = 'brand';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON public.watchlist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own watchlist"
  ON public.watchlist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watchlist"
  ON public.watchlist FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watchlist"
  ON public.watchlist FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
