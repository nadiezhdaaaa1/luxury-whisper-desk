// Single plan-flow owner for the landing page.
//
// Before this, `src/routes/index.tsx` (funnel `?plan=`) and
// `src/components/landing/Pricing.tsx` (plan cards) each called `usePlanFlow`,
// so TWO RegistrationModals mounted with independent `modalOpen` state. Radix
// stacked two overlays and locked `document.body` pointer-events; closing the
// one you saw left the other mounted, so the dialog appeared undismissable.
// The landing now has exactly one flow instance and one modal.
import { createContext, useContext, type ReactNode } from "react";
import { RegistrationModal } from "@/components/auth/RegistrationModal";
import { usePlanFlow, type PlanSource } from "@/lib/onboarding/usePlanFlow";

type PlanFlow = ReturnType<typeof usePlanFlow>;

const PlanFlowContext = createContext<PlanFlow | null>(null);

export function PlanFlowProvider({
  source,
  children,
  commitBeforeCheckout = false,
}: {
  source: PlanSource;
  children: ReactNode;
  /** Commit the pending quiz draft after auth, before the checkout redirect. */
  commitBeforeCheckout?: boolean;
}) {
  const flow = usePlanFlow({ source, commitBeforeCheckout });
  return (
    <PlanFlowContext.Provider value={flow}>
      {children}
      <RegistrationModal
        open={flow.modalOpen}
        onOpenChange={flow.setModalOpen}
        googleRedirectTo={flow.googleRedirectTo}
        onAuthed={flow.onAuthed}
        source={flow.modalSource}
        plan={flow.pendingPlan}
      />
    </PlanFlowContext.Provider>
  );
}

export function usePlanFlowContext(): PlanFlow {
  const ctx = useContext(PlanFlowContext);
  if (!ctx) throw new Error("usePlanFlowContext must be used inside <PlanFlowProvider>");
  return ctx;
}
