// In-app quiz — quiz → save → reveal. Already authenticated, so the reveal
// runs in "in-app" mode and never attempts account creation; its right-hand
// column carries the plan and (when needed) the credential step.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QuizFlowV3 } from "@/components/quiz-v3/QuizFlowV3";
import { fetchMyProfile } from "@/lib/profile";
import { saveQuizAnswersV3 } from "@/lib/quiz-v3.functions";
import { track } from "@/lib/analytics";
import {
  EMPTY_ANSWERS_V3,
  clearDraftV3,
  readDraftV3,
  writeDraftV3,
  type QuizAnswersV3,
  type RoleV3,
} from "@/lib/quiz-v3";

export const Route = createFileRoute("/_authenticated/app/quiz")({
  head: () => ({
    meta: [{ title: "Quick setup — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: InAppQuizPage,
});

function InAppQuizPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(saveQuizAnswersV3);
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAnswersV3 | null>(null);
  const [initial] = useState<QuizAnswersV3>(() => readDraftV3() ?? EMPTY_ANSWERS_V3);
  // Phase 3: the reveal ends this flow too, so "Finish setup" no longer jumps
  // straight to /app.
  const [phase, setPhase] = useState<"quiz" | "reveal">("quiz");
  const [revealed, setRevealed] = useState<QuizAnswersV3 | null>(null);

  useEffect(() => {
    if (phase === "quiz" && profile?.quiz_completed) navigate({ to: "/app", replace: true });
  }, [phase, profile?.quiz_completed, navigate]);

  async function submit(a: QuizAnswersV3) {
    setLastAttempt(a);
    setError(null);
    setSaving(true);
    try {
      await save({
        data: {
          segments: a.segments,
          categories: a.categories,
          brands: a.brands,
          role: a.role as RoleV3,
        },
      });
      clearDraftV3();
      track("quiz_completed_saved", { mode: "in-app" });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["access"] });
      setSaving(false);
      setRevealed(a);
      setPhase("reveal");
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Couldn't save your answers.");
    }
  }

  if (phase === "reveal" && revealed) {
    return <AhaRevealV3 answers={revealed} mode="in-app" />;
  }

  return (

    <div>
      <QuizFlowV3
        mode="in-app"
        initial={initial}
        onChange={writeDraftV3}
        onComplete={submit}
        submitLabel={saving ? "Saving…" : "Finish setup"}
      />
      {error ? (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-md px-4">
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <div className="font-medium">Couldn't save your answers.</div>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            {lastAttempt ? (
              <button onClick={() => submit(lastAttempt)} className="btn-primary text-xs mt-3">
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
