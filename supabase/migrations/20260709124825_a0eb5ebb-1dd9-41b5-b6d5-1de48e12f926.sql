GRANT INSERT ON public.contact_submissions TO anon, authenticated;
CREATE POLICY "Anyone can submit contact messages" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);