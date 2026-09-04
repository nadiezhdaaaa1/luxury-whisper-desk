import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import googleIcon from "@/assets/google-icon.svg.asset.json";

export function SocialButtons({ mode }: { mode: "signin" | "signup" }) {
  const [loading, setLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(provider: "google") {
    setError(null);
    setLoading(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      setError(result.error.message || `Couldn't ${mode} with ${provider}.`);
      setLoading(null);
      return;
    }
    if (result.redirected) return; // browser navigating away
    window.location.href = "/app";
  }

  const label = mode === "signup" ? "Sign up" : "Continue";

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handle("google")}
        className="btn-secondary w-full"
      >
        <GoogleIcon />
        {loading === "google" ? "Opening…" : `${label} with Google`}
      </button>

      {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return <img src={googleIcon.url} width={16} height={16} alt="" aria-hidden className="h-4 w-4" />;
}
