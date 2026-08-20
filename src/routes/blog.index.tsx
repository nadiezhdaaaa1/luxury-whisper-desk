import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { NewsletterSignup } from "@/components/blog/NewsletterSignup";
import { listPublishedPosts, formatPostDate } from "@/lib/blog.functions";
import { track } from "@/lib/analytics";
import { ImageIcon } from "lucide-react";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/blog/")({
  loader: () => listPublishedPosts(),
  head: () => ({
    meta: [
      { title: "Insights — PriceYou Blog" },
      {
        name: "description",
        content:
          "Field notes on price alerts, portfolio thinking, and honest ROI — from the team building PriceYou.",
      },
      { property: "og:title", content: "Insights — PriceYou Blog" },
      {
        property: "og:description",
        content:
          "Field notes on price alerts, portfolio thinking, and honest ROI — from the team building PriceYou.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/blog") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/blog") }],
  }),
  errorComponent: BlogListErrorPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container-page py-24">
        <p className="text-muted-foreground">No articles here.</p>
      </main>
      <Footer />
    </div>
  ),
  component: BlogListPage,
});

function BlogListPage() {
  const posts = Route.useLoaderData() as Array<{
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
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    track("blog_list_viewed", { count: posts.length });
  }, [posts.length]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.category) set.add(p.category);
    return [...set].sort();
  }, [posts]);

  const filtered = category === "all" ? posts : posts.filter((p) => p.category === category);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section>
          <div className="container-page pt-16 lg:pt-20 pb-0">
            <span className="eyebrow">Insights</span>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
              Field notes from the luxury market.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              Price alerts we watch, portfolio thinking we trust, and honest ROI — written by the
              team building PriceYou.
            </p>
          </div>
        </section>

        <section className="container-page py-14 lg:py-16">
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              <Chip active={category === "all"} onClick={() => setCategory("all")}>
                All
              </Chip>
              {categories.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-surface p-10 text-center">
              <p className="font-display text-lg font-semibold">No articles yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}

          <NewsletterSignup className="mt-16" />

          <p className="mt-16 text-center text-xs text-muted-foreground">
            Content is informational, not investment advice.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-1.5 text-sm font-display font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PostCard({
  post,
}: {
  post: {
    slug: string;
    title: string;
    excerpt: string;
    cover_image_url: string | null;
    category: string | null;
    author_name: string;
    published_at: string | null;
    read_time_minutes: number | null;
  };
}) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group rounded-2xl border border-hairline bg-surface overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[16/10] w-full bg-champagne-soft/60 overflow-hidden">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        )}
        {post.category ? (
          <span className="absolute top-3 left-3 rounded-full bg-background/90 border border-hairline px-2.5 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest text-foreground">
            {post.category}
          </span>
        ) : null}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <h3 className="font-display font-semibold text-lg leading-snug text-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
        <div className="mt-auto pt-3 text-xs text-muted-foreground">
          {post.author_name}
          {post.published_at ? <> · {formatPostDate(post.published_at)}</> : null}
          {post.read_time_minutes ? <> · {post.read_time_minutes} min read</> : null}
        </div>
      </div>
    </Link>
  );
}

function BlogListErrorPage({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container-page py-24">
        <p className="text-sm text-destructive">Couldn't load the blog: {error.message}</p>
        <button className="btn-secondary mt-4" onClick={() => router.invalidate()}>
          Retry
        </button>
      </main>
      <Footer />
    </div>
  );
}
