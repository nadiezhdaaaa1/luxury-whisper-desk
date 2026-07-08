import * as React from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "prefix"> & {
  currencySymbol?: string;
};

// App-wide money input: renders a "$" (or provided symbol) prefix inside the field.
export const MoneyInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, currencySymbol = "$", ...props }, ref) => {
    const { className: inputClassName, ...rest } = props as { className?: string } & typeof props;
    return (
      <div className={cn("relative", className)}>
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
        >
          {currencySymbol}
        </span>
        <input
          ref={ref}
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          {...rest}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-white pl-7 pr-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName,
          )}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
