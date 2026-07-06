import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/app/DashboardShell";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "LuxTracker Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardShell,
});
