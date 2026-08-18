import { supabase } from "@/integrations/supabase/client";
import type { Category, Role, Segment } from "@/lib/quiz";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  segments: Segment[];
  categories: Category[];
  brands: string[];
  role: Role | null;
  plan: "free" | "pro";
  billing_period: "monthly" | "annual" | null;
  quiz_completed: boolean;
  onboarding_completed: boolean;
};

const PROFILE_COLS =
  "id, email, display_name, avatar_url, segments, categories, brands, role, plan, billing_period, quiz_completed, onboarding_completed";

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS as never)
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as Profile;

  // Self-heal: profile row missing (trigger race or externally-created user).
  // Insert a minimal row so the /app guard has data to read.
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: auth.user.id,
      email: auth.user.email ?? "",
      display_name:
        (auth.user.user_metadata?.display_name as string | undefined) ??
        (auth.user.user_metadata?.full_name as string | undefined) ??
        null,
      avatar_url: (auth.user.user_metadata?.avatar_url as string | undefined) ?? null,
    } as never)
    .select(PROFILE_COLS as never)
    .maybeSingle();
  if (insertError) throw insertError;
  return inserted as unknown as Profile | null;
}
