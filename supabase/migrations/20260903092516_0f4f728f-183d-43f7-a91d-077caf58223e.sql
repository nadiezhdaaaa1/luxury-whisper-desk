-- Remove orphaned signals belonging to the deleted mass-market brands.
DELETE FROM public.signals WHERE segment = 'mass_market';

-- Now that the data is clean, enforce the two-tier policy on signals.
ALTER TABLE public.signals ADD CONSTRAINT signals_segment_allowed
  CHECK (segment IS NULL OR segment IN ('luxury_invest','mid_market'));
