import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useConsent, type ConsentCategory, type ConsentPrefs } from "@/lib/consent";

const CATEGORIES: {
  key: ConsentCategory;
  title: string;
  description: string;
  locked?: boolean;
}[] = [
  {
    key: "necessary",
    title: "Strictly necessary",
    description:
      "Required for the Service to work — authentication and session (Supabase), security, and payment flows (Stripe). Cannot be switched off.",
    locked: true,
  },
  {
    key: "functional",
    title: "Functional",
    description: "Remember your preferences and settings so the app feels consistent between visits.",
  },
  {
    key: "analytics",
    title: "Analytics / performance",
    description:
      "Help us understand usage and improve the product. Includes Google Analytics 4, Amplitude, and Microsoft Clarity.",
  },
  {
    key: "marketing",
    title: "Marketing / attribution",
    description:
      "Measure campaigns and attribute signups. Includes AppsFlyer, Meta Pixel, and Google Ads tags.",
  },
];

export function PreferencesModal() {
  const { modalOpen, closePreferences, prefs, savePrefs, acceptAll, rejectAll, gpc } = useConsent();
  const [local, setLocal] = useState<ConsentPrefs>(prefs);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modalOpen) setLocal(prefs);
  }, [modalOpen, prefs]);

  useEffect(() => {
    if (!modalOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePreferences();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [modalOpen, closePreferences]);

  if (!modalOpen) return null;

  const toggle = (key: ConsentCategory) => {
    setLocal((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-prefs-title"
    >
      <button
        type="button"
        aria-label="Close cookie preferences"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={closePreferences}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl border border-hairline shadow-lift max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-hairline">
          <div>
            <h2 id="cookie-prefs-title" className="font-display text-xl font-medium tracking-tight text-foreground">
              Cookie preferences
            </h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Choose which cookies you allow. You can change this later from the footer.
            </p>
            {gpc && (
              <p className="mt-2 text-[12px] text-muted-foreground">
                Global Privacy Control detected — marketing is off by default.
              </p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closePreferences}
            className="ml-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          {CATEGORIES.map((cat) => {
            const checked = local[cat.key];
            return (
              <div key={cat.key} className="rounded-lg border border-hairline p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-[14px] font-semibold text-foreground">
                      {cat.title}
                      {cat.locked && (
                        <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Always on
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground/70">
                      {cat.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={`Toggle ${cat.title}`}
                    disabled={cat.locked}
                    onClick={() => !cat.locked && toggle(cat.key)}
                    className={[
                      "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors",
                      checked ? "bg-primary" : "bg-border",
                      cat.locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                        checked ? "translate-x-5" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-hairline px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={rejectAll}
              className="btn-ghost text-sm"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="btn-ghost text-sm"
            >
              Accept all
            </button>
          </div>
          <button
            type="button"
            onClick={() => savePrefs(local)}
            className="btn-primary text-sm"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
