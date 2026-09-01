import { Check } from "lucide-react";
import tissotPrx from "@/assets/tissot-prx.webp";

const categories = [
  { label: "Watches", checked: true },
  { label: "Jewelry", checked: false },
];

const brands = [
  { label: "Tissot", checked: true },
  { label: "Rolex", checked: false },
  { label: "Omega", checked: false },
  { label: "Cartier", checked: false },
  { label: "TAG Heuer", checked: false },
  { label: "Seiko", checked: false },
];

const chipClass = (checked: boolean) =>
  checked
    ? "inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground pl-[10px] pr-3 py-1.5 text-xs font-display font-semibold"
    : "inline-flex items-center gap-1.5 rounded-full bg-surface-2 text-foreground pl-[10px] pr-3 py-1.5 text-xs font-display font-medium";

function ChipRow({ items }: { items: { label: string; checked: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <span key={c.label} className={chipClass(c.checked)}>
          {c.checked ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : (
            <span className="h-3 w-3 rounded-full border border-hairline bg-background" />
          )}
          {c.label}
        </span>
      ))}
    </div>
  );
}

function Step1Visual() {
  return (
    <div className="mt-6 bg-white/85 border border-white rounded-card-media shadow-soft p-5 max-w-sm flex flex-col">
      <ChipRow items={categories} />
      <div className="my-4 border-t border-surface-3" />
      <ChipRow items={brands} />
    </div>
  );
}

function Step2Visual() {
  return (
    <div className="mt-6 bg-white/85 border border-white rounded-card-media shadow-soft p-5 max-w-sm flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center rounded-md border border-surface-3 bg-surface px-3 py-2">
          <span className="text-sm text-foreground">Tissot PRX Powermatic 80</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-surface-3 bg-surface px-3 py-2">
          <span className="text-sm text-foreground">Want to buy</span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
          </svg>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-auto">
        <span className="text-sm font-medium text-foreground leading-none">
          Turn on price alerts
        </span>
        <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
          <span className="absolute right-0.5 h-5 w-5 rounded-full bg-white shadow-sm" />
        </span>
      </div>
    </div>
  );
}

function Step3Visual() {
  return (
    <div className="mt-6 bg-white/85 border border-white rounded-card-media shadow-soft p-5 max-w-sm h-full relative overflow-hidden">
      <div className="flex flex-col gap-3 h-full pr-16">
        <div>
          <div className="text-[11px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Watch
          </div>
          <p className="font-display font-semibold text-lg leading-snug text-foreground">
            Tissot PRX Powermatic 80
          </p>
        </div>
        <div className="mt-auto flex flex-col items-start gap-2.5">
          <span
            className="font-display font-semibold text-base leading-none"
            style={{ color: "#720026" }}
          >
            +8%
          </span>
          <span
            className="mt-auto self-start inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-display font-semibold uppercase tracking-wider whitespace-nowrap"
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
            Retail increase
          </span>
        </div>
      </div>
      <img
        src={tissotPrx}
        alt="Tissot PRX Powermatic 80"
        className="absolute right-[-24px] bottom-[-66px] h-[248px] w-[102px] object-contain"
      />
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
    text: "Add a piece you own to your portfolio, or a target to your brand watchlist with the price you'd buy at.",
    Visual: Step2Visual,
  },
  {
    n: "03",
    title: "Get price alerts, track value",
    text: "Retail price-rise alerts land first. Your private dashboard shows what the collection is worth.",
    Visual: Step3Visual,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-16 lg:py-24 bg-surface border-y border-hairline">
      <div className="container-page">
        <div className="max-w-[840px]">
          <span className="eyebrow">How PriceYou works</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Three simple steps to smarter buying
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Choose your favorite brands, add what you own or want, and let us keep an eye on the
            market for you.
          </p>
        </div>

        <div className="mt-20 relative">
          {/* Horizontal timeline line */}
          <div aria-hidden className="absolute left-0 right-0 top-[7px] h-px bg-surface-3" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-9 md:gap-6 lg:gap-14 xl:gap-20 md:items-stretch">
            {steps.map((s, i) => (
              <div key={s.n} className="relative flex flex-col">
                {/* Dot */}
                <div
                  aria-hidden
                  className={`relative z-10 w-[15px] h-[15px] rounded-full ${
                    i === 0
                      ? "bg-brand-red-strong"
                      : "bg-surface border border-surface-3"
                  }`}
                  style={
                    i === 0
                      ? { boxShadow: "0 0 0 4px rgba(250, 46, 0, 0.2)" }
                      : undefined
                  }
                />

                <div className="mt-10 flex-1 flex flex-col">
                  <div className="font-display text-sm font-extrabold tracking-[2.8px] text-brand-red-strong">
                    STEP {s.n}
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-2xl leading-snug text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm md:min-h-[72px]">
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
