-- Reserved roadmap value, mirroring 'fashion': provisioned ahead of launch and
-- deliberately NOT added to the app's CATEGORIES union. The landing page marks
-- "Art & Interior" as "Coming later". Placed AFTER 'fashion' so enumsortorder
-- keeps roadmap categories after the live ones, in landing-page order
-- (watches, jewelry, bags, fashion, art). Schema-only: no constraints, no seeds.
ALTER TYPE public.category_kind ADD VALUE IF NOT EXISTS 'art' AFTER 'fashion';