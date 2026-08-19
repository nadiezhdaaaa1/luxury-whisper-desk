import { Link } from "@tanstack/react-router";
import { useConsent } from "@/lib/consent";

/**
 * US-focused cookie notice (CCPA/CPRA style).
 * - Reject all / Preferences / Got it, all recording a consent decision.
 * - "Do Not Sell or Share My Personal Information" opt-out link required by CPRA.
 * - See docs/CONSENT_POSTURE.md for the open EU/ePrivacy question.
 */
export function CookieBanner() {
  const { bannerOpen, acceptAll, rejectAll, openPreferences } = useConsent();
  if (!bannerOpen) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl pointer-events-auto rounded-2xl border border-hairline bg-card/95 backdrop-blur shadow-lift">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-relaxed text-foreground/80">
              PriceYou uses cookies to run the site and understand how it's used. See our{" "}
              <Link
                to="/cookies"
                className="underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                Cookie Policy
              </Link>
              . California residents can{" "}
              <button
                type="button"
                onClick={rejectAll}
                className="underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                opt out of the sale or sharing
              </button>{" "}
              of personal information.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-shrink-0 sm:items-center">
            <button
              type="button"
              onClick={rejectAll}
              className="btn-secondary order-1 w-full justify-center sm:order-none sm:w-auto"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className="btn-secondary order-3 col-span-2 w-full justify-center sm:order-none sm:col-span-1 sm:w-auto"
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="btn-primary order-2 w-full justify-center sm:order-none sm:w-auto"
            >
              Got it
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

