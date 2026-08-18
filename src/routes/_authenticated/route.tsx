import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-primary text-sm min-h-11"
          >
            Try again
          </button>
          <Link to="/app" className="btn-secondary text-sm min-h-11">Dashboard</Link>
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
        <Link to="/app" className="btn-primary mt-6 inline-flex text-sm min-h-11">Go to dashboard</Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // Enforce MFA when enrolled
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
  errorComponent: AuthedErrorComponent,
  notFoundComponent: AuthedNotFound,
});
