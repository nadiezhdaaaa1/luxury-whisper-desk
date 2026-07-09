import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const TOPICS = [
  "General inquiry",
  "Billing & subscription",
  "Partnership",
  "Press / media",
  "Other",
] as const;

const SubmitSchema = z.object({
  email: z.string().trim().email().max(320),
  name: z.string().trim().max(120).optional().nullable(),
  topic: z.enum(TOPICS),
  message: z.string().trim().min(1).max(5000),
  // Honeypot — must be empty. Bots often auto-fill every field.
  website: z.string().max(0).optional().nullable(),
  // reCAPTCHA v3 token — verified server-side when secret is configured.
  captchaToken: z.string().optional().nullable(),
});

export type SubmitContactInput = z.infer<typeof SubmitSchema>;
export const CONTACT_TOPICS = TOPICS;

function getClientIp(req: Request): string | null {
  const h = req.headers;
  const xff = h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "";
  if (!xff) return null;
  const ip = xff.split(",")[0]?.trim();
  return ip || null;
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((raw) => SubmitSchema.parse(raw))
  .handler(async ({ data }) => {
    // 1. Honeypot — silently accept (return ok) so bots don't retry, but drop.
    if (data.website && data.website.length > 0) {
      return { ok: true as const };
    }

    const req = getRequest();
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // 2. reCAPTCHA verification (server-side). If secret isn't configured yet,
    //    skip verification but keep honeypot + rate limit in force.
    //    TODO: once RECAPTCHA_SECRET_KEY is set, this branch enforces automatically.
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (secret) {
      if (!data.captchaToken) {
        return { ok: false as const, error: "Captcha required." };
      }
      try {
        const params = new URLSearchParams();
        params.set("secret", secret);
        params.set("response", data.captchaToken);
        if (ip) params.set("remoteip", ip);
        const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
        const body = (await res.json()) as { success?: boolean; score?: number };
        // v3 returns a score (0.0 – 1.0). v2 returns just success.
        const passed =
          body.success === true && (typeof body.score !== "number" || body.score >= 0.5);
        if (!passed) {
          return { ok: false as const, error: "Captcha verification failed." };
        }
      } catch {
        return { ok: false as const, error: "Captcha verification failed." };
      }
    }

    // 3. Load admin client (server-only) inside handler.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 4. Basic per-IP rate limit — max 3 submissions per minute.
    if (ip) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= 3) {
        return { ok: false as const, error: "Too many messages — please wait a moment." };
      }
    }

    // 5. Insert.
    const { error } = await supabaseAdmin.from("contact_submissions").insert({
      email: data.email,
      name: data.name || null,
      topic: data.topic,
      message: data.message,
      ip,
      user_agent: userAgent,
    });
    if (error) {
      return { ok: false as const, error: "Couldn't save your message. Please try again." };
    }

    return { ok: true as const };
  });
