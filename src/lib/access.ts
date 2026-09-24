// Client-side query contract for the server-computed access model.
//
// The gate reads this through `queryClient.ensureQueryData`, so a click-through
// of the app costs ONE `getAccessState` call per 30s window, not one per
// navigation. staleTime/gcTime deliberately match the existing ["me"] query.
import { queryOptions } from "@tanstack/react-query";
import { getAccessState, type AccessState } from "@/lib/access.functions";
import { supabase } from "@/integrations/supabase/client";

export type { AccessState };

export const ACCESS_QUERY_KEY = ["access"] as const;

export async function fetchAccessState(): Promise<AccessState> {
  // Read the session once, then bind that exact token to this call. Depending
  // only on the global auth attacher creates a race after sign-in: a caller can
  // observe the new session while a second storage read in the attacher still
  // sees no token, producing a tokenless protected request.
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    token = undefined;
  }
  if (!token) throw new Error("Unauthorized: no session");
  return await getAccessState({ headers: { Authorization: `Bearer ${token}` } });
}

export const accessQueryOptions = () =>
  queryOptions({
    queryKey: ACCESS_QUERY_KEY,
    queryFn: fetchAccessState,
    retry: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

