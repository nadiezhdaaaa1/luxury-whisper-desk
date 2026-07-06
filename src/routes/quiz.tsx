import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuizFlow } from "@/components/quiz/QuizFlow";
import { EmailGate } from "@/components/quiz/EmailGate";
import { AhaReveal } from "@/components/quiz/AhaReveal";
import {
  EMPTY_ANSWERS,
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

  useEffect(() => {
    const draft = readDraft();
    if (draft) setAnswers(draft);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  // Listen for auth changes while on this page so a magic-link callback lands on /app.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/app";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function persist(a: QuizAnswers) {
    setAnswers(a);
    writeDraft(a);
  }

  // If aha is requested but the draft is somehow incomplete, snap back.
  useEffect(() => {
    if (phase === "aha" && (!draftIsComplete(answers) || !answers.email)) {
      setPhase("quiz");
    }
  }, [phase, answers]);

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

  if (!draftIsComplete(answers) || !answers.email) return null;
  return <AhaReveal answers={answers} email={answers.email} />;
}
