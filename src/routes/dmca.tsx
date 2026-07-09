import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/dmca.md?raw";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA Copyright Policy — Price.you" },
      { name: "description", content: "How to report copyright infringement to Price.you, file a counter-notice, and our repeat infringer policy." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
