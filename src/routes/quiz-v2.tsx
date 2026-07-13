// V2 landing quiz route — full independent flow: quiz → email → aha (+ auth).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuizFlowV2 } from "@/components/quiz-v2/QuizFlowV2";
import { EmailGateV2 } from "@/components/quiz-v2/EmailGateV2";
import { AhaRevealV2 } from "@/components/quiz-v2/AhaRevealV2";
import {
  EMPTY_ANSWERS_V2,
  draftIsCompleteV2,
  readDraftV2,
  writeDraftV2,
  type QuizAnswersV2,
} from "@/lib/quiz-v2";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/quiz-v2")({
  head: () => ({
    meta: [
      { title: "Take the quiz (V2) — PriceYou" },
      {
        name: "description",
        content:
          "V2 onboarding: pick categories and brands with global search, then get a personalized preview.",
      },
      { property: "og:title", content: "Take the quiz (V2) — PriceYou" },
      {
        property: "og:description",
        content:
          "V2 onboarding: pick categories and brands with global search, then get a personalized preview.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingQuizV2Page,
});

type Phase = "quiz" | "email" | "aha";

function LandingQuizV2Page() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("quiz");
  const [answers, setAnswers] = useState<QuizAnswersV2>(EMPTY_ANSWERS_V2);

  useEffect(() => {
    const draft = readDraftV2();
    if (draft) setAnswers(draft);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/app";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function persist(a: QuizAnswersV2) {
    setAnswers(a);
    writeDraftV2(a);
  }

  useEffect(() => {
    if (phase === "aha" && (!draftIsCompleteV2(answers) || !answers.email)) {
      setPhase("quiz");
    }
  }, [phase, answers]);

  if (phase === "quiz") {
    return (
      <QuizFlowV2
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
      <EmailGateV2
        initial={answers.email}
        onBack={() => setPhase("quiz")}
        onSubmit={(email) => {
          const next = { ...answers, email };
          persist(next);
          track("email_captured", { variant: "v2" });
          setPhase("aha");
        }}
      />
    );
  }

  if (!draftIsCompleteV2(answers) || !answers.email) return null;
  return (
    <AhaRevealV2 answers={answers} email={answers.email} onBack={() => setPhase("email")} />
  );
}
