import { createFileRoute } from "@tanstack/react-router";
import { ImportantSignalCard, type SignalCardData } from "@/components/signals/ImportantSignalCard";

const sample: SignalCardData = {
  signal: {
    id: "sig_test",
    type: "price_increase",
    category: "watches",
    brand_slug: "rolex",
    brand_name: "Rolex",
    segment: "luxury",
    model: "Submariner",
    title: "Rolex raised retail prices in the UK",
    body: "Authorized dealers updated price tags across professional models, with stainless-steel sport references rising 6–8%.",
    recommended_action: "Review purchase timeline",
    signal_date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    is_sample: true,
    source_url: "https://www.rolex.com",
  },
  portfolioMatches: [],
  watchlistMatches: [],
  precision: "piece",
};

export const Route = createFileRoute("/test-signal-card")({
  component: () => (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <ImportantSignalCard item={sample} />
      </div>
    </div>
  ),
});
