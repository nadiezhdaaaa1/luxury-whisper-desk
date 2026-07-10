UPDATE public.signals
SET source_url = CASE brand_name
  WHEN 'Panerai' THEN 'https://www.panerai.com'
  WHEN 'Breitling' THEN 'https://www.breitling.com'
  WHEN 'Grand Seiko' THEN 'https://www.grand-seiko.com'
  ELSE source_url
END
WHERE is_sample = true AND source_url IS NULL AND brand_name IN ('Panerai', 'Breitling', 'Grand Seiko');