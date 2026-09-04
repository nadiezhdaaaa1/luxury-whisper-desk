// The one plan-card grid. Rendered by the landing pricing section AND by the
// plan step at the end of the public quiz, so the two can never drift.
// All copy (price, badge, renewal, disclosure) comes from PAYWALL_CARDS.
import { PAYWALL_CARDS, PAYWALL_SIGNALS } from "@/lib/subscription";
import { usePointerGlow } from "@/hooks/use-pointer-glow";
import type { PaywallCard } from "@/lib/subscription";

const FRAME_BY_ID: Record<string, string> = {
  monthly: "price-frame-neutral",
  quarterly: "price-frame-neutral",
  annual: "price-frame-annual",
};

export function PlanCardsGrid({ onSelect }: { onSelect: (id: PaywallCard["id"]) => void }) {
  // The pointer glow is deliberately reserved for the page's two primary
  // conversion targets — the hero CTA and the Annual card — not applied to
  // every btn-primary. This inconsistency is intentional: don't "fix" it by
  // adding the hook everywhere or removing it here.
  const glowRef = usePointerGlow<HTMLButtonElement>();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
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
                  <span className="font-display font-extrabold text-[12px] leading-[18px] tracking-[1.1645px] uppercase text-brand-red-ink">
                    {p.flag}
                  </span>
                </div>
              )}

              <div className="card-soft card-soft-strong p-7 flex flex-1 flex-col">
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
                    className={`font-display text-[13px] leading-[22px] tracking-[-0.0762px] ${mutedClass}`}
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
                          <span className="h-[5px] w-[5px] rounded-full bg-foreground" />
                        </span>
                        <span className="font-display text-[13.5px] leading-[19.575px] tracking-[-0.1121px] text-foreground">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-[24px] pb-[4px]">
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    ref={isAnnual ? glowRef : undefined}
                    className={`${isAnnual ? "btn-primary" : "btn-secondary"} w-full`}
                  >
                    {p.cta}
                  </button>
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
  );
}
