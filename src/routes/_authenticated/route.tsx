import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { accessQueryOptions } from "@/lib/access";

// /app/quiz, /app/settings and /onboarding/credentials are gate DESTINATIONS:
// each rule below skips itself so a redirect never chases its own tail.

function AuthedErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error("[_authenticated] error boundary:", error);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center rounded-2xl border border-hairline bg-surface p-8">
        <span className="eyebrow justify-center">Something broke</span>
        <h1 className="mt-3 font-display text-xl font-medium text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Give it another try, or head back to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary text-sm min-h-11"
          >
            Try again
          </button>
          <Link to="/app" className="btn-secondary text-sm min-h-11">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function AuthedNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center rounded-2xl border border-hairline bg-surface p-8">
        <span className="eyebrow justify-center">404</span>
        <h1 className="mt-3 font-display text-xl font-medium text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We can't find that page. It may have been moved or removed.
        </p>
        <Link to="/app" className="btn-primary mt-6 inline-flex text-sm min-h-11">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    // `getUser()` hits the network and can REJECT (offline, a dropped request,
    // a slow tab waking up). An unhandled rejection here escapes as a non-Error
    // value, which renders a blank screen instead of a route. Catch it, then
    // fall back to the locally stored session so a transient blip never signs
    // a valid user out.
    type AuthUser = Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
    let user: AuthUser = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error) user = data.user ?? null;
    } catch {
      user = null;
    }
    if (!user) {
      try {
        const { data } = await supabase.auth.getSession();
        user = data.session?.user ?? null;
      } catch {
        user = null;
      }
    }
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const data = { user };

    const path = location.pathname;
    const at = (p: string) => path === p || path.startsWith(p + "/");
    let access: Awaited<
      ReturnType<typeof context.queryClient.ensureQueryData<ReturnType<typeof accessQueryOptions>>>
    >;
    try {
      access = await context.queryClient.ensureQueryData(accessQueryOptions());
    } catch (e) {
      // Surface a real Error so the route's error boundary can render.
      throw e instanceof Error ? e : new Error("Couldn't load your account state.");
    }

    // /onboarding/credentials is terminal: once a user is standing on it, NO
    // later rule may fire, or a credential-less, un-onboarded account would be
    // bounced straight back out of the page it was just sent to.
    if (at("/onboarding/credentials")) {
      if (access.credentials) {
        // Nothing left to set up here — fall through to the normal ladder.
        if (!access.onboarded) throw redirect({ to: "/app/quiz" });
        if (!access.subscription) throw redirect({ to: "/app/settings", hash: "plans" });
        throw redirect({ to: "/app/signals" });
      }
      return { user: data.user, access };
    }

    // No way to sign back in → set that up first.
    if (!access.credentials) {
      throw redirect({ to: "/onboarding/credentials" });
    }
    // Not onboarded, paid or not → the in-app questionnaire. NEVER /quiz:
    // that route bounces every session back to /app.
    if (!access.onboarded) {
      if (!at("/app/quiz")) throw redirect({ to: "/app/quiz" });
      return { user: data.user, access };
    }
    // Onboarded but nothing bought → the plans section of settings.
    if (!access.subscription && !at("/app/settings") && !at("/app/quiz")) {
      throw redirect({ to: "/app/settings", hash: "plans" });
    }

    return { user: data.user, access };
  },
  component: () => <Outlet />,
  errorComponent: AuthedErrorComponent,
  notFoundComponent: AuthedNotFound,
});
