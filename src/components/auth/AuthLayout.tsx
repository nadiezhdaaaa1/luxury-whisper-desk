import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import priceYouLogo from "@/assets/price-you-logo.svg.asset.json";

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container-page py-6 flex justify-center">
        <Link to="/" className="inline-block leading-none" aria-label="Price.you home">
          <img src={priceYouLogo.url} alt="Price.you" className="h-6 w-auto" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="card-soft p-8">
            {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
            <h1 className="font-display text-2xl sm:text-3xl leading-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="mt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
