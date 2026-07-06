import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuizFlow } from "@/components/quiz/QuizFlow";
import { EmailGate } from "@/components/quiz/EmailGate";
import { AhaReveal } from "@/components/quiz/AhaReveal";
import {
  EMPTY_ANSWERS,
  clearDraft,
  draftIsComplete,
  readDraft,
  writeDraft,
  type QuizAnswers,
} from "@/lib/quiz";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Take the quiz — LuxTracker" },
      {
        name: "description",
        content:
          "Answer three questions and get a personalized preview of your luxury collection dashboard.",
      },
      { property: "og:title", content: "Take the quiz — LuxTracker" },
      {
        property: "og:description",
        content:
          "Answer three questions and get a personalized preview of your luxury collection dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingQuizPage,
});

type Phase = "quiz" | "email" | "aha";

function LandingQuizPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("quiz");
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);

  // Hydrate draft on mount; if user already logged in, bounce to /app so
  // the handoff runs there.
  useEffect(() => {
    const draft = readDraft();
    if (draft) setAnswers(draft);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(a: QuizAnswers) {
    setAnswers(a);
    writeDraft(a);
  }

  if (phase === "quiz") {
    return (
      <QuizFlow
        mode="landing"
        initial={answers}
        onChange={persist}
        onComplete={(a) => {
          persist(a);
          setPhase("email");
        }}
        submitLabel="Continue"
      />
    );
  }

  if (phase === "email") {
    return (
      <EmailGate
        initial={answers.email}
        onBack={() => setPhase("quiz")}
        onSubmit={(email) => {
          const next = { ...answers, email };
          persist(next);
          track("email_captured", {});
          setPhase("aha");
        }}
      />
    );
  }

  // aha — require a complete draft; otherwise send back to quiz.
  if (!draftIsComplete(answers) || !answers.email) {
    setPhase("quiz");
    return null;
  }

  // On mount of AhaReveal we also start listening for auth so a magic-link
  // return in the same tab lands on /app; clearing draft is done in /app.
  useAuthRedirectToApp();

  return <AhaReveal answers={answers} email={answers.email} />;
}

function useAuthRedirectToApp() {
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/app";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
