import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/landing/Footer";

interface LegalPageProps {
  content: string;
  lastUpdated?: string;
}

export function LegalPage({ content, lastUpdated = "July 6, 2026" }: LegalPageProps) {
  // Split H1 + "Last updated" line out so we can style them explicitly.
  const lines = content.split("\n");
  const h1 = lines.find((l) => l.startsWith("# "))?.replace(/^#\s+/, "") ?? "";
  const body = lines
    .filter((l) => !l.startsWith("# ") && !l.trim().toLowerCase().startsWith("**last updated"))
    .join("\n")
    .trim();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-10 pb-20 sm:pt-14 sm:pb-24">
        <div className="mx-auto w-full max-w-[720px] px-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          <header className="mt-10 border-b border-hairline pb-8">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight leading-[1.1]">
              {h1}
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Last updated: <span className="text-foreground/70">{lastUpdated}</span>
            </p>
          </header>

          <article className="legal-prose mt-10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight mt-12 mb-4 text-foreground">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-display text-lg font-medium mt-8 mb-3 text-foreground">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-[15px] leading-[1.75] text-foreground/80 mb-5">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-2 mb-5 text-[15px] leading-[1.75] text-foreground/80 marker:text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 space-y-2 mb-5 text-[15px] leading-[1.75] text-foreground/80 marker:text-muted-foreground">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                a: ({ href, children }) => {
                  const isInternal = typeof href === "string" && href.startsWith("/");
                  if (isInternal) {
                    return (
                      <Link
                        to={href as string}
                        className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors"
                      >
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a
                      href={href}
                      className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors"
                    >
                      {children}
                    </a>
                  );
                },
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto rounded-lg border border-hairline">
                    <table className="w-full text-sm text-left border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-surface/60 border-b border-hairline">{children}</thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-hairline last:border-b-0">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 font-display font-semibold text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-[14px] leading-[1.6] text-foreground/80 align-top">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-10 border-hairline" />,
                em: ({ children }) => <em className="text-foreground/70">{children}</em>,
              }}
            >
              {body}
            </ReactMarkdown>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
