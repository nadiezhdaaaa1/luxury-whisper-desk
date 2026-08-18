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

export type BBox = { x: number; y: number; w: number; h: number };

export type RecognitionResult = {
  category: (typeof CATEGORIES)[number] | null;
  brand: string | null;
  model: string | null;
  confidence: number;
  bbox: BBox | null;
  ok: boolean;
};

export const recognizePortfolioPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<RecognitionResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key)
      return { category: null, brand: null, model: null, confidence: 0, bbox: null, ok: false };

    const prompt =
      "You are identifying a single luxury item in the photo. Reply ONLY with strict JSON: " +
      '{"category":"watches|jewelry|bags|null","brand":"string|null","model":"string|null","confidence":0..1,"bbox":{"x":0..1,"y":0..1,"w":0..1,"h":0..1}}. ' +
      "category is one of watches, jewelry, bags. brand is the maker (e.g. Rolex, Hermès, Cartier). " +
      "model is the specific reference/line if clearly visible (e.g. Submariner, Birkin 30, Love Bracelet), else null. " +
      "bbox is a TIGHT bounding box around the product only, in NORMALIZED image coordinates (0..1, top-left origin). " +
      "x,y is the top-left corner; w,h is the size; x+w and y+h must be <= 1. If unsure of the box, set bbox to null. " +
      "If unsure of identity, use null and lower confidence. Do not add commentary.";

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
        return { category: null, brand: null, model: null, confidence: 0, bbox: null, ok: false };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      // Extract JSON blob
      const match = text.match(/\{[\s\S]*\}/);
      if (!match)
        return { category: null, brand: null, model: null, confidence: 0, bbox: null, ok: false };
      const parsed = JSON.parse(match[0]) as {
        category?: string | null;
        brand?: string | null;
        model?: string | null;
        confidence?: number | null;
        bbox?: { x?: number; y?: number; w?: number; h?: number } | null;
      };
      const cat =
        parsed.category && (CATEGORIES as readonly string[]).includes(parsed.category)
          ? (parsed.category as RecognitionResult["category"])
          : null;
      const conf =
        typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0;

      let bbox: BBox | null = null;
      const b = parsed.bbox;
      if (b && typeof b === "object") {
        const { x, y, w, h } = b;
        if (
          typeof x === "number" &&
          typeof y === "number" &&
          typeof w === "number" &&
          typeof h === "number" &&
          [x, y, w, h].every(Number.isFinite) &&
          w > 0 &&
          h > 0 &&
          x >= 0 &&
          y >= 0 &&
          x + w <= 1.0001 &&
          y + h <= 1.0001
        ) {
          bbox = { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
        }
      }

      return {
        category: cat,
        brand: parsed.brand?.toString().trim() || null,
        model: parsed.model?.toString().trim() || null,
        confidence: conf,
        bbox,
        ok: true,
      };
    } catch (e) {
      console.error("[recognizePortfolioPhoto] failed", e);
      return { category: null, brand: null, model: null, confidence: 0, bbox: null, ok: false };
    }
  });
