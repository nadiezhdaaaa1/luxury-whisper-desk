// Retired URL. /checkout/success now only forwards to the public /thank-you
// page. It lives OUTSIDE `_authenticated` deliberately: behind the auth gate a
// signed-out visitor following an old link would be sent to login instead.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({ plan: z.string().optional() }).partial();

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/thank-you",
      search: { plan: search.plan, session_id: undefined },
      replace: true,
    });
  },
  component: () => null,
});
