REVOKE UPDATE, DELETE ON public.newsletter_subscribers FROM anon, authenticated;

CREATE POLICY "Block direct updates to newsletter_subscribers"
ON public.newsletter_subscribers FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct deletes from newsletter_subscribers"
ON public.newsletter_subscribers FOR DELETE TO anon, authenticated
USING (false);