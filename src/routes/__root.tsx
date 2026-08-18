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
import { Toaster } from "@/components/ui/sonner";

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
          <a href="/" className="btn-secondary min-w-[120px]">
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
      { title: "PriceYou — Stay one step ahead of market prices" },
      {
        name: "description",
        content:
          "We keep an eye on your favorite brands, tell you when prices change, and help you keep track of everything you own.",
      },
      { property: "og:title", content: "PriceYou — Stay one step ahead of market prices" },
      {
        property: "og:description",
        content:
          "We keep an eye on your favorite brands, tell you when prices change, and help you keep track of everything you own.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PriceYou" },
      { property: "og:url", content: "https://luxury-whisper-desk.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PriceYou — Stay one step ahead of market prices" },
      {
        name: "twitter:description",
        content:
          "We keep an eye on your favorite brands, tell you when prices change, and help you keep track of everything you own.",
      },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/4e0c8485-8abd-4c84-a876-620513082641" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/4e0c8485-8abd-4c84-a876-620513082641" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Montserrat:wght@400;500;600;700;800&display=swap",
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
        <Toaster position="top-center" richColors closeButton />
      </ConsentProvider>
    </QueryClientProvider>
  );
}
