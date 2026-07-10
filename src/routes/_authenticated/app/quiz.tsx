import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QuizFlow } from "@/components/quiz/QuizFlow";
import { fetchMyProfile } from "@/lib/profile";
import { saveQuizAnswers } from "@/lib/quiz.functions";
import { track } from "@/lib/analytics";
import type { QuizAnswers, Role } from "@/lib/quiz";

export const Route = createFileRoute("/_authenticated/app/quiz")({
  head: () => ({
    meta: [{ title: "Quick setup — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: InAppQuizPage,
});

function InAppQuizPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(saveQuizAnswers);
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAnswers | null>(null);

  useEffect(() => {
    if (profile?.quiz_completed) navigate({ to: "/app", replace: true });
  }, [profile?.quiz_completed, navigate]);

  async function submit(a: QuizAnswers) {
    setLastAttempt(a);
    setError(null);
    setSaving(true);
    try {
      await save({
        data: {
          segments: a.segments,
          categories: a.categories,
          brands: a.brands,
          role: a.role as Role,
        },
      });
      track("quiz_completed_saved", { mode: "in-app" });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate({ to: "/app", replace: true });
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Couldn't save your answers.");
    }
  }

  return (
    <div>
      <QuizFlow
        mode="in-app"
        onComplete={submit}
        submitLabel={saving ? "Saving…" : "Finish setup"}
      />
      {error ? (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-md px-4">
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <div className="font-medium">Couldn't save your answers.</div>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            {lastAttempt ? (
              <button
                onClick={() => submit(lastAttempt)}
                className="btn-primary text-xs mt-3"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
