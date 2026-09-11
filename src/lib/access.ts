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

export const accessQueryOptions = () =>
  queryOptions({
    queryKey: ACCESS_QUERY_KEY,
    queryFn: async (): Promise<AccessState> => {
      // The server fn requires a bearer token. A background refetch that lands
      // after sign-out has none, and the resulting "Unauthorized" rejection has
      // no owner, which surfaces as a blank screen. Fail fast and quietly with
      // a message the gate already recognises as "signed out".
      let token: string | undefined;
      try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      } catch {
        token = undefined;
      }
      if (!token) throw new Error("Unauthorized: no session");
      return await getAccessState();
    },
    retry: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

