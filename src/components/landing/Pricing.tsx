import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    subtitle: "Get started with no commitment",
    price: "$0",
    unit: "/ month",
    cta: "Get started free",
    href: "/start",
    benefits: [
      "Up to 10 portfolio items",
      "Up to 3 watchlist items",
      "Sample signals",
      "Manual value tracking",
    ],
  },
  {
    name: "Pro Monthly",
    subtitle: "Full access · cancel anytime",
    price: "$24.99",
    unit: "/ month",
    cta: "Go Pro",
    href: "/start?plan=pro",
    featured: true,
    badge: "Most popular",
    benefits: [
      "Unlimited portfolio and watchlist",
      "All signals — price rises, drops, and new collections",
      "Portfolio dashboard",
      "Advanced notifications and quiet hours",
    ],
  },
  {
    name: "Pro Annual",
    subtitle: "Best value for serious collectors",
    price: "$173.88",
    unit: "/ year",
    note: "≈ $14.49 / month · save 42%",
    cta: "Go annual",
    href: "/start?plan=annual",
    benefits: [
      "Everything in Pro Monthly",
      "Unlimited signals and dashboard",
      "Priority support",
      "Future automated value updates",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Start free. Upgrade when your collection grows.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`card-soft p-7 flex flex-col relative ${
                p.featured ? "ring-2 ring-positive shadow-lift" : ""
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-display font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full bg-primary text-primary-foreground shadow-soft">
                  {p.badge}
                </span>
              )}
              <h3 className="font-display font-semibold text-xl">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display font-bold text-4xl tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.unit}</span>
              </div>
              {p.note && <p className="mt-1 text-xs text-positive font-display font-semibold">{p.note}</p>}

              <ul className="mt-6 space-y-3 flex-1">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-positive mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>

              <a href={p.href} className={`mt-7 ${p.featured ? "btn-primary" : "btn-ghost"} w-full`}>
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Free plan forever · Cancel in two steps · Pause anytime · Reminder before billing
        </p>
      </div>
    </section>
  );
}
