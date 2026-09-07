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
      title="Digests"
      description="A weekly email round-up of the brands you watch."
      feature="digests"
    />
  );
}
