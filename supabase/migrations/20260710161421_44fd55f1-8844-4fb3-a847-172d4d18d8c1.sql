ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS source_url text;
CREATE INDEX IF NOT EXISTS signals_source_url_idx ON public.signals (source_url) WHERE source_url IS NOT NULL;