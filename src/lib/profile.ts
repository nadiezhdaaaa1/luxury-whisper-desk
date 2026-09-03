import { supabase } from "@/integrations/supabase/client";
import { SEGMENTS, type Category, type Role, type Segment } from "@/lib/quiz";

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
  billing_period: "monthly" | "quarterly" | "annual" | null;
  trial_ends_at: string | null;
  quiz_completed: boolean;
  onboarding_completed: boolean;
};

const PROFILE_COLS =
  "id, email, display_name, avatar_url, segments, categories, brands, role, plan, billing_period, trial_ends_at, quiz_completed, onboarding_completed";

// The database enum intentionally retains its historical third value. Narrow
// at this single read boundary so stale or unexpected values never enter the
// two-tier application model.
function narrowSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (segment): segment is Segment =>
      typeof segment === "string" && (SEGMENTS as readonly string[]).includes(segment),
  );
}

// Row shape as read from Postgres: identical to Profile except `segments`,
// which arrives as the DB enum (public.segment_kind still has its historical
// third value) and is narrowed to the two-tier app model below.
type ProfileRow = Omit<Profile, "segments"> & { segments: unknown };

function profileFromRow(row: ProfileRow): Profile {
  return { ...row, segments: narrowSegments(row.segments) };
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS as never)
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return profileFromRow(data);

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
  return inserted ? profileFromRow(inserted) : null;
}
