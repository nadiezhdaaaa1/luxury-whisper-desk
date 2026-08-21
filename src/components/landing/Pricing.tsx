import { PAYWALL_CARDS, PAYWALL_SIGNALS } from "@/lib/subscription";

const FRAME_BY_ID: Record<string, string> = {
  trial: "price-frame-neutral",
  quarterly: "price-frame-accent",
  annual: "price-frame-annual",
};

export function Pricing() {
  return (
    <section id="pricing" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Try it free — or pay less up front
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {PAYWALL_CARDS.map((p) => {
            const isAnnual = p.id === "annual";
            const isQuarterly = p.id === "quarterly";
            const mutedClass = isAnnual ? "text-[#5b5a57]" : "text-muted-foreground";

            return (
              // Per the approved design, Quarterly's inner card sits 4px higher than
              // the other two (4px frame + 24px strip = 28px, vs 28px wrapper pad +
              // 4px frame = 32px). Changing lg:pt-[28px] to lg:pt-[24px] here would
              // align all three card tops — the offset is intentional.
              <div
                key={p.id}
                className={`flex ${isQuarterly ? "" : "pt-0 lg:pt-[28px]"}`}
              >
                <div className={`price-frame ${FRAME_BY_ID[p.id] ?? ""} flex-1`}>
                  {isQuarterly && (
                    <div className="pt-[2px] pb-[4px] flex items-center justify-center">
                      <span className="font-display font-extrabold text-[12px] leading-[18px] tracking-[1.1645px] uppercase text-primary">
                        Most popular
                      </span>
                    </div>
                  )}

                  <div className="card-soft p-7 flex flex-1 flex-col">
                    <h3 className="price-plan-name font-display text-[20px] leading-[32px] tracking-[-0.8253px]">
                      {p.name}
                    </h3>

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
                      {p.note && (
                        <p className="font-display font-semibold text-[14px] leading-[23.1px] text-positive">
                          {p.note}
                        </p>
                      )}
                    </div>

                    <div className="pt-[16px] flex-1">
                      <p className="font-display font-semibold text-[13.5px] leading-[19.575px] tracking-[-0.1121px] text-foreground">
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
                      <a
                        href={p.href}
                        className={`${isAnnual ? "btn-primary" : "btn-secondary"} w-full`}
                      >
                        {p.cta}
                      </a>
                    </div>

                    <div className="pt-[12px] px-[4px]">
                      <p className={`font-display text-[12px] leading-[18px] ${mutedClass}`}>
                        {p.fineprint}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
