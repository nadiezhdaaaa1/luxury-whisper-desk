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
    <div className="card-soft p-10 sm:p-14 text-center">
      <h2 className="font-display text-xl sm:text-2xl text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
