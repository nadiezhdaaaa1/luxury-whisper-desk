
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_submissions;
REVOKE INSERT ON public.contact_submissions FROM anon, authenticated;
