import { Link } from "@tanstack/react-router";
import { useConsent } from "@/lib/consent";

export function CookieBanner() {
  const { bannerOpen, acceptAll, rejectAll, openPreferences } = useConsent();
  if (!bannerOpen) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none"
    >
      <div className="mx-auto max-w-4xl pointer-events-auto rounded-2xl border border-hairline bg-card/95 backdrop-blur shadow-lift">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="font-display text-[15px] font-semibold text-foreground">
              We use cookies
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">
              We use cookies to run LuxTracker, measure usage, and improve the product. You can
              accept all, reject non-essential, or choose which to allow. See our{" "}
              <Link to="/cookies" className="underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 lg:flex-shrink-0">
            <button
              type="button"
              onClick={rejectAll}
              className="btn-ghost text-sm"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className="btn-ghost text-sm"
            >
              Customize
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="btn-primary text-sm"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
