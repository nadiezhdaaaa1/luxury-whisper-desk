
-- Roles: dedicated table (never on profiles) + security-definer checker
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  cover_image_url text,
  body text NOT NULL,
  category text,
  author_name text NOT NULL,
  author_avatar_url text,
  read_time_minutes int,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;
CREATE POLICY "Public can read published posts"
  ON public.posts FOR SELECT TO anon, authenticated
  USING (published = true);

DROP POLICY IF EXISTS "Admins can read all posts" ON public.posts;
CREATE POLICY "Admins can read all posts"
  ON public.posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
CREATE POLICY "Admins can insert posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
CREATE POLICY "Admins can update posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Admins can delete posts"
  ON public.posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS posts_published_published_at_idx
  ON public.posts (published, published_at DESC);

-- Seed a few starter articles so /blog isn't empty
INSERT INTO public.posts (slug, title, excerpt, body, category, author_name, read_time_minutes, published, published_at)
VALUES
  (
    'buy-before-the-increase',
    'Buy before the increase: reading the signals',
    'Rolex and Cartier historically raise retail prices twice a year. Here''s how to read the signals — and act before the bump.',
    E'## Why timing matters\n\nLuxury watchmakers adjust retail prices with quiet regularity. A well-timed purchase can save several percent — sometimes more on the flagship references.\n\n### The three signals we watch\n\n- **Boutique-level allocation shifts** — when authorised dealers are told to slow releases, a hike often follows.\n- **Currency-adjusted regional pricing** — Japan and Switzerland tend to move first.\n- **Grey-market spread compression** — when the gap between retail and secondary narrows, retail is about to catch up.\n\n> When the spread narrows to under 5%, a hike is usually within 60 days.\n\nLuxTracker surfaces these signals for the brands you follow, so you know when to move before the sticker changes.',
    'Market',
    'The LuxTracker Team',
    4,
    true,
    now() - interval '2 days'
  ),
  (
    'why-portfolios-need-jewelry',
    'Why serious portfolios include jewelry',
    'A quiet 5–15% allocation to signed jewelry has historically softened watch-market drawdowns.',
    E'## The case for jewelry\n\nSigned pieces from Cartier, Van Cleef & Arpels, and Bulgari behave differently from steel sport watches.\n\n- Lower correlation to steel-sport-watch cycles\n- Stronger auction floor in soft markets\n- A meaningful hedge for USD-denominated collections\n\n### What to hold\n\nStart with iconic references — Love bracelets, Alhambra motifs, Serpenti tubogas. Provenance and hallmarks matter more than carat weight.\n\nWe cover Watches and Jewelry today; Bags are coming next.',
    'Guides',
    'The LuxTracker Team',
    5,
    true,
    now() - interval '7 days'
  ),
  (
    'honest-roi-what-we-count',
    'Honest ROI: what we count, and what we don''t',
    'We only show you signals grounded in real data. Here''s what "market value coming soon" actually means.',
    E'## Our honesty rules\n\nEvery number we show is either:\n\n1. A price you entered yourself (your purchase price), or\n2. A signal grounded in verified pricing feeds we can cite.\n\nWe will **never** fabricate current market values. When live pricing is ready, it will be labelled "Live" — until then, "coming soon" means exactly that.\n\n### Why this matters\n\nCollectors have been burned by dashboards that invent numbers. We''d rather show fewer figures and tell you the truth about each one.\n\n*Content is informational, not investment advice.*',
    'ROI',
    'The LuxTracker Team',
    3,
    true,
    now() - interval '14 days'
  )
ON CONFLICT (slug) DO NOTHING;
