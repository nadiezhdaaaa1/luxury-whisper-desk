// Client-side query contract for the server-computed access model.
//
// The gate reads this through `queryClient.ensureQueryData`, so a click-through
// of the app costs ONE `getAccessState` call per 30s window, not one per
// navigation. staleTime/gcTime deliberately match the existing ["me"] query.
import { queryOptions } from "@tanstack/react-query";
import { getAccessState, type AccessState } from "@/lib/access.functions";

export type { AccessState };

export const ACCESS_QUERY_KEY = ["access"] as const;

export const accessQueryOptions = () =>
  queryOptions({
    queryKey: ACCESS_QUERY_KEY,
    queryFn: () => getAccessState(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
