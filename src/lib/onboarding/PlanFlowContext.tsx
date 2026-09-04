// Single plan-flow owner for the landing page.
//
// Before this, `src/routes/index.tsx` (funnel `?plan=`) and
// `src/components/landing/Pricing.tsx` (plan cards) each called `usePlanFlow`,
// so TWO RegistrationModals mounted with independent `modalOpen` state. Radix
// stacked two overlays and locked `document.body` pointer-events; closing the
// one you saw left the other mounted, so the dialog appeared undismissable.
// The landing now has exactly one flow instance and one modal.
import { createContext, useContext, type ReactNode } from "react";
import { usePlanFlow, type PlanSource } from "@/lib/onboarding/usePlanFlow";

type PlanFlow = ReturnType<typeof usePlanFlow>;

const PlanFlowContext = createContext<PlanFlow | null>(null);

export function PlanFlowProvider({
  source,
  children,
}: {
  source: PlanSource;
  children: (flow: PlanFlow) => ReactNode;
}) {
  const flow = usePlanFlow({ source });
  return <PlanFlowContext.Provider value={flow}>{children(flow)}</PlanFlowContext.Provider>;
}

export function usePlanFlowContext(): PlanFlow {
  const ctx = useContext(PlanFlowContext);
  if (!ctx) throw new Error("usePlanFlowContext must be used inside <PlanFlowProvider>");
  return ctx;
}
