-- Rename the reserved roadmap category value 'art' -> 'art_interior' to match
-- the landing card "Art & Interior" and the FAQ's "art and interior objects".
--
-- This is intentionally a FORWARD rename rather than an amendment of migration
-- 20260903100136_e1451134-027e-4879-a19e-e6427b210a2c.sql, which is applied
-- history. A fresh database therefore runs ADD VALUE 'art' and then renames it
-- here; that two-step is honest about what actually happened and is not a
-- mistake.
--
-- RENAME VALUE preserves enumsortorder, so 'art_interior' remains the last
-- value of public.category_kind. Like 'fashion', it stays a reserved roadmap
-- value provisioned ahead of launch and deliberately absent from the app's
-- CATEGORIES union; no constraints, seed rows, or schema changes accompany it.

ALTER TYPE public.category_kind RENAME VALUE 'art' TO 'art_interior';