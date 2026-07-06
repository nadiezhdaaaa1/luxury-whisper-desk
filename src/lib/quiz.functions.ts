import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quizAnswersSchema, type QuizAnswersPayload } from "./quiz";

export const saveQuizAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuizAnswersPayload) => quizAnswersSchema.parse(input))
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
