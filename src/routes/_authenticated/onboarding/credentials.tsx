// Standalone credential setup, for people who arrive already onboarded
// (abandoned after the quiz) and for the recovery sign-in link. Someone who
// has just finished /app/quiz gets the same controls on the reveal instead —
// one implementation (CredentialControls), two hosts.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CredentialControls } from "@/components/auth/CredentialControls";

export const Route = createFileRoute("/_authenticated/onboarding/credentials")({
  head: () => ({
    meta: [{ title: "Set up sign-in — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: CredentialsPage,
});

function CredentialsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function finish() {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["access"] });
    await navigate({ to: "/app", replace: true });
  }

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Choose how you'll sign in"
      subtitle="Your subscription is active. Set a password so you can get back in."
    >
      <CredentialControls
        redirectTo={
          typeof window === "undefined"
            ? "/onboarding/credentials"
            : window.location.origin + "/onboarding/credentials"
        }
        onDone={finish}
      />
    </AuthLayout>
  );
}
