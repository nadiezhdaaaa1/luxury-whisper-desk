import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#categories", label: "Categories" },
  { href: "#audience", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { session, loading } = useAuth();
  const signedIn = !!session;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/80 backdrop-blur-md">
      <div className="container-page relative flex h-16 items-center justify-between gap-6">
        <a href="/" className="text-xl uppercase tracking-[0.05em] text-primary" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <span className="font-semibold">LUX</span><span className="font-normal">TRACKER</span>
        </a>

        <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-display font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          {loading ? null : signedIn ? (
            <a href="/app" className="btn-primary text-sm whitespace-nowrap">Open dashboard</a>
          ) : (
            <>
              <a href="/login" className="text-sm font-display font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </a>
              <a href="/signup" className="btn-primary text-sm whitespace-nowrap">Get started</a>
            </>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <a href={signedIn ? "/app" : "/signup"} className="btn-primary text-xs px-4 py-2">
            {signedIn ? "Dashboard" : "Start free"}
          </a>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-full border border-hairline"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-hairline bg-background">
          <div className="container-page py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-display font-medium"
              >
                {l.label}
              </a>
            ))}
            {signedIn ? (
              <a href="/app" className="py-2 text-sm font-display font-medium">Open dashboard</a>
            ) : (
              <a href="/login" className="py-2 text-sm font-display font-medium text-muted-foreground">Log in</a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
