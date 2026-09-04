// Plan step at the end of the public quiz. Same shell as the other steps, and
// the exact same plan cards as the landing pricing section (PlanCardsGrid).
// Clicking a card goes through usePlanFlow: intent is saved, an anonymous
// visitor gets the RegistrationModal, and the quiz answers are committed
// after auth and before checkout (commitBeforeCheckout).
import { ChevronLeft } from "lucide-react";
import { QuizHeader } from "@/components/quiz-v3/QuizHeader";
import { PlanCardsGrid } from "@/components/pricing/PlanCardsGrid";
import { PlanFlowProvider, usePlanFlowContext } from "@/lib/onboarding/PlanFlowContext";

export function QuizPlanStep({ onBack }: { onBack: () => void }) {
  return (
    <PlanFlowProvider source="aha_public" commitBeforeCheckout>
      <QuizPlanStepInner onBack={onBack} />
    </PlanFlowProvider>
  );
}

function QuizPlanStepInner({ onBack }: { onBack: () => void }) {
  const flow = usePlanFlowContext();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <QuizHeader />

      <div className="flex-1 mx-auto w-full max-w-6xl pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="px-4 sm:px-5">
          <div>
            <PlanCardsGrid onSelect={(plan) => void flow.selectPlan({ plan })} />
          </div>


          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary inline-flex items-center gap-1.5 min-w-[120px] pl-4 pr-5"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
