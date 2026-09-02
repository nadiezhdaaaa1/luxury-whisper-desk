

const cards = [
  {
    label: "Primary",
    title: "For resellers",
    text: "Find great buying opportunities before everyone else.",
    bullets: [
      "Retail price-rise alerts, first",
      "Brand watchlist with target prices and gaps",
      "Drop and discount price alerts by brand",
    ],
    primary: true,
  },
  {
    label: "Collectors",
    title: "For collectors",
    text: "Keep everything you own organized and always know what's in your collection.",
    bullets: [
      "Total portfolio value and history",
      "Category breakdown and movers",
      "Photo and description for each piece",
    ],
  },
  {
    label: "Buyers",
    title: "For buyers before increases",
    text: "Planning your next purchase? We'll help you buy at the right time.",
    bullets: [
      "Buy before the next retail rise",
      "New-collection and drop alerts",
      "Which models hold their value",
    ],
  },
];

export function Audience() {
  return (
    <section id="audience" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Who it's for</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Made for resellers, collectors, and buyers who time it right
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-px bg-surface-3 overflow-hidden rounded-sm border border-surface-3">
          {cards.map((c) => (
            <div key={c.title} className="p-7 pb-9 lg:p-9 lg:pb-11 flex flex-col bg-surface-raised">
              <span
                className="inline-flex self-start text-[13px] font-display font-semibold uppercase tracking-[1.54px] px-2.5 py-1 rounded-full text-white bg-brand-red-strong"
              >
                {c.label}
              </span>
              <h3 className="mt-4 font-display font-semibold text-2xl">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
              <ul className="mt-5 space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    {/* Comp 318:3928: the 20x20 checkmark box has NO background
                        (fills is empty) and the tick is a 1.5-weight stroke.
                        Do not reinstate a tinted disc here. */}
                    <span className="mt-0.5 h-5 w-5 grid place-items-center shrink-0 text-positive">
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                    </span>

                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
