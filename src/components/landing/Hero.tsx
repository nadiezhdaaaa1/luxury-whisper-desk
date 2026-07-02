import { ArrowRight, ArrowUpRight, Bell, TrendingUp, Target, Sparkles } from "lucide-react";

function Sparkline() {
  return (
    <svg viewBox="0 0 120 36" className="w-full h-9" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--positive)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--positive)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 28 L15 24 L30 26 L45 18 L60 20 L75 12 L90 14 L105 6 L120 8 L120 36 L0 36 Z" fill="url(#sp)" />
      <path d="M0 28 L15 24 L30 26 L45 18 L60 20 L75 12 L90 14 L105 6 L120 8" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft abstract background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full blur-3xl opacity-60"
             style={{ background: "radial-gradient(closest-side, oklch(0.92 0.035 85 / 0.9), transparent)" }} />
        <div className="absolute top-40 -left-40 h-[380px] w-[380px] rounded-full blur-3xl opacity-50"
             style={{ background: "radial-gradient(closest-side, oklch(0.9 0.02 145 / 0.4), transparent)" }} />
      </div>

      <div className="container-page pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="mx-auto max-w-3xl text-center rise-in">
          <span className="eyebrow justify-center">
            <Sparkles className="h-3 w-3 text-champagne" /> Luxury price intelligence
          </span>
          <h1 className="mt-5 font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-foreground">
            Buy before luxury{" "}
            <span className="italic font-medium text-champagne">prices rise</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Price-rise signals, drop alerts, and a private portfolio dashboard for watches, jewelry, and bags — in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/start" className="btn-primary w-full sm:w-auto">
              Start tracking free <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#how" className="btn-ghost w-full sm:w-auto">See how it works</a>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Built for collectors and resellers tracking $5K+ portfolios
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 lg:mt-20 relative">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {/* Signal card (main) */}
            <div className="card-soft p-5 md:col-span-4 md:row-span-2 relative overflow-hidden">
              <div aria-hidden className="absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl opacity-50"
                   style={{ background: "radial-gradient(closest-side, oklch(0.92 0.035 85 / 0.9), transparent)" }} />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-champagne-soft px-3 py-1 text-[11px] font-display font-semibold text-foreground/80">
                  <Bell className="h-3 w-3" /> Retail increase
                </span>
                <span className="text-[11px] text-muted-foreground">2 min ago</span>
              </div>
              <h3 className="mt-4 font-display font-semibold text-xl text-foreground leading-snug">
                Hermès — retail prices expected to rise
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">3 pieces on your watchlist affected.</p>

              <div className="mt-5 space-y-2">
                {[
                  ["Cartier Love", "New collection", "positive"],
                  ["AP Royal Oak", "Discount spotted", "alert"],
                  ["Rolex Daytona", "Resale +12%", "positive"],
                ].map(([name, note, tone]) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-hairline bg-surface/70 px-3 py-2">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <span className={`text-xs font-display font-semibold ${tone === "positive" ? "text-positive" : "text-alert"}`}>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio value */}
            <div className="card-soft p-5 md:col-span-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-positive" /> Portfolio value
              </div>
              <div className="mt-2 font-display font-bold text-3xl tracking-tight">$128,450</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-positive">
                <ArrowUpRight className="h-3 w-3" /> +12.4%
              </div>
              <div className="mt-3"><Sparkline /></div>
            </div>

            {/* Watchlist target */}
            <div className="card-soft p-5 md:col-span-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-champagne" /> Target price reached
              </div>
              <div className="mt-2 font-display font-semibold text-lg">Rolex Daytona</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Gap to target</span>
                <span className="font-display font-semibold text-positive">+12%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full w-[78%] rounded-full" style={{ background: "var(--champagne)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
