import { Skeleton } from "@/components/ui/skeleton";

function FilterRow({ pills = 5 }: { pills?: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {Array.from({ length: pills }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28 rounded-full" />
      ))}
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-[340px] rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  );
}

export function SignalsSkeleton() {
  return (
    <div>
      <FilterRow />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function WatchlistSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-4 h-28 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}
