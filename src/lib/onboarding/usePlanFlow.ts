// One hook owning every plan decision surface.
//
// Account first, then payment: a checkout session is only ever started for an
// existing signed-in account, so every plan click funnels through here.
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { accessQueryOptions } from "@/lib/access";
import { track } from "@/lib/analytics";
import type { AuthMethod } from "@/lib/auth/authActions";
import type { RegistrationSource } from "@/components/auth/RegistrationModal";
import { commitPendingQuizDraft } from "@/lib/onboarding/commitOnboarding";
import {
  checkoutPathFor,
  clearPostAuthPath,
  savePlanIntent,
  setPostAuthPath,
  type PlanIntent,
} from "@/lib/onboarding/planIntent";

/** Where a plan decision was made. `aha_public` never opens the modal. */
export type PlanSource = RegistrationSource | "aha_public";

type Options = {
  source: PlanSource;
  /** Run the onboarding commit after auth and before the checkout redirect. */
  commitBeforeCheckout?: boolean;
};

export function usePlanFlow({ source, commitBeforeCheckout = false }: Options) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanIntent | null>(null);

  const continueWithPlan = useCallback(
    async (plan: PlanIntent) => {
      if (commitBeforeCheckout) {
        await commitPendingQuizDraft();
      }
      const access = await queryClient.fetchQuery(accessQueryOptions());
      clearPostAuthPath();
      if (access?.subscription) {
        // Already paying — never start a second checkout.
        await navigate({ to: "/app/settings", hash: "plans" });
        return;
      }
      track("checkout_redirect", { plan, source });
      await navigate({ to: "/checkout", search: { plan } });
    },
    [commitBeforeCheckout, navigate, queryClient, source],
  );

  const selectPlan = useCallback(
    async ({ plan }: { plan: PlanIntent }) => {
      // 1) Save the intent first, always — it must survive the modal, the
      //    Google redirect and abandonment.
      savePlanIntent(plan);
      setPendingPlan(plan);
      track("plan_selected", { plan, source });

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Public route on return, so the modal cannot re-open in a loop.
        setPostAuthPath(checkoutPathFor(plan));
        setModalOpen(true);
        return;
      }
      await continueWithPlan(plan);
    },
    [continueWithPlan, source],
  );

  const onAuthed = useCallback(
    async (_method: AuthMethod) => {
      setModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["access"] });
      if (pendingPlan) await continueWithPlan(pendingPlan);
    },
    [continueWithPlan, pendingPlan, queryClient],
  );

  const closeModal = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) clearPostAuthPath();
  }, []);

  const googleRedirectTo =
    typeof window === "undefined"
      ? "/"
      : window.location.origin + (pendingPlan ? checkoutPathFor(pendingPlan) : "/");

  return {
    selectPlan,
    modalOpen,
    setModalOpen: closeModal,
    onAuthed,
    pendingPlan,
    googleRedirectTo,
    /** Source to hand the modal; `aha_public` never renders one. */
    modalSource: (source === "aha_public" ? "landing_card" : source) as RegistrationSource,
  };
}
