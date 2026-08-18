import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-['Montserrat',sans-serif] text-primary leading-none tracking-tight select-none",
        className,
      )}
      aria-label="PRICEYOU"
    >
      <span className="font-bold">PRICE</span>
      <span className="font-normal">YOU</span>
    </span>
  );
}
