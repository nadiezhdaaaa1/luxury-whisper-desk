// Server function: use Lovable AI Gateway vision to suggest category/brand/model
// from an uploaded portfolio photo. Returns an editable suggestion, never a lock.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CATEGORIES = ["watches", "jewelry", "bags"] as const;

const InputSchema = z.object({
  image_data_url: z
    .string()
    .min(20)
    .refine((s) => s.startsWith("data:image/"), "Must be a data URL"),
});

export type RecognitionResult = {
  category: (typeof CATEGORIES)[number] | null;
  brand: string | null;
  model: string | null;
  confidence: number;
  ok: boolean;
};

export const recognizePortfolioPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<RecognitionResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { category: null, brand: null, model: null, confidence: 0, ok: false };

    const prompt =
      "You are identifying a single luxury item in the photo. Reply ONLY with strict JSON: " +
      '{"category":"watches|jewelry|bags|null","brand":"string|null","model":"string|null","confidence":0..1}. ' +
      "category is one of watches, jewelry, bags. brand is the maker (e.g. Rolex, Hermès, Cartier). " +
      "model is the specific reference/line if clearly visible (e.g. Submariner, Birkin 30, Love Bracelet), else null. " +
      "If unsure, use null and lower confidence. Do not add commentary.";

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: data.image_data_url } },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[recognizePortfolioPhoto] ${res.status}: ${body}`);
        return { category: null, brand: null, model: null, confidence: 0, ok: false };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      // Extract JSON blob
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { category: null, brand: null, model: null, confidence: 0, ok: false };
      const parsed = JSON.parse(match[0]) as {
        category?: string | null;
        brand?: string | null;
        model?: string | null;
        confidence?: number | null;
      };
      const cat = parsed.category && (CATEGORIES as readonly string[]).includes(parsed.category)
        ? (parsed.category as RecognitionResult["category"])
        : null;
      const conf = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
      return {
        category: cat,
        brand: parsed.brand?.toString().trim() || null,
        model: parsed.model?.toString().trim() || null,
        confidence: conf,
        ok: true,
      };
    } catch (e) {
      console.error("[recognizePortfolioPhoto] failed", e);
      return { category: null, brand: null, model: null, confidence: 0, ok: false };
    }
  });
