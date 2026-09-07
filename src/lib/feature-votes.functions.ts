// Feature demand votes for the "Soon" placeholder pages. Auth-only: every read
// and write is scoped to the signed-in user by RLS. Aggregate counts are
// deliberately not readable from the client.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const featureVoteSchema = z.object({
  feature: z.string().trim().min(1).max(64),
  vote: z.enum(["up", "down"]),
});

export type FeatureVoteInput = z.infer<typeof featureVoteSchema>;
export type FeatureVoteValue = FeatureVoteInput["vote"];

const featureSchema = z.object({ feature: z.string().trim().min(1).max(64) });

export const submitFeatureVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FeatureVoteInput) => featureVoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("feature_votes").upsert(
      {
        user_id: userId,
        feature: data.feature,
        vote: data.vote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,feature" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, vote: data.vote };
  });

export const getMyFeatureVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { feature: string }) => featureSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("feature_votes")
      .select("vote")
      .eq("user_id", userId)
      .eq("feature", data.feature)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { vote: (row?.vote as FeatureVoteValue | undefined) ?? null };
  });
