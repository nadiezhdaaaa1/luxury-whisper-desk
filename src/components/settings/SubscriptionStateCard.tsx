// Subscription state card — the pricing spec's card anatomy rendered with this
// app's light tokens. Presentation only: every string and number is supplied by
// the caller so no price or day count is retyped here.

export type StateRow = { label: string; value: string; big?: boolean };
export type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: "primary" | "ghost";
};

type Props = {
  label: string;
  rows: StateRow[];
  progressPct?: number;
  actions?: StateAction[];
};

export function SubscriptionStateCard({ label, rows, progressPct, actions }: Props) {
  const pct =
    typeof progressPct === "number" ? Math.min(100, Math.max(0, progressPct)) : undefined;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <div className="text-[10px] font-display font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>

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
                  ? "text-xl font-display font-normal text-foreground tabular-nums text-right"
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
  );
}
