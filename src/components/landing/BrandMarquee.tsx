const brands = [
  "Patek Philippe", "Rolex", "Tudor", "Audemars Piguet", "Omega",
  "TAG Heuer", "Cartier", "Van Cleef & Arpels", "Longines",
  "Bottega Veneta", "Celine", "Tiffany & Co.", "David Yurman", "Bulgari",
];

function Row({ reverse = false }: { reverse?: boolean }) {
  const items = [...brands, ...brands];
  return (
    <div className="relative overflow-hidden">
      <div className={`flex gap-10 whitespace-nowrap py-4 ${reverse ? "marquee-reverse" : "marquee"}`}>
        {items.map((b, i) => (
          <span
            key={`${b}-${i}`}
            className="text-lg sm:text-xl font-bold tracking-[0.01em] uppercase text-muted-foreground/80"
            style={{ fontFamily: '"Montserrat", sans-serif' }}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BrandMarquee() {
  return (
    <section className="bg-background">
      <div className="container-page pb-16 lg:pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Track the brands collectors actually watch
          </h2>
        </div>

        <div className="mt-12 relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
               style={{ background: "linear-gradient(to right, var(--background), transparent)" }} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
               style={{ background: "linear-gradient(to left, var(--background), transparent)" }} />
          <Row />
        </div>

        <p className="mt-12 text-xs text-muted-foreground max-w-2xl mx-auto text-center">
          Brand names are shown as trackable categories and user interests. Price.you is not affiliated with these brands
        </p>
      </div>
    </section>
  );
}
