import { Bell, TrendingUp, Target, Compass, Gift, LayoutDashboard, ArrowUpRight } from "lucide-react";

function SignalFeed() {
  const items = [
    { name: "Hermès", note: "retail increase expected", tone: "alert" },
    { name: "Rolex Daytona", note: "resale gap +12%", tone: "positive" },
    { name: "Cartier Love", note: "new collection", tone: "positive" },
    { name: "AP Royal Oak", note: "discount spotted", tone: "alert" },
  ];
  return (
    <div className="mt-6 space-y-2">
      {items.map((i) => (
        <div key={i.name} className="flex items-center justify-between rounded-xl border border-hairline bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${i.tone === "positive" ? "bg-positive" : "bg-alert"}`} />
            <span className="font-medium text-sm text-foreground">{i.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{i.note}</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioUI() {
  const rows = [
    { name: "Rolex Submariner", value: "$14,200", change: "+12%" },
    { name: "Hermès Birkin", value: "$12,560", change: "+36%" },
    { name: "Patek Nautilus", value: "$102,000", change: "+8%" },
  ];
  return (
    <div className="mt-6 rounded-2xl border border-hairline bg-background p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Portfolio total</span>
        <span className="font-display font-bold text-2xl">$128,760</span>
      </div>
      <div className="mt-3 flex gap-1.5 h-2 rounded-full overflow-hidden">
        <div className="bg-champagne" style={{ width: "45%" }} />
        <div className="bg-positive/70" style={{ width: "30%" }} />
        <div className="bg-foreground/60" style={{ width: "25%" }} />
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
  { icon: Target, title: "Watchlist with target prices", text: "Set the price you'd buy at and get reminded the moment it's hit." },
  { icon: Compass, title: "Onboarding that fits you", text: "Choose categories, brands, and segment — luxury, mid, or mass. Alerts tuned from step one." },
  { icon: Gift, title: "Free to start", text: "Up to 10 portfolio items and 3 watchlist items — free, forever." },
  { icon: LayoutDashboard, title: "One private dashboard", text: "Watchlist, portfolio, signals, and billing in the browser. No marketplace, no pressure to sell." },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Features</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Signals first. Value always. One private dashboard.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Primary block */}
          <div className="lg:col-span-3 card-soft p-8 relative overflow-hidden">
            <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-60"
                 style={{ background: "radial-gradient(closest-side, oklch(0.92 0.035 85 / 0.9), transparent)" }} />
            <div className="flex items-center gap-2 text-xs font-display font-semibold tracking-[0.14em] uppercase text-champagne">
              <Bell className="h-3.5 w-3.5" /> Feature 01 · The core
            </div>
            <h3 className="mt-4 font-display text-2xl sm:text-3xl font-bold leading-tight">
              Know before the market moves
            </h3>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
              Push and email alerts on official retail price increases, new collections, discounts, and drops — for the exact brands you follow.
            </p>
            <SignalFeed />
          </div>

          {/* Secondary block */}
          <div className="lg:col-span-2 card-soft p-8">
            <div className="flex items-center gap-2 text-xs font-display font-semibold tracking-[0.14em] uppercase text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-positive" /> Feature 02
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight">
              See what your collection is worth
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Add watches, jewelry, and bags with photos, purchase price, current value, notes, and documents. Your total capital and category breakdown update instantly.
            </p>
            <PortfolioUI />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {small.map((f) => (
            <div key={f.title} className="card-soft p-6">
              <div className="h-9 w-9 rounded-xl grid place-items-center bg-surface border border-hairline">
                <f.icon className="h-4 w-4 text-foreground" />
              </div>
              <h4 className="mt-4 font-display font-semibold text-base">{f.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground mt-3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
