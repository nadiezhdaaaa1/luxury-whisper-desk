import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  label: string;
  count: number;
  affected: "all" | "watchlist" | "portfolio";
  period: string;
  from?: string;
  to?: string;
  onClick?: () => void;
};

export function SignalStatCard({ label, count, affected, period, from, to, onClick }: Props) {
  const search: Record<string, string> = { affected, period };
  if (from) search.from = from;
  if (to) search.to = to;

  return (
    <Link
      to="/app/signals"
      search={search}
      onClick={onClick}
      className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-hairline bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-[var(--card-border-hover)] hover:shadow-soft sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-hairline bg-card text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="font-display font-bold tracking-tight text-foreground text-4xl leading-none tabular-nums">
        {count}
      </div>
    </Link>
  );
}
