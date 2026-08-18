import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel: string;
  onSelect: (v: string) => void;
};

export function SearchableSelect({
  value,
  options,
  placeholder,
  disabled,
  loading,
  emptyLabel,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((n) => n.toLowerCase().includes(s));
  }, [q, options]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between rounded-[16px] border border-hairline bg-white px-5 h-12 text-left font-display",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-2",
          )}
        >
          <span className={value ? "text-foreground text-base" : "text-muted-foreground text-base"}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 rounded-[16px] border-hairline bg-white w-[var(--radix-popover-trigger-width)]"
      >
        <div className="p-2 border-b border-hairline">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="pl-9 h-9 bg-background"
            />
          </div>
        </div>
        <div
          className="max-h-64 overflow-y-auto overscroll-contain p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {loading ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            filtered.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onSelect(n);
                  setOpen(false);
                  setQ("");
                }}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-display hover:bg-surface-2",
                  n === value ? "bg-surface-2 font-semibold" : "",
                )}
              >
                {n}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
