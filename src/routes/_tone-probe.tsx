import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionStateCard, type Tone } from "@/components/settings/SubscriptionStateCard";

export const Route = createFileRoute("/_tone-probe")({ component: Probe });

const STATES: Array<{ key: string; tone: Tone; label: string }> = [
  { key: "free", tone: "neutral", label: "Free" },
  { key: "trial", tone: "neutral", label: "Trial · 14 days" },
  { key: "monthly", tone: "neutral", label: "Pro · monthly" },
  { key: "quarterly", tone: "accent", label: "Pro · quarterly" },
  { key: "annual", tone: "annual", label: "Pro · annual" },
];

function Probe() {
  return (
    <div className="p-8 space-y-6 max-w-xl">
      {STATES.map((s) => (
        <section key={s.key} data-state={s.key}>
          <SubscriptionStateCard
            label={s.label}
            tone={s.tone}
            rows={[{ label: "Plan", value: s.label }, { label: "Price", value: "$24.99", big: true }]}
            actions={[{ label: "See plans", href: "/#pricing", variant: "primary" }]}
          />
        </section>
      ))}
    </div>
  );
}
