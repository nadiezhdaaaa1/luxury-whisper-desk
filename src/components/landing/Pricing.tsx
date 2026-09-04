import { track } from "@/lib/analytics";
import { Link } from "@tanstack/react-router";
import { usePlanFlowContext } from "@/lib/onboarding/PlanFlowContext";
import { PlanCardsGrid } from "@/components/pricing/PlanCardsGrid";

export function Pricing() {
  // Account first, then payment: the card no longer links straight to
  // checkout — it records the plan and makes sure an account exists.
  // One modal owner for the whole landing page (see PlanFlowContext).
  const flow = usePlanFlowContext();

  return (
    <section id="pricing" className="py-16 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            One plan. Three ways to pay.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Get the monthly plan without commitment, or pay less with a quarterly or annual plan.
          </p>
        </div>

        <div className="mt-12">
          <PlanCardsGrid onSelect={(plan) => void flow.selectPlan({ plan })} />
        </div>

        {/* Dealer demand probe. The earlier fine-print treatment is superseded by
            comp 318:4313: 18px Inter semibold in full foreground, centred, with
            48px top padding and a 4px gap before the existing tertiary link. */}
        <div className="mt-12 flex flex-col items-center gap-1">
          <p className="text-center text-[18px] leading-[24px] font-semibold text-foreground">
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
