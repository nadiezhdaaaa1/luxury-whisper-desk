import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import {
  getPublishedPostBySlug,
  listPublishedPosts,
  formatPostDate,
} from "@/lib/blog.functions";
import { track } from "@/lib/analytics";

const SITE = "https://luxury-whisper-desk.lovable.app";

type Post = {
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
};

type MorePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string | null;
  author_name: string;
  published_at: string | null;
  read_time_minutes: number | null;
};

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }): Promise<{ post: Post; more: MorePost[] }> => {
    const post = (await getPublishedPostBySlug({ data: { slug: params.slug } })) as Post | null;
    if (!post) throw notFound();
    const recent = (await listPublishedPosts()) as MorePost[];
    const more = recent.filter((p) => p.slug !== params.slug).slice(0, 3);
    return { post, more };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/blog/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Article not found — Price.you" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.post;
    const meta: Array<Record<string, string>> = [
      { title: `${p.title} — Price.you` },
      { name: "description", content: p.excerpt },
      { name: "author", content: p.author_name },
      { property: "og:title", content: p.title },
      { property: "og:description", content: p.excerpt },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: p.cover_image_url ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: p.title },
      { name: "twitter:description", content: p.excerpt },
    ];
    if (p.cover_image_url) {
      meta.push({ property: "og:image", content: p.cover_image_url });
      meta.push({ name: "twitter:image", content: p.cover_image_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description: p.excerpt,
            image: p.cover_image_url ?? undefined,
            author: { "@type": "Person", name: p.author_name },
            datePublished: p.published_at ?? undefined,
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container-page py-24">
          <p className="text-sm text-destructive">Couldn't load this article: {error.message}</p>
          <button className="btn-ghost mt-4" onClick={() => router.invalidate()}>
            Retry
          </button>
        </main>
        <Footer />
      </div>
    );
  },
  notFoundComponent: () => {
    const { slug } = Route.useParams();
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container-page py-24 text-center">
          <span className="eyebrow">404</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
            Article not found
          </h1>
          <p className="mt-3 text-muted-foreground">
            No published article at <code className="text-foreground">/blog/{slug}</code>.
          </p>
          <Link to="/blog" className="btn-primary mt-8 inline-flex">
            Back to blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  },
  component: BlogPostPage,
});

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function extractToc(body: string): Array<{ id: string; text: string }> {
  const out: Array<{ id: string; text: string }> = [];
  const seen = new Set<string>();
  for (const line of body.split("\n")) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1].replace(/[*_`]/g, "").trim();
    const id = slugifyHeading(text);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, text });
  }
  return out;
}


function nodeToText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(nodeToText).join("");
  if (children && typeof children === "object" && "props" in (children as object)) {
    return nodeToText((children as { props: { children: React.ReactNode } }).props.children);
  }
  return "";
}

function BlogPostPage() {
  const { post, more } = Route.useLoaderData() as { post: Post; more: MorePost[] };
  const toc = useMemo(() => extractToc(post.body), [post.body]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    track("blog_post_viewed", { slug: post.slug, title: post.title });
  }, [post.slug, post.title]);

  useEffect(() => {
    if (toc.length === 0) return;

    const findActive = () => {
      const marker = window.scrollY + 120;
      let current: string | null = null;
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) {
          current = item.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          findActive();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    findActive();
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);

  const idForHeading = (text: string) => slugifyHeading(text);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-10 pb-20 sm:pt-14 sm:pb-24">
        <div className="mx-auto w-full max-w-[1120px] px-5 lg:grid lg:grid-cols-[220px_minmax(0,720px)] lg:gap-12 lg:justify-center">
          <div className="lg:order-1">
            {toc.length > 0 ? (
              <nav
                aria-label="Table of contents"
                className="hidden lg:block lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
              >
                <p className="eyebrow mb-3">On this page</p>
                <ul className="space-y-2 border-l border-hairline">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          const el = document.getElementById(item.id);
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                            history.replaceState(null, "", `#${item.id}`);
                            setActiveId(item.id);
                          }
                        }}
                        className={[
                          "block -ml-px border-l-2 pl-3 py-1 text-[13px] leading-snug transition-colors",
                          activeId === item.id
                            ? "border-primary text-foreground font-medium"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-hairline",
                        ].join(" ")}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>

          <div className="lg:order-2 min-w-0">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to blog
            </Link>

            <header className="mt-8">
              {post.category ? (
                <span className="inline-flex rounded-full bg-champagne-soft text-primary px-2.5 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest">
                  {post.category}
                </span>
              ) : null}
              <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-foreground">
                {post.title}
              </h1>
              <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
                {post.author_avatar_url ? (
                  <img
                    src={post.author_avatar_url}
                    alt={post.author_name}
                    className="h-8 w-8 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-display font-semibold inline-flex items-center justify-center">
                    {post.author_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </span>
                )}
                <div>
                  <div className="text-foreground/80">{post.author_name}</div>
                  <div className="text-xs">
                    {post.published_at ? formatPostDate(post.published_at) : "Draft"}
                    {post.read_time_minutes ? ` · ${post.read_time_minutes} min read` : null}
                  </div>
                </div>
              </div>
            </header>

            {post.cover_image_url ? (
              <div className="mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-champagne-soft/60">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            <article className="legal-prose mt-10">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => {
                    const id = idForHeading(nodeToText(children));
                    return (
                      <h2
                        id={id}
                        className="font-display text-xl sm:text-2xl font-medium tracking-tight mt-12 mb-4 text-foreground scroll-mt-24"
                      >
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children }) => (
                    <h3 className="font-display text-lg font-medium mt-8 mb-3 text-foreground">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-[16px] leading-[1.8] text-foreground/85 mb-5">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-2 mb-5 text-[16px] leading-[1.8] text-foreground/85 marker:text-muted-foreground">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-2 mb-5 text-[16px] leading-[1.8] text-foreground/85 marker:text-muted-foreground">
                      {children}
                    </ol>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                      target={href?.startsWith("http") ? "_blank" : undefined}
                      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-4 my-6 text-foreground/70 italic">
                      {children}
                    </blockquote>
                  ),
                  img: ({ src, alt }) => (
                    <img src={src} alt={alt ?? ""} className="my-6 rounded-xl w-full" loading="lazy" />
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] font-mono">
                      {children}
                    </code>
                  ),
                }}
              >
                {post.body}
              </ReactMarkdown>
            </article>

            <p className="mt-16 pt-6 border-t border-hairline text-center text-xs text-muted-foreground">
              Content is informational, not investment advice.
            </p>
          </div>
        </div>

        {more.length > 0 ? (
          <section className="container-page mt-20">
            <div className="max-w-[720px] mx-auto">
              <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight mb-6">
                More articles
              </h2>
            </div>
            <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {more.map((m) => (
                <MoreCard key={m.id} post={m} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}


function MoreCard({ post }: { post: MorePost }) {
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
      </div>
      <div className="p-5 flex-1 flex flex-col gap-2">
        {post.category ? (
          <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
            {post.category}
          </span>
        ) : null}
        <h3 className="font-display font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
      </div>
    </Link>
  );
}
