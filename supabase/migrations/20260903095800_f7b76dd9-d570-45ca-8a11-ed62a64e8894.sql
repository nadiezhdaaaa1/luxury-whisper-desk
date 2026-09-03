-- Data-only cleanup: strip the legacy 'fashion' value from profiles.categories.
-- Intentionally NO CHECK constraint here. 'fashion' is a RESERVED ROADMAP VALUE:
-- the landing page advertises Fashion as "Phase 2" and public.category_kind was
-- provisioned ahead of that launch. Constraining it now would only have to be
-- dropped when Phase 2 ships. This lone UPDATE is deliberate, not an oversight.
-- Idempotent: a harmless no-op on a database without such rows.
UPDATE public.profiles
SET categories = array_remove(categories, 'fashion'::public.category_kind)
WHERE 'fashion'::public.category_kind = ANY(categories);