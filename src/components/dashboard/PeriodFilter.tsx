import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Period } from "@/lib/demo-price-history";


export type PeriodValue = {
  period: Period;
  from?: Date;
  to?: Date;
};

type Props = {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
};

const PILLS: { key: Exclude<Period, "custom">; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
];

export function PeriodFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });
  const [month, setMonth] = useState<Date>(subMonths(new Date(), 1));

  useEffect(() => {
    if (open) {
      setDraft({ from: value.from, to: value.to });
      setMonth(subMonths(new Date(), 1));
    }
  }, [open, value.from, value.to]);

  function selectPill(k: Exclude<Period, "custom">) {
    onChange({ period: k });
  }

  function customLabel() {
    if (value.period === "custom" && value.from && value.to) {
      return `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`;
    }
    return "Timeline";
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="md:hidden">
        <TimelineDropdown value={value} onChange={onChange} />
      </div>
      <div className="hidden md:inline-flex rounded-full border border-hairline bg-background p-0.5" role="tablist">

        {PILLS.map((p) => {
          const active = value.period === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectPill(p.key)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-display font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>


          <button
            type="button"
            className={cn(
              "hidden md:inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-5 py-2.5 text-sm font-display font-semibold transition-colors hover:bg-surface-2",
              value.period === "custom"
                ? "border-primary text-primary"
                : "text-muted-foreground",
            )}

          >
            <CalendarIcon className="h-4 w-4" />
            {customLabel()}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-hidden border border-hairline bg-white p-0">
          <Calendar
            mode="range"
            selected={{ from: draft.from, to: draft.to }}
            onSelect={(r) => setDraft({ from: r?.from, to: r?.to })}
            numberOfMonths={2}
            month={month}
            onMonthChange={setMonth}
            disabled={{ after: new Date() }}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="flex items-center justify-end gap-2 border-t border-hairline p-3">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-display font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => {
                setDraft({});
                setOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft.from || !draft.to}
              className="rounded-full bg-primary px-5 py-2 text-sm font-display font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => {
                if (draft.from && draft.to) {
                  onChange({ period: "custom", from: draft.from, to: draft.to });
                  setOpen(false);
                }
              }}
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const TIMELINE_LABELS: Record<Period, string> = {
  all: "All time",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  custom: "Custom",
};
const TIMELINE_PRESETS: { value: Exclude<Period, "custom">; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

function TimelineDropdown({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });
  const [month, setMonth] = useState<Date>(subMonths(new Date(), 1));

  useEffect(() => {
    if (open) {
      setDraft({ from: value.from, to: value.to });
      setMonth(subMonths(new Date(), 1));
    }
  }, [open, value.from, value.to]);

  const summary = useMemo(() => {
    if (value.period === "custom" && value.from && value.to) {
      return `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`;
    }
    return TIMELINE_LABELS[value.period];
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-4 py-2 font-display text-sm hover:bg-surface-2 transition-colors"
        >
          <span className="text-muted-foreground">Timeline</span>
          <span className="font-semibold text-foreground">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden border border-hairline bg-white p-0"
      >
        <div className="p-1.5">
          <div className="flex flex-wrap gap-1.5">
            {TIMELINE_PRESETS.map((p) => {
              const active = value.period === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    onChange({ period: p.value });
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-surface-2",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-hairline">
          <Calendar
            mode="range"
            selected={{ from: draft.from, to: draft.to }}
            onSelect={(r) => setDraft({ from: r?.from, to: r?.to })}
            numberOfMonths={1}
            month={month}
            onMonthChange={setMonth}
            disabled={{ after: new Date() }}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="flex items-center justify-end gap-2 border-t border-hairline p-2">
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft.from || !draft.to}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-display font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => {
                if (draft.from && draft.to) {
                  onChange({ period: "custom", from: draft.from, to: draft.to });
                  setOpen(false);
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

