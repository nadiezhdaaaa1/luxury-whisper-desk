// Placeholder page for the in-development Digests section. It is reachable
// from the sidebar so we can measure whether people want it.
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/app/ComingSoonPage";

export const Route = createFileRoute("/_authenticated/app/digests")({
  head: () => ({
    meta: [{ title: "Digests — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: DigestsPage,
});

function DigestsPage() {
  return (
    <ComingSoonPage
      description="This will be a weekly email summarising price moves, discounts and drops on the brands you watch, so you can catch up in one go. It is not available yet."
      feature="digests"
    />
  );
}
