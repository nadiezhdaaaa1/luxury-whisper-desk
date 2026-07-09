import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ConsentProvider } from "../lib/consent";
import { CookieBanner } from "../components/consent/CookieBanner";
import { PreferencesModal } from "../components/consent/PreferencesModal";
import { HeroDotField } from "../components/landing/HeroDotField";

function NotFoundComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={containerRef}
      className="relative isolate overflow-hidden flex min-h-screen items-center justify-center bg-background px-4"
    >
      <HeroDotField containerRef={containerRef} panelRef={panelRef} />
      <div
        ref={panelRef}
        className="relative z-10 max-w-lg text-center rounded-2xl border border-hairline bg-surface px-8 py-12 sm:px-12 sm:py-14"
      >
        <span className="eyebrow justify-center">Lost the thread</span>
        <h1 className="mt-3 font-display font-medium tracking-tight text-foreground text-[120px] leading-[0.95]">
          404
        </h1>
        <h2 className="mt-4 font-display text-xl font-medium text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/" className="btn-primary min-w-[140px]">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center rounded-2xl border border-hairline bg-surface px-8 py-12 sm:px-12 sm:py-14">
        <span className="eyebrow justify-center">Something broke</span>
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary min-w-[120px]"
          >
            Try again
          </button>
          <a href="/" className="btn-ghost min-w-[120px]">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Price.you — Buy before luxury prices rise" },
      {
        name: "description",
        content:
          "Price-rise signals, drop alerts, and a private portfolio dashboard for watches, jewelry, and bags — in one place.",
      },
      { property: "og:title", content: "Price.you — Buy before luxury prices rise" },
      {
        property: "og:description",
        content:
          "Price-rise signals, drop alerts, and a private portfolio dashboard for watches, jewelry, and bags — in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Price.you — Buy before luxury prices rise" },
      {
        name: "twitter:description",
        content:
          "Signals first. Value always. A private dashboard for luxury collectors and resellers.",
      },
      { name: "description", content: "Price-rise signals, drop alerts, and a private portfolio dashboard for watches, jewelry, and bags — in one place." },
      { property: "og:description", content: "Price-rise signals, drop alerts, and a private portfolio dashboard for watches, jewelry, and bags — in one place." },
      { name: "twitter:description", content: "Price-rise signals, drop alerts, and a private portfolio dashboard for watches, jewelry, and bags — in one place." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/534bd7c7-469e-4e7a-8ea8-9e069790c133/id-preview-28fafefd--7107de7c-afc2-44e8-8a3d-e271f2c26295.lovable.app-1783345991970.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/534bd7c7-469e-4e7a-8ea8-9e069790c133/id-preview-28fafefd--7107de7c-afc2-44e8-8a3d-e271f2c26295.lovable.app-1783345991970.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Montserrat:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathRef = useRef(pathname);
  const [transitioning, setTransitioning] = useState(false);

  // Auth state → keep router + query cache in sync (avoid unfiltered fires).
  useEffect(() => {
    let mounted = true;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (!mounted) return;
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      (window as unknown as { __authUnsub?: () => void }).__authUnsub = () =>
        sub.subscription.unsubscribe();
    });
    return () => {
      mounted = false;
      (window as unknown as { __authUnsub?: () => void }).__authUnsub?.();
    };
  }, [router, queryClient]);

  // Before paint: if pathname changed, blank the screen so the outgoing page
  // never renders scrolled-to-top during navigation.
  useLayoutEffect(() => {
    if (prevPathRef.current !== pathname) {
      setTransitioning(true);
    }
  }, [pathname]);

  // After commit: scroll to top instantly, then reveal the new route on the
  // next frame so it paints already at the top.
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
    const raf = requestAnimationFrame(() => setTransitioning(false));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <ConsentProvider>
        {transitioning ? (
          <div className="min-h-screen bg-background" />
        ) : (
          <Outlet />
        )}
        <CookieBanner />
        <PreferencesModal />
      </ConsentProvider>
    </QueryClientProvider>
  );
}
