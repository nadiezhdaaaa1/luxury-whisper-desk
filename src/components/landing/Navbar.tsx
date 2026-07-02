import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#categories", label: "Categories" },
  { href: "#audience", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-6 z-40 px-3 -mb-14">
      <div className="mx-auto max-w-4xl rounded-full border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
        <div className="flex h-14 items-center justify-between gap-6 pl-6 pr-3">
          <a href="/" className="font-display text-lg font-bold tracking-tight">
            Lux<span className="text-champagne">Tracker</span>
          </a>

          <nav className="hidden lg:flex items-center gap-7">
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

          <div className="hidden lg:flex items-center gap-2">
            <a
              href="/login"
              className="text-sm font-display font-medium text-muted-foreground hover:text-foreground transition-colors px-3"
            >
              Log in
            </a>
            <a href="/start" className="btn-primary text-sm rounded-full">
              Start tracking free
            </a>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <a href="/start" className="btn-primary text-xs px-4 py-2 rounded-full">
              Start free
            </a>
            <button
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="p-2 rounded-full border border-hairline bg-white/60"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-white/40 rounded-b-3xl">
            <div className="px-6 py-4 flex flex-col gap-3">
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
              <a href="/login" className="py-2 text-sm font-display font-medium text-muted-foreground">
                Log in
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
