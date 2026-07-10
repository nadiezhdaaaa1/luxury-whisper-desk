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
      className="card-flat group flex flex-col gap-3 p-3 sm:p-5 transition-colors hover:bg-surface-2 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className="font-display font-bold tracking-tight text-primary text-4xl leading-none tabular-nums">
        {count}
      </div>
    </Link>
  );
}
