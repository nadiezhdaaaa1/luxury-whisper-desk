import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/scratch-btn")({
  component: () => (
    <div className="p-10 flex gap-4">
      <Button variant="secondary">Scratch secondary</Button>
      <Button variant="outline">Scratch outline</Button>
    </div>
  ),
});
