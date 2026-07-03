import { Check } from "lucide-react";
import tissotPrx from "@/assets/tissot-prx.png.asset.json";

const chips = [
  { label: "Watches", checked: true },
  { label: "Tissot", checked: true },
  { label: "Rolex", checked: false },
  { label: "Handbags", checked: false },
  { label: "Jewelry", checked: false },
  { label: "Sneakers", checked: false },
];

function Step1Visual() {
  return (
    <div className="mt-6 card-soft p-4 max-w-sm flex-1 flex items-center min-h-[240px]">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className={
              c.checked
                ? "inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-display font-semibold"
                : "inline-flex items-center gap-1.5 rounded-full bg-surface-2 border border-hairline text-foreground px-3 py-1.5 text-xs font-display font-medium"
            }
          >
            {c.checked ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : (
              <span className="h-3 w-3 rounded-full border border-hairline bg-background" />
            )}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step2Visual() {
  return (
    <div className="mt-6 card-soft p-4 max-w-sm flex-1 flex flex-col justify-center gap-4 min-h-[240px]">
      <div>
        <label className="block text-[11px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Item
        </label>
        <div className="flex items-center rounded-md border border-hairline bg-background px-3 py-2">
          <span className="text-sm text-foreground">Tissot PRX Powermatic 80</span>
          <span aria-hidden className="ml-0.5 inline-block h-4 w-px bg-foreground animate-pulse" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Turn on signals</span>
        <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary">
          <span className="absolute right-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
        </span>
      </div>
    </div>
  );
}

function Step3Visual() {
  return (
    <div className="mt-6 card-soft p-4 max-w-sm flex-1 min-h-[240px] relative overflow-hidden">
      <div className="flex items-end gap-4 h-full">
        <div className="flex-1 min-w-0 flex flex-col justify-end gap-3 py-1">
          <span
            className="self-start inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-display font-semibold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: "rgba(114, 0, 38, 0.1)", color: "#720026" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ backgroundColor: "#720026" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: "#720026" }}
              />
            </span>
            Price rise detected
          </span>
          <h4 className="font-display font-semibold text-base leading-snug text-foreground">
            Tissot PRX Powermatic 80
          </h4>
        </div>
        <img
          src={tissotPrx.url}
          alt="Tissot PRX Powermatic 80"
          className="h-[220px] w-[140px] flex-shrink-0 object-contain -mr-10 -mb-8 -mt-4"
        />
      </div>
    </div>
  );
}



const steps = [
  {
    n: "01",
    title: "Choose what you follow",
    text: "Pick categories, brands, and a segment — luxury, mid-market, or mass. Your alerts are tuned from the first step.",
    Visual: Step1Visual,
  },
  {
    n: "02",
    title: "Add an item or a target",
    text: "Add a piece you own to your portfolio, or a target to your watchlist with the price you'd buy at.",
    Visual: Step2Visual,
  },
  {
    n: "03",
    title: "Get signals, track value",
    text: "Retail price-rise alerts land first. Your private dashboard shows what the collection is worth.",
    Visual: Step3Visual,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20 lg:py-28 bg-surface/60 border-y border-hairline">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">How LuxTracker works</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            From collection to capital, in three steps
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Set up what you follow, add what you own or want, then let the signals come to you
          </p>
        </div>

        <div className="mt-20 relative">
          {/* Horizontal timeline line */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[7px] h-px bg-hairline"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 lg:gap-20 md:items-stretch">
            {steps.map((s, i) => (
              <div key={s.n} className="relative flex flex-col">
                {/* Dot */}
                <div
                  aria-hidden
                  className={`relative z-10 w-[15px] h-[15px] rounded-full ${
                    i === 0
                      ? "bg-primary ring-4 ring-primary/20"
                      : "bg-surface-2 border border-hairline"
                  }`}
                />

                <div className="mt-10 flex-1 flex flex-col">
                  <div className="font-display text-sm font-semibold tracking-[0.2em] text-primary">
                    STEP {s.n}
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-2xl leading-snug text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
                    {s.text}
                  </p>
                  <s.Visual />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
