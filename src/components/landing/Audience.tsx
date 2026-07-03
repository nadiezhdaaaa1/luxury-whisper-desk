import { Check } from "lucide-react";

const cards = [
  {
    label: "Primary",
    labelColor: "#001d3d",
    title: "For resellers",
    text: "Track target items, price gaps, drops, and resale windows before they close.",
    bullets: [
      "Retail price-rise alerts, first",
      "Watchlist with target prices and gaps",
      "Drop and discount signals by brand",
    ],
    primary: true,
  },
  {
    label: "Collectors",
    labelColor: "#3d1e5a",
    title: "For collectors",
    text: "Know what your collection is worth, how it changes, and which pieces deserve attention.",
    bullets: [
      "Total portfolio value and history",
      "Category breakdown and movers",
      "Photos, receipts, and certificates",
    ],
  },
  {
    label: "Buyers",
    labelColor: "#034748",
    title: "For buyers before increases",
    text: "Follow favorite brands and get signals when retail prices, collections, or availability change.",
    bullets: [
      "Buy before the next retail rise",
      "New-collection and drop alerts",
      "Which models hold their value",
    ],
  },
];

export function Audience() {
  return (
    <section id="audience" className="py-20 lg:py-28">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Who it's for</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            For resellers, collectors, and smart luxury buyers.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-px bg-hairline overflow-hidden rounded-sm border border-hairline">
          {cards.map((c) => (
            <div
              key={c.title}
              className="p-7 pb-9 flex flex-col bg-background"
            >
              <span
                className="inline-flex self-start text-[11px] font-display font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: c.labelColor }}
              >
                {c.label}
              </span>
              <h3 className="mt-4 font-display font-semibold text-2xl">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
              <ul className="mt-5 space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-0.5 h-5 w-5 rounded-full grid place-items-center shrink-0"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--positive) 10%, transparent)",
                        color: "var(--positive)",
                      }}
                    >
                      <Check className="h-3 w-3" />
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
