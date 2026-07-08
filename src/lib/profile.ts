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
  quiz_completed: boolean;
  onboarding_completed: boolean;
};

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, segments, categories, brands, role, plan, quiz_completed, onboarding_completed")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
