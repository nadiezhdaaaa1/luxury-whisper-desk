import { useRef, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  TrendingUp,
  Target,
  Activity,
  AlertTriangle,
  Clock,
} from "lucide-react";
import cartierWatch from "@/assets/cartier-watch.webp";
import cartierBracelet from "@/assets/cartier-bracelet.webp";
import cartierRing from "@/assets/cartier-ring.webp";
import cartierTank from "@/assets/cartier-tank.webp";
import rolexDaytona from "@/assets/rolex-daytona.webp";
import { HeroDotField } from "./HeroDotField";
import { usePointerGlow } from "@/hooks/use-pointer-glow";

function Sparkline() {
  // Smooth wave that flows uninterrupted from left to right,
  // easing up into a gentle plateau on the right.
  const line =
    "M0 30 L6 29 L10 28 L14 29 L18 27 L22 27 L26 26 L30 27 L34 25 L38 25 L42 24 L46 24 L50 22 L54 20 L58 19 L62 17 L66 15 L70 14 L74 12 L78 11 L82 10 L86 10 L90 9 L94 9 L98 8 L102 8 L106 8 L110 8 L114 7 L120 7";
  const area = `${line} L120 36 L0 36 Z`;
  return (
    <svg
      viewBox="0 0 120 36"
      preserveAspectRatio="none"
      className="w-full h-full block"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--positive)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--positive)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sp)" />
      <path
        className="draw-line"
        pathLength={100}
        vectorEffect="non-scaling-stroke"
        d={line}
        stroke="var(--positive)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ctaRef = usePointerGlow<HTMLAnchorElement>();

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-background">
      <HeroDotField panelRef={panelRef} containerRef={sectionRef} />

      <div className="container-page relative z-10 pt-16 pb-[88px] lg:pt-24 lg:pb-[107px]">
        <div className="mx-auto max-w-5xl text-center rise-in">
          <span className="eyebrow justify-center">
            NEVER MISS THE RIGHT TIME TO BUY
          </span>
          <h1 className="mt-5 font-display text-[calc(2.25rem-2px)] sm:text-[calc(3rem-2px)] lg:text-[calc(3.75rem-2px)] leading-[1.05] tracking-tight text-foreground lg:whitespace-nowrap">
            Stay one step ahead of market prices
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            We keep an eye on your favorite brands, tell you when prices change, and help you keep
             track of everything you own
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link ref={ctaRef} to="/quiz" className="btn-primary btn-lg w-full sm:w-auto">
              Start your collection{"\u00a0"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="btn-secondary btn-lg w-full sm:w-auto">
              See how it works
            </a>
          </div>
          <p className="mt-10 text-xs text-muted-foreground">
            Built for collectors and resellers tracking $5K+ portfolios
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-14 lg:mt-20 relative">
          <div
            ref={panelRef}
            className="max-w-5xl mx-auto rounded-[36px] bg-black/[0.04] p-4 md:p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Row 1 — Signal card (big) */}
              <div className="card-soft p-5 md:col-span-4 relative overflow-hidden rise-in-delay-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span
                      className="inline-flex items-center gap-4 rounded-full px-3 py-1.5 text-xs font-display font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ backgroundColor: "var(--brand-red-tint)", color: "var(--brand-red-ink)" }}
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span
                          className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                          style={{ backgroundColor: "var(--brand-red-strong)" }}
                        />
                        <span
                          className="relative inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: "var(--brand-red-strong)" }}
                        />
                      </span>
                      Retail increase
                    </span>
                  </div>
                  <span className="text-[14px] text-muted-foreground">2 min ago</span>
                </div>
                <p className="mt-4 font-display text-2xl text-foreground leading-snug whitespace-pre-line">
                  Cartier{"\u00a0"}— retail prices expected to rise{"\n"}
                </p>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  Act before the increase reaches boutiques. 4 pieces on your brand watchlist
                  affected.
                </p>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[
                    { name: "Cartier Tortue watch", img: cartierWatch },
                    { name: "Cartier tricolor bracelet", img: cartierBracelet },
                    { name: "Cartier Clash ring", img: cartierRing },
                    { name: "Cartier Tank watch", img: cartierTank },
                  ].map(({ name, img }) => (
                    <div
                      key={name}
                      className="aspect-square rounded-xl overflow-hidden"
                      style={{ backgroundColor: "#F7F3EC" }}
                    >
                      <img src={img} alt={name} className="h-full w-full object-contain p-2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 1 — Portfolio value (small) */}
              <div className="card-soft p-5 md:col-span-2 rise-in-delay-2 flex flex-col">
                <span className="self-start inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-display font-semibold uppercase tracking-wider text-foreground whitespace-nowrap">
                  <TrendingUp className="h-3.5 w-3.5" /> Portfolio value
                </span>
                <div className="mt-4 font-display font-medium text-4xl tracking-tight">
                  $128,450
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-positive">
                  <ArrowUpRight className="h-4 w-4" /> +12.4%
                </div>
                <div className="mt-3 flex-1 min-h-[80px]">
                  <Sparkline />
                </div>
              </div>

              {/* Row 2 — Watchlist target (small) */}
              <div className="card-soft p-5 md:col-span-2 rise-in-delay-3 relative overflow-hidden">
                <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-display font-semibold uppercase tracking-wider text-foreground whitespace-nowrap">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Target reached
                </span>
                <div className="mt-4 flex items-end gap-5">
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-lg">Rolex Daytona</p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gap to target</span>
                        <span className="font-display font-semibold text-positive">+12%</span>
                      </div>
                      <div
                        className="mt-3 h-1.5 rounded-full overflow-hidden bg-positive-track"
                      >
                        <div
                          className="h-full rounded-full fill-bar"
                          style={{ background: "var(--positive)", "--bar-target": "78%" } as CSSProperties}
                        />
                      </div>
                    </div>
                  </div>
                  <img
                    src={rolexDaytona}
                    alt="Rolex Daytona"
                    className="h-[207px] w-[130px] flex-shrink-0 object-contain -mr-[68px] -mb-16 -mt-[36px]"
                  />
                </div>
              </div>

              {/* Row 2 — Latest price alerts (big) */}
              <div className="card-soft p-5 md:col-span-4 relative overflow-hidden rise-in-delay-4">
                <div
                  aria-hidden
                  className="absolute -left-24 -bottom-24 h-56 w-56 rounded-full blur-3xl opacity-40"
                  style={{
                    background:
                      "radial-gradient(closest-side, oklch(0.9 0.02 145 / 0.5), transparent)",
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-display font-semibold uppercase tracking-wider text-foreground whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Latest price alerts
                  </span>
                  <span className="text-[14px] text-muted-foreground">Updated live</span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { name: "Patek 5711", tag: "Resale", delta: "+8.2%", tone: "positive" },
                    {
                      name: "Chanel Classic Flap",
                      tag: "Retail hike",
                      delta: "+6.0%",
                      tone: "positive",
                    },
                    { name: "Omega Speedmaster", tag: "Price drop", delta: "−3.4%", tone: "alert" },
                    {
                      name: "Van Cleef Alhambra",
                      tag: "New reference",
                      delta: "+4.1%",
                      tone: "positive",
                    },
                  ].map(({ name, tag, delta, tone }) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-[12px] px-3 py-2"
                      style={{ backgroundColor: "#F7F3EC" }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{name}</div>
                        <div className="text-[11px] text-muted-foreground">{tag}</div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-display font-semibold shrink-0 ${tone === "positive" ? "text-positive" : "text-alert"}`}
                      >
                        {tone === "positive" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
