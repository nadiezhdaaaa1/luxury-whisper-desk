import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/dmca.md?raw";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA Copyright Policy — LuxTracker" },
      { name: "description", content: "How to report copyright infringement to LuxTracker, file a counter-notice, and our repeat infringer policy." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
