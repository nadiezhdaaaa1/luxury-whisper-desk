import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { submitContactMessage, CONTACT_TOPICS } from "@/lib/contact.functions";
import { track } from "@/lib/analytics";
import { Mail, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

function ContactErrorComponent({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container-page py-24 text-center">
        <span className="eyebrow justify-center">Something broke</span>
        <h1 className="mt-3 font-display text-2xl font-medium">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again, or email us directly at{" "}
          <a href="mailto:hello@price.you" className="text-primary underline underline-offset-2">
            hello@price.you
          </a>
          .
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            className="btn-primary text-sm min-h-11"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <Link to="/" className="btn-secondary text-sm min-h-11">
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact PriceYou — get in touch" },
      {
        name: "description",
        content:
          "Questions, feedback, or partnership ideas? Reach the PriceYou team via the contact form or email hello@price.you.",
      },
      { property: "og:title", content: "Contact PriceYou" },
      {
        property: "og:description",
        content: "Get in touch with the PriceYou team.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://luxury-whisper-desk.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://luxury-whisper-desk.lovable.app/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "PriceYou",
          legalName: "NORELIX LIMITED",
          url: "https://luxury-whisper-desk.lovable.app/",
          email: "hello@price.you",
          address: {
            "@type": "PostalAddress",
            streetAddress: "The Black Church, St Mary's Place",
            addressLocality: "Dublin 7",
            postalCode: "D07 P4AX",
            addressCountry: "IE",
          },
        }),
      },
    ],
  }),
  errorComponent: ContactErrorComponent,
  component: ContactPage,
});

function useRecaptchaScript(siteKey: string | undefined) {
  useEffect(() => {
    if (!siteKey || typeof document === "undefined") return;
    if (document.querySelector("script[data-recaptcha]")) return;
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-recaptcha", "1");
    document.head.appendChild(s);
  }, [siteKey]);
}

type FormState = {
  email: string;
  name: string;
  topic: (typeof CONTACT_TOPICS)[number];
  message: string;
  website: string; // honeypot
};

const INITIAL: FormState = {
  email: "",
  name: "",
  topic: "General inquiry",
  message: "",
  website: "",
};

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  useRecaptchaScript(SITE_KEY);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const firstErrorRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    track("contact_viewed");
  }, []);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    const email = form.email.trim();
    if (!email) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!form.message.trim()) next.message = "Message is required.";
    else if (form.message.trim().length > 5000) next.message = "Message is too long.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function getCaptchaToken(): Promise<string | null> {
    if (!SITE_KEY) return null;
    if (typeof window === "undefined" || !window.grecaptcha) return null;
    return new Promise((resolve) => {
      window.grecaptcha!.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(SITE_KEY!, { action: "contact" });
          resolve(token);
        } catch {
          resolve(null);
        }
      });
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) {
      firstErrorRef.current?.focus();
      return;
    }
    setStatus("loading");
    try {
      const captchaToken = await getCaptchaToken();
      const res = await submit({
        data: {
          email: form.email.trim(),
          name: form.name.trim() || null,
          topic: form.topic,
          message: form.message.trim(),
          website: form.website,
          captchaToken,
        },
      });
      if (res?.ok) {
        setStatus("success");
        setForm(INITIAL);
        track("contact_submitted", { topic: form.topic });
      } else {
        setStatus("error");
        setServerError(res?.error ?? "Something went wrong.");
        track("contact_submit_failed", { reason: res?.error });
      }
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      track("contact_submit_failed", { reason: "exception" });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />

      <main>
        <section className="border-b border-hairline">
          <div className="container-page py-16 lg:py-20">
            <span className="eyebrow">Contact</span>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
              Let's talk.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              Product questions, billing, partnerships, press — we read everything. We'll get back
              within a couple of business days.
            </p>
          </div>
        </section>

        <section className="container-page py-14 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-3">
            <aside className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-hairline bg-surface p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">Prefer email?</p>
                    <p className="text-xs text-muted-foreground">Direct line to the team.</p>
                  </div>
                </div>
                <a
                  href="mailto:hello@price.you"
                  className="mt-4 inline-block text-primary font-display font-medium hover:underline break-all"
                >
                  hello@price.you
                </a>
              </div>

              <div className="rounded-2xl border border-hairline bg-surface p-6 text-sm text-muted-foreground leading-relaxed">
                <p className="font-display font-semibold text-foreground">NORELIX LIMITED</p>
                <p className="mt-1">trading as PriceYou</p>
                <p className="mt-3">
                  The Black Church, St Mary's Place,
                  <br /> Dublin 7, D07 P4AX, Ireland
                </p>
                <p className="mt-1 text-xs">Company No. 817569</p>
              </div>
            </aside>

            <div className="lg:col-span-2">
              <form
                onSubmit={onSubmit}
                noValidate
                className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8"
              >
                {/* Honeypot — visually hidden, not tab-reachable. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Email" required error={errors.email}>
                    <input
                      ref={errors.email ? firstErrorRef : undefined}
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputCls(!!errors.email)}
                      placeholder="you@example.com"
                    />
                  </Field>

                  <Field label="Name" error={errors.name}>
                    <input
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputCls(false)}
                      placeholder="Optional"
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field label="Topic" required>
                    <div className="relative">
                      <select
                        value={form.topic}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            topic: e.target.value as FormState["topic"],
                          }))
                        }
                        className={inputCls(false) + " appearance-none pr-10"}
                      >
                        {CONTACT_TOPICS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-5">
                  <Field label="Message" required error={errors.message}>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      className={inputCls(!!errors.message) + " resize-y min-h-[140px]"}
                      placeholder="How can we help?"
                    />
                  </Field>
                </div>

                <p className="mt-5 text-xs text-muted-foreground">
                  We'll only use your details to reply.{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    Privacy policy
                  </Link>
                  .
                </p>

                {status === "success" ? (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                    <p>Thanks — we'll get back to you.</p>
                  </div>
                ) : null}

                {status === "error" && serverError ? (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    <p>{serverError}</p>
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className="text-[11px] text-muted-foreground">
                    Protected by reCAPTCHA and a honeypot check.
                  </p>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send message"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-display font-medium text-foreground">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
    "transition-colors",
    hasError ? "border-destructive/60" : "border-hairline",
  ].join(" ");
}
