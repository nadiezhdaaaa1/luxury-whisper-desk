import { ArrowRight, TrendingUp, Bell, Target, LayoutGrid } from "lucide-react";

const cards = [
  { icon: TrendingUp, label: "Portfolio value", value: "$48,200", note: "+8.2%", tone: "positive" as const },
  { icon: Bell, label: "Signal received", value: "Rolex retail +8%", note: "Act now", tone: "alert" as const },
  { icon: Target, label: "Watchlist target", value: "Rolex Daytona", note: "Gap +12%", tone: "positive" as const },
  { icon: LayoutGrid, label: "Category breakdown", value: "Watches · Bags · Jewelry", note: "3 active", tone: "muted" as const },
];

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-page">
        <div className="relative card-soft overflow-hidden p-8 sm:p-12 lg:p-16">
          <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-70"
               style={{ background: "radial-gradient(closest-side, oklch(0.92 0.035 85 / 0.9), transparent)" }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full blur-3xl opacity-50"
               style={{ background: "radial-gradient(closest-side, oklch(0.9 0.02 145 / 0.5), transparent)" }} />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight">
                Start tracking your{" "}
                <span className="italic font-medium text-champagne">luxury capital.</span>
              </h2>
              <p className="mt-5 text-base text-muted-foreground max-w-lg">
                Follow your brands, add your first piece, and get the price-rise signal before the forums do — in one private dashboard.
              </p>
              <a href="/start" className="mt-8 btn-primary inline-flex">
                Start tracking free <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cards.map((c) => (
                <div key={c.label} className="rounded-2xl border border-hairline bg-background/80 backdrop-blur p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <c.icon className="h-3.5 w-3.5 text-champagne" /> {c.label}
                  </div>
                  <div className="mt-2 font-display font-semibold text-base text-foreground">{c.value}</div>
                  <div className={`mt-1 text-xs font-display font-semibold ${
                    c.tone === "positive" ? "text-positive" : c.tone === "alert" ? "text-alert" : "text-muted-foreground"
                  }`}>{c.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
