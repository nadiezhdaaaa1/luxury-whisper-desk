import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string | null;
  author_name: string;
  author_avatar_url: string | null;
  read_time_minutes: number | null;
  published_at: string | null;
};

export type BlogPost = BlogPostSummary & {
  body: string;
};

const SUMMARY_COLS =
  "id, slug, title, excerpt, cover_image_url, category, author_name, author_avatar_url, read_time_minutes, published_at";

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  // Handler-local imports/env reads (per createServerFn splitting rules).
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
  const { data, error } = await supa
    .from("posts")
    .select(
      "id, slug, title, excerpt, cover_image_url, category, author_name, author_avatar_url, read_time_minutes, published_at",
    )
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    cover_image_url: string | null;
    category: string | null;
    author_name: string;
    author_avatar_url: string | null;
    read_time_minutes: number | null;
    published_at: string | null;
  }>;
});

export const getPublishedPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((raw) => z.object({ slug: z.string().min(1).max(200) }).parse(raw))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { data: row, error } = await supa
      .from("posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as unknown) as {
      id: string;
      slug: string;
      title: string;
      excerpt: string;
      cover_image_url: string | null;
      body: string;
      category: string | null;
      author_name: string;
      author_avatar_url: string | null;
      read_time_minutes: number | null;
      published_at: string | null;
    } | null;
  });

// Also unused server-side, but exported so components have a consistent
// helper. Formats a "published_at" ISO string as a compact date.
export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Type helper for the summary col list, kept in sync with SUMMARY_COLS above.
export const _summaryColumns = SUMMARY_COLS;
