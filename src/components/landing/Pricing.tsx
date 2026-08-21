import { Check } from "lucide-react";
import { PAYWALL_CARDS, PAYWALL_BENEFITS } from "@/lib/subscription";

export function Pricing() {
  return (
    <section id="pricing" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Try it free — or pay less up front.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PAYWALL_CARDS.map((p) => (
            <div
              key={p.id}
              className={`card-soft p-7 flex flex-col relative ${
                p.featured ? "ring-2 ring-positive shadow-lift" : ""
              }`}
            >
              <h3 className="font-display font-semibold text-xl">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display font-bold text-4xl tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.unit}</span>
              </div>
              {p.note && (
                <p className="mt-1 text-xs text-positive font-display font-semibold">{p.note}</p>
              )}

              <ul className="mt-6 space-y-3 flex-1">
                {PAYWALL_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-positive mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>

              <a
                href={p.href}
                className={`mt-7 ${p.featured ? "btn-primary" : "btn-secondary"} w-full`}
              >
                {p.cta}
              </a>
              <p className="mt-3 text-xs text-muted-foreground">{p.fineprint}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Cancel in two steps · Reminder before your card is charged
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tracking more than 100 references?{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Talk to us →
          </a>
        </p>
      </div>
    </section>
  );
}
