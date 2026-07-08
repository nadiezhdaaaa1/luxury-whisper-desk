-- Global catalog: brands & models
CREATE TABLE IF NOT EXISTS public.brands (
  slug text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  tier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug text NOT NULL REFERENCES public.brands(slug) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_slug, name)
);

CREATE INDEX IF NOT EXISTS models_brand_slug_idx ON public.models(brand_slug);
CREATE INDEX IF NOT EXISTS brands_category_idx ON public.brands(category);

GRANT SELECT ON public.brands TO anon, authenticated;
GRANT SELECT ON public.models TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
GRANT ALL ON public.models TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands are readable by everyone" ON public.brands;
CREATE POLICY "Brands are readable by everyone" ON public.brands FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Models are readable by everyone" ON public.models;
CREATE POLICY "Models are readable by everyone" ON public.models FOR SELECT TO anon, authenticated USING (true);

-- Seed brands
INSERT INTO public.brands (slug, name, category, tier) VALUES
  ('rolex','Rolex','watches','luxury_invest'),
  ('patek-philippe','Patek Philippe','watches','luxury_invest'),
  ('audemars-piguet','Audemars Piguet','watches','luxury_invest'),
  ('richard-mille','Richard Mille','watches','luxury_invest'),
  ('vacheron-constantin','Vacheron Constantin','watches','luxury_invest'),
  ('a-lange-sohne','A. Lange & Söhne','watches','luxury_invest'),
  ('omega','Omega','watches','premium'),
  ('cartier-watches','Cartier','watches','premium'),
  ('iwc','IWC Schaffhausen','watches','premium'),
  ('jaeger-lecoultre','Jaeger-LeCoultre','watches','premium'),
  ('panerai','Panerai','watches','premium'),
  ('breitling','Breitling','watches','premium'),
  ('tag-heuer','TAG Heuer','watches','premium'),
  ('tudor','Tudor','watches','premium'),
  ('grand-seiko','Grand Seiko','watches','premium'),
  ('longines','Longines','watches','mid_market'),
  ('tissot','Tissot','watches','mid_market'),
  ('oris','Oris','watches','mid_market'),
  ('seiko','Seiko','watches','mass_market'),
  ('casio','Casio','watches','mass_market'),
  ('cartier-jewelry','Cartier','jewelry','luxury_invest'),
  ('van-cleef-arpels','Van Cleef & Arpels','jewelry','luxury_invest'),
  ('bulgari','Bulgari','jewelry','luxury_invest'),
  ('harry-winston','Harry Winston','jewelry','luxury_invest'),
  ('graff','Graff','jewelry','luxury_invest'),
  ('tiffany','Tiffany & Co.','jewelry','premium'),
  ('chopard','Chopard','jewelry','premium'),
  ('piaget','Piaget','jewelry','premium'),
  ('pomellato','Pomellato','jewelry','premium'),
  ('david-yurman','David Yurman','jewelry','premium'),
  ('boucheron','Boucheron','jewelry','premium'),
  ('mikimoto','Mikimoto','jewelry','premium'),
  ('pandora','Pandora','jewelry','mass_market'),
  ('swarovski','Swarovski','jewelry','mass_market'),
  ('hermes','Hermès','bags','luxury_invest'),
  ('chanel','Chanel','bags','luxury_invest'),
  ('louis-vuitton','Louis Vuitton','bags','luxury_invest'),
  ('dior','Dior','bags','luxury_invest'),
  ('goyard','Goyard','bags','luxury_invest'),
  ('bottega-veneta','Bottega Veneta','bags','premium'),
  ('celine','Celine','bags','premium'),
  ('loewe','Loewe','bags','premium'),
  ('prada','Prada','bags','premium'),
  ('gucci','Gucci','bags','premium'),
  ('saint-laurent','Saint Laurent','bags','premium'),
  ('coach','Coach','bags','mid_market'),
  ('michael-kors','Michael Kors','bags','mid_market'),
  ('kate-spade','Kate Spade','bags','mid_market')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, category = EXCLUDED.category, tier = EXCLUDED.tier;

