import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const SubscribeSchema = z.object({
  email: z.string().trim().email().max(320),
  source: z.string().trim().max(40).optional().nullable(),
  // Honeypot — must be empty.
  website: z.string().max(0).optional().nullable(),
});

export type SubscribeNewsletterInput = z.infer<typeof SubscribeSchema>;

function getClientIp(req: Request): string | null {
  const h = req.headers;
  const xff = h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "";
  if (!xff) return null;
  const ip = xff.split(",")[0]?.trim();
  return ip || null;
}

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((raw) => SubscribeSchema.parse(raw))
  .handler(async ({ data }) => {
    // Honeypot — silently accept so bots don't retry, but drop.
    if (data.website && data.website.length > 0) {
      return { ok: true as const };
    }

    const req = getRequest();
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Basic per-IP rate limit — max 5 subscriptions per minute.
    if (ip) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        return { ok: false as const, error: "Too many attempts — please wait a moment." };
      }
    }

    const { error } = await supabaseAdmin.from("newsletter_subscribers").insert({
      email: data.email.toLowerCase(),
      source: data.source || "blog",
      ip,
      user_agent: userAgent,
    });

    if (error) {
      // Treat duplicate email as success — the address is already subscribed.
      if (error.code === "23505") {
        return { ok: true as const };
      }
      return { ok: false as const, error: "Couldn't subscribe. Please try again." };
    }

    return { ok: true as const };
  });
