import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const qs = [
  {
    q: "Do I need a huge collection, or only ultra-luxury brands?",
    a: "No. PriceYou works whether you own a few favorite pieces or a large collection. Follow the brands you love, track what you own, and never miss an opportunity.",
  },
  {
    q: "Is PriceYou a marketplace?",
    a: "No. PriceYou is your private space to keep track of what you own, what you want, and what's happening with the brands you follow.",
  },
  {
    q: "How are item values calculated?",
    a: "On the current version you enter values manually or pick from a market reference. Automatic price updates come later. All values are estimates.",
  },
  {
    q: "Is this investment advice?",
    a: "No. Values and forecasts are estimates, not investment advice. You always make your own decisions.",
  },
  {
    q: "Which categories are supported?",
    a: "Watches and jewelry at launch, bags next. Fashion, art and interior objects come in a later phase.",
  },
  {
    q: "Can I track items I want to buy?",
    a: "Yes. Add targets to your watchlist with the price you'd buy at, and get reminded when the market reaches it.",
  },
  {
    q: "Is my collection public?",
    a: "No. Your portfolio is private by default. Nothing is shared unless you choose to.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-16 lg:py-24 bg-surface/60 border-t border-hairline">
      <div className="container-page">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <span className="eyebrow">FAQ</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
              Common questions
            </h2>
          </div>
          <div className="lg:col-span-2">
            <div className="card-soft divide-y divide-hairline overflow-hidden">
              {qs.map((item, i) => {
                const isOpen = open === i;
                return (
                  <div key={item.q}>
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-surface/50 transition-colors"
                    >
                      <span className="font-display font-semibold text-base sm:text-lg text-foreground">
                        {item.q}
                      </span>
                      <span className="h-8 w-8 rounded-full border border-hairline grid place-items-center shrink-0">
                        {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 -mt-1 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
