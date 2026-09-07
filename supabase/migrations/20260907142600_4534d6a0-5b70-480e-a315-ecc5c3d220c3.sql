CREATE TABLE public.feature_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

GRANT SELECT, INSERT, UPDATE ON public.feature_votes TO authenticated;
GRANT ALL ON public.feature_votes TO service_role;

ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feature votes"
  ON public.feature_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own feature votes"
  ON public.feature_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own feature votes"
  ON public.feature_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_feature_votes_updated_at
  BEFORE UPDATE ON public.feature_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();