// The single onboarding commit helper.
//
// `saveQuizAnswersV3` stays the atomic account-scoped UPDATE (segments,
// categories, brands, role and quiz_completed together) — this only decides
// WHEN to call it, and makes the call a no-op when there is nothing to save.
import { saveQuizAnswersV3 } from "@/lib/quiz-v3.functions";
import { clearDraftV3, draftIsCompleteV3, readDraftV3, type RoleV3 } from "@/lib/quiz-v3";
import { track } from "@/lib/analytics";

/**
 * Commit the locally-held quiz draft, if there is a complete one.
 *
 * Idempotent by construction: the draft is cleared on success, so a second
 * call finds nothing and returns true without writing. `alreadyOnboarded`
 * short-circuits it entirely for accounts whose answers are already stored.
 */
export async function commitPendingQuizDraft(opts?: {
  alreadyOnboarded?: boolean;
  retries?: number;
}): Promise<boolean> {
  if (opts?.alreadyOnboarded) return true;
  const draft = readDraftV3();
  if (!draft || !draftIsCompleteV3(draft)) return true;

  const delays = opts?.retries === 0 ? [0] : [0, 500, 1500];
  let lastErr: unknown = null;
  for (const d of delays) {
    if (d) await new Promise((r) => setTimeout(r, d));
    try {
      await saveQuizAnswersV3({
        data: {
          segments: draft.segments,
          categories: draft.categories,
          brands: draft.brands,
          role: draft.role as RoleV3,
        },
      });
      clearDraftV3();
      track("quiz_v3_completed_saved", { mode: "landing" });
      return true;
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("[onboarding] commitPendingQuizDraft failed:", lastErr);
  track("quiz_v3_save_failed", { mode: "landing" });
  return false;
}
