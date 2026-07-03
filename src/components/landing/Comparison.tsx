import { Check, Minus } from "lucide-react";

type Cell = "yes" | "partial" | "no";

const rows: { feature: string; sheet: Cell; market: Cell; lux: Cell }[] = [
  { feature: "Private collection portfolio", sheet: "yes", market: "no", lux: "yes" },
  { feature: "Total portfolio value", sheet: "partial", market: "partial", lux: "yes" },
  { feature: "Retail price-rise signals", sheet: "no", market: "no", lux: "yes" },
  { feature: "Drop and discount alerts", sheet: "no", market: "partial", lux: "yes" },
  { feature: "Watchlist with target prices", sheet: "partial", market: "partial", lux: "yes" },
  { feature: "Multi-category tracking", sheet: "partial", market: "partial", lux: "yes" },
  { feature: "No pressure to sell", sheet: "yes", market: "no", lux: "yes" },
];

function Ind({ v, hi = false }: { v: Cell; hi?: boolean }) {
  if (v === "yes")
    return (
      <span className={`inline-flex h-6 w-6 rounded-full items-center justify-center ${hi ? "bg-positive text-primary-foreground" : "bg-positive/15 text-positive"}`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (v === "partial")
    return (
      <span className="inline-flex h-6 w-6 rounded-full items-center justify-center bg-surface-2 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      </span>
    );
  return (
    <span className="inline-flex h-6 w-6 rounded-full items-center justify-center text-muted-foreground/60">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

export function Comparison() {
  return (
    <section className="py-20 lg:py-28 bg-surface/60 border-y border-hairline">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Why LuxTracker</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Not a spreadsheet. Not a marketplace.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            A private dashboard for your luxury capital — track what you own, what you want, and when the market moves.
          </p>
        </div>

        {/* Desktop table */}
        <div className="mt-12 hidden md:block overflow-hidden bg-white border border-hairline rounded-2xl shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-4 px-6 font-display font-semibold text-foreground">Features</th>
                <th className="py-4 px-6 font-display font-semibold text-muted-foreground text-center">Spreadsheet</th>
                <th className="py-4 px-6 font-display font-semibold text-muted-foreground text-center">Marketplace</th>
                <th className="py-4 px-6 font-display font-semibold text-foreground text-center">
                  LuxTracker
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-t border-hairline">
                  <td className="py-4 px-6 text-foreground/90">{r.feature}</td>
                  <td className="py-4 px-6 text-center"><Ind v={r.sheet} /></td>
                  <td className="py-4 px-6 text-center"><Ind v={r.market} /></td>
                  <td className="py-4 px-6 text-center"><Ind v={r.lux} hi /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked */}
        <div className="mt-8 md:hidden space-y-3">
          {rows.map((r) => (
            <div key={r.feature} className="card-soft p-4">
              <p className="font-display font-semibold text-sm">{r.feature}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                <div className="flex flex-col items-center gap-1.5"><Ind v={r.sheet} /><span>Sheet</span></div>
                <div className="flex flex-col items-center gap-1.5"><Ind v={r.market} /><span>Market</span></div>
                <div className="flex flex-col items-center gap-1.5"><Ind v={r.lux} hi /><span className="text-foreground font-semibold">LuxTracker</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
