// Subscription state card — the pricing spec's card anatomy rendered with this
// app's light tokens, wrapped in the landing pricing frame (`price-frame`).
// Presentation only: every string and number is supplied by the caller so no
// price or day count is retyped here.

import type { ReactNode } from "react";

export type StateRow = { label: string; value: string; big?: boolean };
export type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: "primary" | "ghost";
};
export type Tone = "neutral" | "accent" | "annual";

const TONE: Record<Tone, string> = {
  neutral: "price-frame-neutral",
  accent: "price-frame-accent",
  annual: "price-frame-annual",
};

type Props = {
  label: string;
  rows: StateRow[];
  tone?: Tone;
  progressPct?: number;
  actions?: StateAction[];
  /** Rendered inside the card, above the rows (e.g. cancel-scheduled notice). */
  banner?: ReactNode;
  /** Rendered between the last row and the actions (e.g. usage pills). */
  footer?: ReactNode;
  id?: string;
};

export function SubscriptionStateCard({
  label,
  rows,
  tone = "neutral",
  progressPct,
  actions,
  banner,
  footer,
  id,
}: Props) {
  const pct = typeof progressPct === "number" ? Math.min(100, Math.max(0, progressPct)) : undefined;

  return (
    <div id={id} className={`price-frame ${TONE[tone]}`}>
      <div className="card-soft p-7">
        <h3 className="price-plan-name font-display text-[20px] leading-[32px] tracking-[-0.8253px]">
          {label}
        </h3>

        {banner}

        <div className="mt-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 py-3 border-b border-hairline last:border-b-0"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span
                className={
                  row.big
                    ? "font-display font-bold text-[36px] leading-[36px] tracking-[-0.4599px] text-foreground tabular-nums text-right"
                    : "text-sm font-display font-semibold text-foreground tabular-nums text-right"
                }
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {pct !== undefined && (
          <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-hairline">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}

        {footer && <div className="mt-5 flex flex-wrap items-center gap-2">{footer}</div>}

        {actions && actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) =>
              action.href ? (
                <a
                  key={action.label}
                  href={action.href}
                  className={`${action.variant === "primary" ? "btn-primary" : "btn-secondary"} text-sm min-h-11`}
                >
                  {action.label}
                </a>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`${action.variant === "primary" ? "btn-primary" : "btn-secondary"} text-sm min-h-11`}
                >
                  {action.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
