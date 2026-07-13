// V3 landing quiz route — full independent flow: quiz → email → aha (+ auth).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuizFlowV3 } from "@/components/quiz-v3/QuizFlowV3";
import { EmailGateV3 } from "@/components/quiz-v3/EmailGateV3";
import { AhaRevealV3 } from "@/components/quiz-v3/AhaRevealV3";
import {
  EMPTY_ANSWERS_V3,
  draftIsCompleteV3,
  readDraftV3,
  writeDraftV3,
  type QuizAnswersV3,
} from "@/lib/quiz-v3";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/quiz-v3")({
  head: () => ({
    meta: [
      { title: "Take the quiz (V3) — PriceYou" },
      {
        name: "description",
        content:
          "V3 onboarding: pick categories and brands with global search, then get a personalized preview.",
      },
      { property: "og:title", content: "Take the quiz (V3) — PriceYou" },
      {
        property: "og:description",
        content:
          "V3 onboarding: pick categories and brands with global search, then get a personalized preview.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingQuizV3Page,
});

type Phase = "quiz" | "email" | "aha";

function LandingQuizV3Page() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("quiz");
  const [answers, setAnswers] = useState<QuizAnswersV3>(EMPTY_ANSWERS_V3);

  useEffect(() => {
    const draft = readDraftV3();
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

  function persist(a: QuizAnswersV3) {
    setAnswers(a);
    writeDraftV3(a);
  }

  useEffect(() => {
    if (phase === "aha" && (!draftIsCompleteV3(answers) || !answers.email)) {
      setPhase("quiz");
    }
  }, [phase, answers]);

  if (phase === "quiz") {
    return (
      <QuizFlowV3
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
      <EmailGateV3
        initial={answers.email}
        onBack={() => setPhase("quiz")}
        onSubmit={(email) => {
          const next = { ...answers, email };
          persist(next);
          track("email_captured", { variant: "v3" });
          setPhase("aha");
        }}
      />
    );
  }

  if (!draftIsCompleteV3(answers) || !answers.email) return null;
  return (
    <AhaRevealV3 answers={answers} email={answers.email} onBack={() => setPhase("email")} />
  );
}
