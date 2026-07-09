CREATE POLICY "temp_seed_insert" ON public.posts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "temp_seed_delete" ON public.posts FOR DELETE TO anon USING (true);
GRANT INSERT, DELETE ON public.posts TO anon;