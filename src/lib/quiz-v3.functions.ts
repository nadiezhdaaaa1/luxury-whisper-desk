// V3 server function — independent copy so V3 changes never touch V1.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quizAnswersSchemaV3, type QuizAnswersV3Payload } from "./quiz-v3";

export const saveQuizAnswersV3 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuizAnswersV3Payload) => quizAnswersSchemaV3.parse(input))
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
