import { ArrowRight, ArrowUpRight, ArrowDownRight, Bell, TrendingUp, Target, Sparkles, Activity } from "lucide-react";

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
      <path className="draw-line" d="M0 28 L15 24 L30 26 L45 18 L60 20 L75 12 L90 14 L105 6 L120 8" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* Bento grid */}
        <div className="mt-14 lg:mt-20 relative">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {/* Row 1 — Signal card (big) */}
            <div className="card-soft p-5 md:col-span-4 relative overflow-hidden rise-in-delay-1">
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
                  { name: "Cartier Love", note: "New collection", tone: "positive", img: "https://picsum.photos/seed/cartier-love/80/80" },
                  { name: "AP Royal Oak", note: "Discount spotted", tone: "alert", img: "https://picsum.photos/seed/ap-royal-oak/80/80" },
                  { name: "Rolex Daytona", note: "Resale +12%", tone: "positive", img: "https://picsum.photos/seed/rolex-daytona/80/80" },
                ].map(({ name, note, tone, img }) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-hairline bg-surface/70 px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={img} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover border border-hairline" />
                      <span className="text-sm font-medium text-foreground truncate">{name}</span>
                    </div>
                    <span className={`text-xs font-display font-semibold shrink-0 ${tone === "positive" ? "text-positive" : "text-alert"}`}>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 1 — Portfolio value (small) */}
            <div className="card-soft p-5 md:col-span-2 rise-in-delay-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-positive" /> Portfolio value
              </div>
              <div className="mt-2 font-display font-bold text-3xl tracking-tight">$128,450</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-positive">
                <ArrowUpRight className="h-3 w-3" /> +12.4%
              </div>
              <div className="mt-3"><Sparkline /></div>
            </div>

            {/* Row 2 — Watchlist target (small) */}
            <div className="card-soft p-5 md:col-span-2 rise-in-delay-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-champagne" /> Target price reached
              </div>
              <div className="mt-2 font-display font-semibold text-lg">Rolex Daytona</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Gap to target</span>
                <span className="font-display font-semibold text-positive">+12%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full fill-bar" style={{ background: "var(--champagne)", ["--bar-target" as any]: "78%" }} />
              </div>
            </div>

            {/* Row 2 — Latest signals (big) */}
            <div className="card-soft p-5 md:col-span-4 relative overflow-hidden rise-in-delay-4">
              <div aria-hidden className="absolute -left-24 -bottom-24 h-56 w-56 rounded-full blur-3xl opacity-40"
                   style={{ background: "radial-gradient(closest-side, oklch(0.9 0.02 145 / 0.5), transparent)" }} />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-champagne-soft px-3 py-1 text-[11px] font-display font-semibold text-foreground/80">
                  <Activity className="h-3 w-3" /> Latest signals
                </span>
                <span className="text-[11px] text-muted-foreground">Live · updated now</span>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { name: "Patek 5711", tag: "Resale", delta: "+8.2%", tone: "positive" },
                  { name: "Chanel Classic Flap", tag: "Retail hike", delta: "+6.0%", tone: "positive" },
                  { name: "Omega Speedmaster", tag: "Price drop", delta: "−3.4%", tone: "alert" },
                  { name: "Van Cleef Alhambra", tag: "New reference", delta: "+4.1%", tone: "positive" },
                ].map(({ name, tag, delta, tone }) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-hairline bg-surface/70 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{name}</div>
                      <div className="text-[11px] text-muted-foreground">{tag}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-display font-semibold shrink-0 ${tone === "positive" ? "text-positive" : "text-alert"}`}>
                      {tone === "positive" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
