// V2 server function — independent copy so V2 changes never touch V1.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quizAnswersSchemaV2, type QuizAnswersV2Payload } from "./quiz-v2";

export const saveQuizAnswersV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuizAnswersV2Payload) => quizAnswersSchemaV2.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        segments: data.segments,
        categories: data.categories,
        brands: data.brands,
        role: data.role,
        quiz_completed: true,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
