ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS photo_path text;

UPDATE public.portfolio_items
SET photo_path = split_part(substring(photo_url from '/object/sign/portfolio-photos/(.*)$'), '?', 1)
WHERE photo_url LIKE '%/object/sign/portfolio-photos/%'
  AND photo_path IS NULL;