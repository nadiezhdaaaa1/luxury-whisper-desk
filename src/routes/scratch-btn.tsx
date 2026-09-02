import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/scratch-btn")({
  component: Scratch,
});

function Scratch() {
  return (
    <div className="p-10 flex gap-4">
      <Button data-testid="v-default" variant="default">Default</Button>
      <Button data-testid="v-destructive" variant="destructive">Destructive</Button>
      <Button data-testid="v-outline" variant="outline">Outline</Button>
      <Button data-testid="v-secondary" variant="secondary">Secondary</Button>
    </div>
  );
}
