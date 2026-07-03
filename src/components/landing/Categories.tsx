import watchImg from "@/assets/tag-heuer-carrera.png.asset.json";

const cats = [
  {
    title: "Watches",
    status: "At launch",
    text: "Track timepiece value, price history, and market timing.",
    brands: "Rolex · Patek Philippe · AP · Omega · Cartier",
    accent: true,
    image: watchImg.url,
  },
  {
    title: "Jewelry",
    status: "At launch",
    text: "Monitor fine jewelry values and brand releases.",
    brands: "Cartier · Van Cleef & Arpels · Tiffany · Bulgari",
    accent: true,
  },
  {
    title: "Bags",
    status: "Coming next",
    text: "Follow resale premiums and price signals for iconic bags.",
    brands: "Hermès · Chanel · Louis Vuitton · Celine",
  },
  {
    title: "Fashion",
    status: "Phase 2",
    text: "Ultra-premium pieces and investment wardrobe value.",
    brands: "Loro Piana · Brunello Cucinelli · Moncler",
  },
  {
    title: "Art & Interior",
    status: "Coming later",
    text: "Collectible art, designer furniture, and interior objects.",
    brands: "Sotheby's · Cassina · Flos",
  },
];

function Mark({ i }: { i: number }) {
  const paths = [
    "M12 4 L20 12 L12 20 L4 12 Z",
    "M4 12 A8 8 0 1 1 20 12 A8 8 0 1 1 4 12",
    "M4 4 H20 V20 H4 Z",
    "M4 20 Q12 4 20 20",
    "M4 12 H20 M12 4 V20",
  ];
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d={paths[i % paths.length]} />
    </svg>
  );
}

export function Categories() {
  return (
    <section id="categories" className="py-20 lg:py-28 bg-surface/60 border-y border-hairline">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Categories</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Built for the categories collectors actually care about.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((c, i) => (
            <div key={c.title} className="card-soft p-6 flex flex-col gap-3 relative overflow-hidden">
              {c.image && (
                <img
                  src={c.image}
                  alt={c.title}
                  className="pointer-events-none select-none absolute -right-16 -bottom-16 w-56 h-56 object-contain opacity-90"
                />
              )}
              <div className="flex items-center justify-end relative">
                <span className="text-[11px] font-display font-semibold px-2.5 py-1 rounded-full border border-hairline bg-background text-muted-foreground">
                  {c.status}
                </span>
              </div>
              <h3 className="font-display font-semibold text-xl mt-2 relative">{c.title}</h3>
              <p className="text-sm text-muted-foreground relative max-w-[70%]">{c.text}</p>
              <p className="text-xs text-foreground/70 font-display font-medium mt-auto pt-2 border-t border-hairline relative">{c.brands}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
