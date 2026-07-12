import type { ReactNode } from "react";

// Email preview components render an HTML email-style layout inside an <article>.
// They mirror the visual language of the app but stay isolated (no app styles
// beyond tailwind + tokens). Meant for preview inside a bordered "device"
// frame — not for actual email delivery.

export type EmailShellProps = {
  previewText: string;
  headline: string;
  intro?: string;
  children: ReactNode;
  cta?: { label: string; href: string };
  footerNote?: string;
};

export function EmailShell({ previewText, headline, intro, children, cta, footerNote }: EmailShellProps) {
  return (
    <article className="w-full max-w-[560px] mx-auto bg-white rounded-2xl border border-hairline overflow-hidden shadow-soft">
      {/* Preview text (visible only to inbox previews in real clients) */}
      <div className="sr-only">{previewText}</div>

      <header className="px-8 pt-8 pb-6 border-b border-hairline flex items-center justify-between">
        <div className="font-display font-semibold text-xl tracking-tight text-foreground">PriceYou</div>
        <div className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          Notification
        </div>
      </header>


      <div className="px-8 py-8 space-y-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground leading-snug">
          {headline}
        </h1>
        {intro ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>
        ) : null}
        {children}
        {cta ? (
          <div className="pt-2">
            <a
              href={cta.href}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {cta.label}
            </a>
          </div>
        ) : null}
      </div>

      <footer className="px-8 py-6 border-t border-hairline bg-surface-2/40 text-xs text-muted-foreground space-y-1.5">
        {footerNote ? <p>{footerNote}</p> : null}
        <p>
          You're receiving this because you signed up for PriceYou. Manage what you receive in{" "}
          <a href="/app/settings#notifications" className="underline underline-offset-2">notification settings</a>.
        </p>
        <p className="opacity-70">© {new Date().getFullYear()} PriceYou</p>
      </footer>

    </article>
  );
}
