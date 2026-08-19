REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.portfolio_removals FROM anon, authenticated;
REVOKE ALL ON public.portfolio_removals FROM anon;
GRANT INSERT ON public.portfolio_removals TO authenticated;
GRANT ALL ON public.portfolio_removals TO service_role;

DROP POLICY IF EXISTS "No one can read removal records" ON public.portfolio_removals;
CREATE POLICY "No one can read removal records"
  ON public.portfolio_removals AS RESTRICTIVE FOR SELECT
  TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "No one can update removal records" ON public.portfolio_removals;
CREATE POLICY "No one can update removal records"
  ON public.portfolio_removals AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No one can delete removal records" ON public.portfolio_removals;
CREATE POLICY "No one can delete removal records"
  ON public.portfolio_removals AS RESTRICTIVE FOR DELETE
  TO anon, authenticated USING (false);