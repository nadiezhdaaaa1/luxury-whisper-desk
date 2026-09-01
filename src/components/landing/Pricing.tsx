import { PAYWALL_CARDS, PAYWALL_SIGNALS } from "@/lib/subscription";
import { track } from "@/lib/analytics";
import { usePointerGlow } from "@/hooks/use-pointer-glow";
import { Link } from "@tanstack/react-router";

const FRAME_BY_ID: Record<string, string> = {
  monthly: "price-frame-neutral",
  quarterly: "price-frame-neutral",
  annual: "price-frame-annual",
};

export function Pricing() {
  // The pointer glow is deliberately reserved for the page's two primary
  // conversion targets — the hero CTA and the Annual card — not applied to
  // every btn-primary. This inconsistency is intentional: don't "fix" it by
  // adding the hook everywhere or removing it here.
  const glowRef = usePointerGlow<HTMLAnchorElement>();

  return (
    <section id="pricing" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            One plan. Three ways to pay.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            No free tier, no trial. Pay for a quarter or a year up front and the price drops;
            monthly is full price.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {PAYWALL_CARDS.map((p) => {
            const isAnnual = p.id === "annual";
            const mutedClass = "text-muted-foreground";

            return (
              // The featured (Annual) card carries the flag strip, so the other
              // two are padded down to keep the card bodies aligned.
              <div key={p.id} className={`flex ${p.flag ? "" : "pt-0 lg:pt-[28px]"}`}>
                <div className={`price-frame ${FRAME_BY_ID[p.id] ?? ""} flex-1`}>
                  {p.flag && (
                    <div className="pt-[2px] pb-[4px] flex items-center justify-center">
                      <span className="font-display font-extrabold text-[12px] leading-[18px] tracking-[1.1645px] uppercase text-primary">
                        {p.flag}
                      </span>
                    </div>
                  )}

                  <div className="card-soft p-7 flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="price-plan-name font-display text-[20px] leading-[32px] tracking-[-0.8253px]">
                        {p.name}
                      </h3>
                      {p.badge && (
                        <span className="rounded-full bg-brand-red-strong px-2 py-[2px] font-display font-bold text-[13px] leading-[18px] text-white">
                          {p.badge}
                        </span>
                      )}

                    </div>

                    <div className="pt-[3px]">
                      <p
                        className={`font-display font-medium text-[13px] leading-[24px] tracking-[-0.0762px] ${mutedClass}`}
                      >
                        {p.subtitle}
                      </p>
                    </div>

                    <div className="pt-[16px] flex items-end gap-2">
                      <span className="font-display font-bold text-[36px] leading-[36px] tracking-[-0.4599px]">
                        {p.price}
                      </span>
                      <span
                        className={`font-display text-[13px] leading-[21.45px] tracking-[-0.0762px] ${mutedClass}`}
                      >
                        {p.unit}
                      </span>
                    </div>

                    {/* Always rendered, even when empty — the reserved height keeps
                        the three benefit lists on the same line. */}
                    <div className="h-[32px] pt-[5px] flex flex-col justify-center">
                      {p.renewal && (
                        <p className="font-display font-medium text-[14px] leading-[18px] text-foreground">
                          {p.renewal}
                        </p>

                      )}
                    </div>

                    <div className="pt-[16px] flex-1">
                      <p className="font-display text-[13.5px] leading-[19.575px] tracking-[-0.1121px] text-foreground opacity-90">
                        {PAYWALL_SIGNALS.lead}
                      </p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {PAYWALL_SIGNALS.items.map((b) => (
                          <li key={b} className="flex gap-[9px] opacity-90">
                            <span className="w-[15px] shrink-0 flex justify-center mt-[7px]">
                              <span className="h-[5px] w-[5px] rounded-full bg-primary" />
                            </span>
                            <span className="font-display text-[13.5px] leading-[19.575px] tracking-[-0.1121px] text-foreground">
                              {b}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-[24px] pb-[4px]">
                      <Link
                        to="/checkout"
                        search={{ plan: p.id }}
                        ref={isAnnual ? glowRef : undefined}
                        className={`${isAnnual ? "btn-primary" : "btn-secondary"} w-full`}
                      >
                        {p.cta}
                      </Link>
                    </div>

                    {/* FTC negative-option disclosure. Deliberately NOT fine print:
                        same size and weight as the benefits list, normal foreground
                        color. Do not shrink, gray out, or move this.
                        The block reserves the height of the tallest wrapped
                        disclosure at each 3-column width (3 lines at lg, 2 at xl)
                        so the CTA buttons line up across all three cards. */}
                    <div className="pt-[12px] px-[4px] lg:min-h-[70.75px] xl:min-h-[51.2px]">
                      <p className="font-display text-[13.5px] leading-[19.575px] tracking-[-0.1121px] text-foreground">
                        {p.disclosure}
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>



        {/* Dealer demand probe. Deliberately fine print: a fourth card at a published
            price would make every ordinary visitor stop and compare themselves to it.
            "references" is off-vocabulary on purpose — the app says "portfolio items"
            and "brand watchlist items", but "reference" is trade language, so only a
            dealer-scale reader recognises themselves in it. That mismatch IS the
            targeting; do not normalise it for consistency. The 100 is a judgement
            call, not derived from any cap. */}
        <div className="mt-8 flex flex-col items-center gap-1">
          <p className="text-center text-sm text-muted-foreground">
            Tracking more than 100 references?
          </p>
          <Link
            to="/contact"
            search={{ topic: "dealer" }}
            onClick={() => track("dealer_enquiry_clicked", { source: "pricing" })}
            className="btn-tertiary text-sm"
          >
            Talk to us →
          </Link>
        </div>
      </div>
    </section>
  );
}
