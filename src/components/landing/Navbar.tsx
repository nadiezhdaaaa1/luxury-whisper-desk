import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";

const links = [
  { to: "/" as const, hash: "how", label: "How it works" },
  { to: "/" as const, hash: "features", label: "Features" },
  { to: "/" as const, hash: "categories", label: "Categories" },
  { to: "/" as const, hash: "audience", label: "Who it's for" },
  { to: "/" as const, hash: "pricing", label: "Pricing" },
  { to: "/blog" as const, label: "Blog" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { session, loading } = useAuth();
  const signedIn = !!session;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/80 backdrop-blur-md">
      <div className="container-page relative flex h-16 items-center justify-between gap-6">
        <Link to="/" className="inline-block leading-none" aria-label="PriceYou home">
          <Logo className="text-[1.85rem]" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <Link
              key={`${l.to}-${l.hash ?? ""}`}
              to={l.to}
              hash={l.hash}
              className="text-sm font-display font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {loading ? null : signedIn ? (
            <Link to="/app" className="btn-primary whitespace-nowrap">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-tertiary btn-sm">
                Log in
              </Link>
              <Link to="/quiz" className="btn-primary whitespace-nowrap">
                Get started
              </Link>
            </>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-2">
          {signedIn ? (
            <Link to="/app" className="btn-primary">Dashboard</Link>
          ) : (
            <Link to="/signup" className="btn-primary">Start free</Link>
          )}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="btn-secondary btn-icon"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-hairline bg-background">
          <div className="container-page py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={`${l.to}-${l.hash ?? ""}`}
                to={l.to}
                hash={l.hash}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-display font-medium"
              >
                {l.label}
              </Link>
            ))}
            {signedIn ? (
              <Link to="/app" className="py-2 text-sm font-display font-medium">
                Open dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="py-2 text-sm font-display font-medium text-muted-foreground"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
