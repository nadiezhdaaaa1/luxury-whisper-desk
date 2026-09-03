-- Drop the mass-market segment (luxury + mid-market only).
-- NOTE: public.segment_kind intentionally keeps its third value 'mass_market'.
-- Postgres has no ALTER TYPE ... DROP VALUE, and swapping the type would require
-- rewriting the profiles.segments enum-array column for no user-visible gain.
-- Policy is enforced by the CHECK constraints added at the bottom of this file.

-- 1. Retag the 10 retained brands.
UPDATE public.brands SET tier = 'mid_market'
WHERE slug IN ('coach','kate-spade','marc-jacobs','tory-burch','furla','michael-kors','mejuri','citizen','seiko','orient');

-- 2. Retag signals for those 10 brands.
UPDATE public.signals SET segment = 'mid_market'
WHERE segment = 'mass_market'
  AND brand_slug IN ('coach','kate-spade','marc-jacobs','tory-burch','furla','michael-kors','mejuri','citizen','seiko','orient');

-- 3. Delete the 9 dropped brands (public.models cascades via FK ON DELETE CASCADE).
DELETE FROM public.brands
WHERE slug IN ('casio','fossil','timex','swatch','pandora','swarovski','ana-luisa','gorjana','kendra-scott');

-- 4. Strip the value from profiles.
UPDATE public.profiles
SET segments = array_remove(segments, 'mass_market'::public.segment_kind)
WHERE 'mass_market'::public.segment_kind = ANY(segments);

-- 5. Prevent the value from returning.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_segments_no_mass_market
  CHECK (NOT ('mass_market'::public.segment_kind = ANY(segments)));

-- The brands tier CHECK (brands_tier_allowed) used to be added here. It moved to
-- 20260903103000_c1a2b3c4-d5e6-4f70-8a91-2b3c4d5e6f70.sql (catalogue
-- reconciliation): on a fresh replay the catalogue seed still holds
-- tier = 'premium' rows at this point, so adding the constraint here aborted the
-- whole migration chain. It is added there instead, after the catalogue is
-- reconciled, and guarded so it is a no-op where it already exists.

-- 6. No constraint on public.signals yet: rows for the deleted brands still hold
-- segment='mass_market' and are pending a separate disposal decision.
