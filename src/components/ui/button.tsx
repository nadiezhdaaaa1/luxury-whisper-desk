import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display cursor-pointer " +
  "transition-[background-color,border-color,color,transform] duration-150 " +
  "active:scale-[0.965] " +
  // Hit-area guard: the press-shrink pulls the edges away from the cursor, so a
  // press started near an edge released outside the element and never clicked.
  "after:content-[''] after:absolute after:-inset-1 after:rounded-[inherit] " +
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-background),0_0_0_4px_var(--color-ring)] " +
  "disabled:pointer-events-none disabled:opacity-[0.42] disabled:shadow-none disabled:cursor-not-allowed " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const buttonVariants = cva(base, {
  variants: {
    variant: {
      // btn-primary treatment, without the ambient glow
      default:
        "font-semibold border-none text-[var(--color-primary-foreground)] bg-[var(--color-primary)] " +        "hover:bg-[var(--primary-hover)] " +
        "active:bg-[var(--primary-pressed)]",
      // btn-destructive treatment
      destructive:
        "font-semibold border-none text-[var(--color-destructive-foreground)] bg-[var(--color-destructive)] " +        "hover:bg-[var(--destructive-hover)] " +
        "active:bg-[var(--destructive-pressed)]",
      // btn-secondary treatment
      outline:
        "font-semibold border border-[var(--sec-border)] bg-[var(--sec)] text-[var(--color-foreground)] " +
        "hover:bg-[var(--sec-hover)] " +
        "hover:border-[var(--sec-border-hover)] " +
        "active:bg-[var(--sec-pressed)] active:border-[var(--sec-border-pressed)]",
      secondary:
        "font-semibold border border-[var(--sec-border)] bg-[var(--sec)] text-[var(--color-foreground)] " +
        "hover:bg-[var(--sec-hover)] " +
        "hover:border-[var(--sec-border-hover)] " +
        "active:bg-[var(--sec-pressed)] active:border-[var(--sec-border-pressed)]",
      // btn-tertiary treatment
      ghost:
        "font-medium border-none bg-transparent text-[var(--color-muted-foreground)] " +
        "hover:bg-[var(--tertiary-hover)] " +
        "hover:text-[var(--color-foreground)] " +
        "active:bg-[var(--tertiary-pressed)] active:text-[var(--color-foreground)]",
      link: "text-primary underline-offset-4 hover:underline font-medium active:scale-100",
    },
    size: {
      default: "h-11 px-[1.375rem] text-[0.9rem]",
      sm: "h-9 px-3.5 text-[0.8125rem]",
      lg: "h-13 px-[1.875rem] text-[0.9375rem]",
      icon: "h-11 w-11 px-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
