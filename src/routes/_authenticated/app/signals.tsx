import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/app/signals")({
  component: () => (
    <div>
      <PageHeader
        eyebrow="Signals"
        title="Price-rise and drop alerts"
        subtitle="We surface retail moves before they reach boutiques."
      />
      <EmptyState
        title="No signals yet"
        description="Price-rise alerts and drop signals will land here."
      />
    </div>
  ),
});