-- Seed models
INSERT INTO public.models (brand_slug, name) VALUES
  ('rolex','Submariner'),('rolex','Daytona'),('rolex','GMT-Master II'),('rolex','Datejust'),('rolex','Day-Date'),('rolex','Oyster Perpetual'),('rolex','Explorer'),('rolex','Sea-Dweller'),('rolex','Yacht-Master'),('rolex','Sky-Dweller'),
  ('patek-philippe','Nautilus'),('patek-philippe','Aquanaut'),('patek-philippe','Calatrava'),('patek-philippe','Grand Complications'),('patek-philippe','Twenty-4'),('patek-philippe','Gondolo'),
  ('audemars-piguet','Royal Oak'),('audemars-piguet','Royal Oak Offshore'),('audemars-piguet','Code 11.59'),('audemars-piguet','Millenary'),
  ('richard-mille','RM 011'),('richard-mille','RM 035'),('richard-mille','RM 055'),('richard-mille','RM 07-01'),
  ('vacheron-constantin','Overseas'),('vacheron-constantin','Patrimony'),('vacheron-constantin','Traditionnelle'),('vacheron-constantin','Historiques'),
  ('a-lange-sohne','Lange 1'),('a-lange-sohne','Odysseus'),('a-lange-sohne','Saxonia'),('a-lange-sohne','Zeitwerk'),
  ('omega','Speedmaster'),('omega','Seamaster'),('omega','Constellation'),('omega','De Ville'),('omega','Aqua Terra'),
  ('cartier-watches','Tank'),('cartier-watches','Santos'),('cartier-watches','Ballon Bleu'),('cartier-watches','Panthère'),('cartier-watches','Baignoire'),
  ('iwc','Portugieser'),('iwc','Pilot''s Watch'),('iwc','Portofino'),('iwc','Ingenieur'),('iwc','Aquatimer'),
  ('jaeger-lecoultre','Reverso'),('jaeger-lecoultre','Master Control'),('jaeger-lecoultre','Polaris'),('jaeger-lecoultre','Master Ultra Thin'),
  ('panerai','Luminor'),('panerai','Radiomir'),('panerai','Submersible'),
  ('breitling','Navitimer'),('breitling','Superocean'),('breitling','Chronomat'),('breitling','Avenger'),
  ('tag-heuer','Carrera'),('tag-heuer','Monaco'),('tag-heuer','Aquaracer'),('tag-heuer','Formula 1'),
  ('tudor','Black Bay'),('tudor','Pelagos'),('tudor','Ranger'),('tudor','Royal'),
  ('grand-seiko','Snowflake'),('grand-seiko','Spring Drive'),('grand-seiko','Heritage'),
  ('longines','Master Collection'),('longines','HydroConquest'),('longines','Spirit'),('longines','DolceVita'),
  ('tissot','PRX'),('tissot','Seastar'),('tissot','Le Locle'),('tissot','Gentleman'),
  ('oris','Aquis'),('oris','Divers Sixty-Five'),('oris','Big Crown'),
  ('seiko','Prospex'),('seiko','Presage'),('seiko','5 Sports'),
  ('casio','G-Shock'),('casio','Edifice'),
  ('cartier-jewelry','Love Bracelet'),('cartier-jewelry','Juste un Clou'),('cartier-jewelry','Trinity'),('cartier-jewelry','Panthère de Cartier'),('cartier-jewelry','Clash de Cartier'),('cartier-jewelry','Tank (Jewelry)'),
  ('van-cleef-arpels','Alhambra'),('van-cleef-arpels','Frivole'),('van-cleef-arpels','Perlée'),('van-cleef-arpels','Lucky Spring'),('van-cleef-arpels','Two Butterfly'),
  ('bulgari','Serpenti'),('bulgari','B.zero1'),('bulgari','Divas'' Dream'),('bulgari','Bulgari Bulgari'),
  ('harry-winston','Winston Cluster'),('harry-winston','Lily Cluster'),('harry-winston','Sunflower'),
  ('graff','Butterfly'),('graff','Spiral'),('graff','Gyre'),
  ('tiffany','Tiffany T'),('tiffany','Tiffany HardWear'),('tiffany','Tiffany Lock'),('tiffany','Return to Tiffany'),('tiffany','Tiffany Setting'),('tiffany','Victoria'),
  ('chopard','Happy Diamonds'),('chopard','Ice Cube'),('chopard','Happy Hearts'),('chopard','L''Heure du Diamant'),
  ('piaget','Possession'),('piaget','Limelight'),('piaget','Altiplano'),
  ('pomellato','Nudo'),('pomellato','Iconica'),('pomellato','Sabbia'),
  ('david-yurman','Cable Classics'),('david-yurman','Cable Bracelet'),('david-yurman','Petite Pavé'),
  ('boucheron','Serpent Bohème'),('boucheron','Quatre'),('boucheron','Jack de Boucheron'),
  ('mikimoto','Akoya Pearl Strand'),('mikimoto','Pearl Stud Earrings'),
  ('pandora','Moments Bracelet'),('pandora','Charms'),
  ('swarovski','Angelic'),('swarovski','Attract'),
  ('hermes','Birkin'),('hermes','Kelly'),('hermes','Constance'),('hermes','Lindy'),('hermes','Garden Party'),
  ('chanel','Classic Flap'),('chanel','2.55 Reissue'),('chanel','Boy Bag'),('chanel','19 Bag'),
  ('louis-vuitton','Neverfull'),('louis-vuitton','Speedy'),('louis-vuitton','Capucines'),('louis-vuitton','Alma'),('louis-vuitton','OnTheGo'),
  ('dior','Lady Dior'),('dior','Book Tote'),('dior','Saddle'),('dior','Caro'),
  ('goyard','Saint Louis'),('goyard','Artois'),('goyard','Anjou'),
  ('bottega-veneta','Jodie'),('bottega-veneta','Cassette'),('bottega-veneta','Andiamo'),('bottega-veneta','Arco'),
  ('celine','Luggage'),('celine','Belt Bag'),('celine','Triomphe'),
  ('loewe','Puzzle'),('loewe','Hammock'),('loewe','Flamenco'),
  ('prada','Galleria'),('prada','Re-Edition'),('prada','Cleo'),
  ('gucci','GG Marmont'),('gucci','Dionysus'),('gucci','Jackie 1961'),('gucci','Bamboo 1947'),
  ('saint-laurent','Loulou'),('saint-laurent','Kate'),('saint-laurent','Sac de Jour'),
  ('coach','Tabby'),('coach','Willow'),
  ('michael-kors','Jet Set'),
  ('kate-spade','Knott')
ON CONFLICT (brand_slug, name) DO NOTHING;