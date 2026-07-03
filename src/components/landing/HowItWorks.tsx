const steps = [
  {
    n: "01",
    title: "Choose what you follow",
    text: "Pick categories, brands, and a segment — luxury, mid-market, or mass. Your alerts are tuned from the first step.",
  },
  {
    n: "02",
    title: "Add an item or a target",
    text: "Add a piece you own to your portfolio, or a target to your watchlist with the price you'd buy at.",
  },
  {
    n: "03",
    title: "Get signals, track value",
    text: "Retail price-rise alerts land first. Your private dashboard shows what the collection is worth.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20 lg:py-28 bg-surface/60 border-y border-hairline">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">How LuxTracker works</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            From collection to capital, in three steps
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Set up what you follow, add what you own or want, then let the signals come to you
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.n} className="card-soft p-6 relative overflow-hidden">
              <div className="font-display text-xs font-semibold tracking-[0.2em] text-champagne">
                STEP {s.n}
              </div>
              <h3 className="mt-4 font-display font-semibold text-xl leading-snug">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              <div aria-hidden className="mt-6 h-16 rounded-xl border border-hairline bg-surface relative overflow-hidden">
                <svg viewBox="0 0 200 60" className="absolute inset-0 w-full h-full" fill="none">
                  <path d="M0 40 Q50 10 100 30 T200 20" stroke="var(--champagne)" strokeWidth="1.2" opacity="0.6" />
                  <path d="M0 50 Q50 25 100 40 T200 30" stroke="var(--muted-foreground)" strokeWidth="1" opacity="0.3" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
