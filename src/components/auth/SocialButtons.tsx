import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import googleIcon from "@/assets/google-icon.svg.asset.json";

export function SocialButtons({ mode }: { mode: "signin" | "signup" }) {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(provider: "google" | "apple") {
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
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handle("apple")}
        className="btn-secondary w-full"
      >
        <AppleIcon />
        {loading === "apple" ? "Opening…" : `${label} with Apple`}
      </button>

      {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return <img src={googleIcon.url} width={16} height={16} alt="" aria-hidden className="h-4 w-4" />;
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.24-1.11 3.06-.75.9-1.97 1.6-3.16 1.5-.15-1.11.42-2.28 1.09-3.06.76-.88 2.05-1.53 3.18-1.5zM20.5 17.15c-.55 1.25-.82 1.8-1.53 2.9-1 1.55-2.4 3.48-4.15 3.5-1.55.01-1.95-1.01-4.05-1-2.1.01-2.55 1.02-4.1 1-1.75-.03-3.08-1.77-4.08-3.32-2.79-4.35-3.09-9.45-1.36-12.16 1.22-1.93 3.16-3.06 5-3.06 1.85 0 3.02 1.02 4.55 1.02 1.48 0 2.38-1.02 4.52-1.02 1.63 0 3.36.89 4.6 2.43-4.05 2.22-3.4 8.02.6 9.71z" />
    </svg>
  );
}
