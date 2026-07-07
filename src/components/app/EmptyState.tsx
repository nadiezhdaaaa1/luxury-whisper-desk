import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-10 sm:p-14 text-center">
      <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
