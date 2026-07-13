import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/app/DashboardShell";
import { fetchMyProfile } from "@/lib/profile";
import {
  clearDraftV3,
  draftIsCompleteV3,
  readDraftV3,
  type RoleV3,
} from "@/lib/quiz-v3";
import { saveQuizAnswersV3 } from "@/lib/quiz-v3.functions";
import { track } from "@/lib/analytics";
import { useSeedWatchlistFromProfile } from "@/hooks/use-seed-watchlist";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "PriceYou Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(saveQuizAnswersV3);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMyProfile,
  });

  const [handoffError, setHandoffError] = useState<string | null>(null);
  const handoffRan = useRef(false);
  const isQuizRoute = pathname === "/app/quiz";

  // Landing draft handoff: on first mount with a session, if a complete
  // draft exists in localStorage, persist it into the profile.
  useEffect(() => {
    if (handoffRan.current) return;
    if (isLoading || !profile) return;
    const draft = readDraftV3();
    if (!draft || !draftIsCompleteV3(draft)) return;
    if (profile.quiz_completed) {
      clearDraftV3();
      return;
    }
    handoffRan.current = true;
    void (async () => {
      try {
        await save({
          data: {
            segments: draft.segments,
            categories: draft.categories,
            brands: draft.brands,
            role: draft.role as RoleV3,
          },
        });
        clearDraftV3();
        track("quiz_completed_saved", { mode: "landing" });
        setHandoffError(null);
        await queryClient.invalidateQueries({ queryKey: ["me"] });
      } catch (e) {
        handoffRan.current = false; // allow retry
        setHandoffError(e instanceof Error ? e.message : "Save failed");
      }
    })();
  }, [isLoading, profile, save, queryClient]);

  // Quiz guard: incomplete quiz → redirect into /app/quiz.
  useEffect(() => {
    if (isLoading || !profile) return;
    if (profile.quiz_completed) return;
    // Wait for a running handoff attempt to finish before redirecting.
    const draft = readDraftV3();
    if (draft && draftIsCompleteV3(draft)) return;
    if (!isQuizRoute) {
      navigate({ to: "/app/quiz", replace: true });
    }
  }, [isLoading, profile, isQuizRoute, navigate]);

  // The quiz page owns the full screen — render bare, no dashboard chrome.
  if (isQuizRoute) return <Outlet />;

  return (
    <>
      {handoffError ? (
        <div className="fixed inset-x-0 top-0 z-50 bg-destructive/10 border-b border-destructive/40 px-4 py-2 text-sm text-center">
          Couldn't save your quiz answers.{" "}
          <button
            className="underline font-medium"
            onClick={() => {
              handoffRan.current = false;
              setHandoffError(null);
              // trigger effect
              void queryClient.invalidateQueries({ queryKey: ["me"] });
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      <DashboardShell />
    </>
  );
}
