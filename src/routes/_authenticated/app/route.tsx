import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/app/DashboardShell";
import { fetchMyProfile } from "@/lib/profile";
import { accessQueryOptions } from "@/lib/access";
import { clearDraftV3, draftIsCompleteV3, readDraftV3, type RoleV3 } from "@/lib/quiz-v3";
import { saveQuizAnswersV3 } from "@/lib/quiz-v3.functions";
import { track } from "@/lib/analytics";
import { useSeedWatchlistFromProfile } from "@/hooks/use-seed-watchlist";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "PriceYou Dashboard" }, { name: "robots", content: "noindex" }],
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
  useSeedWatchlistFromProfile();


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
        await queryClient.invalidateQueries({ queryKey: ["access"] });
      } catch (e) {
        handoffRan.current = false; // allow retry
        setHandoffError(e instanceof Error ? e.message : "Save failed");
      }
    })();
  }, [isLoading, profile, save, queryClient]);

  // Access gate. Order is load-bearing. Quiz first, credentials second:
  // reversed, a paid visitor is asked for a password before ever seeing the
  // reveal they paid for.
  //
  // The quiz decision reads profile.quiz_completed from the already-loaded
  // ["me"] query — synchronous, no second round-trip. Only the credentials
  // check awaits ["access"], because `credentials` can only be answered by the
  // Auth admin API server-side.
  useEffect(() => {
    if (isLoading || !profile) return;

    if (!profile.quiz_completed) {
      // Wait for a running landing-draft handoff to finish before redirecting.
      const draft = readDraftV3();
      if (draft && draftIsCompleteV3(draft)) return;
      if (!isQuizRoute) navigate({ to: "/app/quiz", replace: true });
      return;
    }

    let cancelled = false;
    void (async () => {
      // ensureQueryData → one fetch per 30s window, shared across routes.
      const access = await queryClient.ensureQueryData(accessQueryOptions());
      if (cancelled) return;
      if (!access.credentials) {
        // Live: accounts created by the billing webhook carry
        // app_metadata.needs_credentials until a password is set or an identity
        // is linked. Quiz still wins over this — a paid visitor answers the
        // questions before being asked for a password.
        navigate({ to: "/onboarding/credentials", replace: true });
      }

    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, profile, isQuizRoute, navigate, queryClient]);



  // The quiz page owns the full screen — render bare, no dashboard chrome.
  if (isQuizRoute) return <Outlet />;

  return (
    <>
      {handoffError ? (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-destructive/40 bg-destructive/10 px-4 py-3">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium">Your onboarding answers haven't been saved yet.</span>
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
            <button
              className="underline text-muted-foreground"
              onClick={() => navigate({ to: "/app/quiz" })}
            >
              Redo setup
            </button>
            <button
              className="underline text-muted-foreground"
              onClick={() => setHandoffError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <DashboardShell />
    </>
  );
}
