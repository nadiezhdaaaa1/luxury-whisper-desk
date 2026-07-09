DROP POLICY IF EXISTS "temp_seed_insert" ON public.posts;
DROP POLICY IF EXISTS "temp_seed_delete" ON public.posts;
REVOKE INSERT, DELETE ON public.posts FROM anon;