import { useState } from "react";
import { lovable } from "@/integrations/lovable";

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
        className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-background px-4 py-2.5 text-sm font-display font-semibold text-foreground hover:bg-surface transition-colors disabled:opacity-60"
      >
        <GoogleIcon />
        {loading === "google" ? "Opening…" : `${label} with Google`}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handle("apple")}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-background px-4 py-2.5 text-sm font-display font-semibold text-foreground hover:bg-surface transition-colors disabled:opacity-60"
      >
        <AppleIcon />
        {loading === "apple" ? "Opening…" : `${label} with Apple`}
      </button>
      {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.5 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.5 13.3 17.8 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.6z"/>
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.7 0 20.2 0 24s1 7.3 2.6 10.7l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6.2 0-11.5-3.8-13.5-9.4l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.24-1.11 3.06-.75.9-1.97 1.6-3.16 1.5-.15-1.11.42-2.28 1.09-3.06.76-.88 2.05-1.53 3.18-1.5zM20.5 17.15c-.55 1.25-.82 1.8-1.53 2.9-1 1.55-2.4 3.48-4.15 3.5-1.55.01-1.95-1.01-4.05-1-2.1.01-2.55 1.02-4.1 1-1.75-.03-3.08-1.77-4.08-3.32-2.79-4.35-3.09-9.45-1.36-12.16 1.22-1.93 3.16-3.06 5-3.06 1.85 0 3.02 1.02 4.55 1.02 1.48 0 2.38-1.02 4.52-1.02 1.63 0 3.36.89 4.6 2.43-4.05 2.22-3.4 8.02.6 9.71z"/>
    </svg>
  );
}
