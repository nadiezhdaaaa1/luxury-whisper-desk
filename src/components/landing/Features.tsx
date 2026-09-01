import { Bell, TrendingUp, Target, Compass, Gift, LayoutDashboard } from "lucide-react";

function SignalFeed() {
  const items = [
    { name: "Hermès", note: "retail increase expected", color: "var(--brand-red-strong)" },
    { name: "Rolex Daytona", note: "resale gap +12%", color: "var(--positive)" },
    { name: "Omega Speedmaster", note: "new collection", color: "var(--positive)" },
    { name: "Tudor Black Bay", note: "discount applied", color: "var(--brand-red-strong)" },
  ];
  return (
    <div className="mt-6 space-y-2">
      {items.map((i) => (
        <div
          key={i.name}
          className="flex items-center justify-between rounded-lg px-4 py-3 bg-white/85 border border-white shadow-soft"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.color }} />
            <span className="font-medium text-sm text-foreground">{i.name}</span>
          </div>
          <span className="text-xs" style={{ color: i.color }}>
            {i.note}
          </span>
        </div>
      ))}
    </div>
  );
}

function PortfolioUI() {
  const rows = [
    { name: "Rolex Submariner", value: "$14,200", change: "+12%" },
    { name: "Hermès Birkin", value: "$23,000", change: "+36%" },
    { name: "Patek Nautilus", value: "$102,000", change: "+8%" },
  ];
  return (
    <div className="mt-6 lg:mt-auto rounded-xl p-4 bg-white/85 border border-white shadow-soft">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Portfolio total</span>
        <span className="font-display font-bold text-2xl">$139,200</span>
      </div>
      <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden">
        <div className="bg-primary-muted" style={{ width: "45%" }} />
        <div className="bg-positive/70" style={{ width: "30%" }} />
        <div style={{ width: "25%", backgroundColor: "var(--brand-red-strong)" }} />
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between text-sm">
            <span className="text-foreground">{r.name}</span>
            <span className="flex items-center gap-3">
              <span className="text-muted-foreground">{r.value}</span>
              <span className="font-display font-semibold text-positive text-xs">{r.change}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const small = [
  {
    icon: Target,
    title: "Brand watchlist with target prices",
    text: "Set the price you'd buy at and get reminded the moment it's hit.",
  },
  {
    icon: Compass,
    title: "Made for you from day one",
    text: "Choose categories, brands, and segment — luxury, mid, or mass. Alerts tuned from step one.",
  },
  {
    icon: Gift,
    title: "One plan, three ways to pay",
    text: "Full product from day one — unlimited portfolio and watchlist, every alert.",
  },
  {
    icon: LayoutDashboard,
    title: "Everything in one dashboard",
    text: "Brand watchlist, portfolio, price alerts, and billing in the browser. No marketplace, no pressure to sell.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-[496px]">
          <span className="eyebrow">Features</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Everything you need to track your collection
          </h2>
        </div>

        <div className="mt-12 overflow-hidden rounded-sm border border-surface-3">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-surface-3">
            {/* Primary block */}
            <div className="lg:col-span-3 bg-surface-raised p-6 lg:p-8 relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-display font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                <Bell className="h-3.5 w-3.5" /> Feature 01 · The core
              </div>
              <h3 className="mt-4 font-display text-2xl sm:text-3xl font-bold leading-tight">
                Stay one step ahead
              </h3>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
                We'll let you know when prices change, new collections arrive, or something you've
                been watching is finally worth buying.
              </p>
              <SignalFeed />
            </div>

            {/* Secondary block */}
            <div className="lg:col-span-2 bg-surface-raised p-6 lg:p-8 flex flex-col">
              <div className="flex items-center gap-2 text-xs font-display font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Feature 02
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold leading-tight">
                See what your collection is worth
              </h3>
              <p className="mt-3 text-[13px] sm:text-[15px] text-muted-foreground">
                Add watches, jewelry, and bags with photos, purchase price, current value, and
                notes. Your total capital and category breakdown update instantly.
              </p>
              <PortfolioUI />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-surface-3 border-t border-surface-3">
            {small.map((f) => (
              <div key={f.title} className="bg-surface-raised p-6 lg:p-8">
                <div
                  className="h-9 w-9 rounded-full grid place-items-center bg-brand-red-strong"
                >
                  <f.icon className="h-4 w-4 text-white" />
                </div>
                <h4 className="mt-4 font-display font-semibold text-base">{f.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
