import { Link } from "@tanstack/react-router";
import { openCookiePreferences } from "@/lib/consent";

const productLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#categories", label: "Categories" },
  { href: "#audience", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact us" },
  { href: "/login", label: "Log in" },
];

const legalLinks: { to: string; label: string }[] = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/billing", label: "Subscription & Billing" },
  { to: "/refunds", label: "Refund & Cancellation" },
  { to: "/disclaimer", label: "Valuation Disclaimer" },
  { to: "/cookies", label: "Cookie Policy" },
];

export function Footer() {
  return (
    <footer className="bg-surface/70">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-x-10 lg:grid-cols-12 lg:gap-x-16">
          {/* Logo */}
          <div className="leading-none lg:col-span-4 lg:row-start-1">
            <a href="/" className="inline-block leading-none text-xl uppercase tracking-[0.05em] text-primary" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              <span className="font-semibold">LUX</span><span className="font-normal">TRACKER</span>
            </a>
          </div>

          {/* Contact info — right on tablet, below logo on desktop */}
          <div className="w-fit md:ml-auto lg:ml-0 text-xs text-muted-foreground leading-relaxed lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:-mt-4">
            <p className="font-display font-semibold text-foreground/80">ZENTARO SYSTEMS LTD · trading as LuxTracker</p>
            <p className="mt-1">167–169 Great Portland Street, 5th Floor</p>
            <p>London, W1W 5PF · Company No. 17178666</p>
            <p className="mt-1">
              <a href="mailto:hello@luxtracker.com" className="hover:text-foreground transition-colors">hello@luxtracker.com</a>
            </p>
          </div>

          {/* Menus */}
          <div className="md:col-span-2 lg:col-span-8 lg:col-start-5 lg:row-start-1 lg:row-span-2 flex flex-col md:flex-row md:justify-start lg:justify-end gap-10 md:gap-24">
            <div>
              <h4 className="font-display font-semibold text-sm uppercase tracking-[0.14em] text-muted-foreground">Product</h4>
              <div className="mt-6 grid grid-cols-2 gap-x-16 gap-y-2.5">
                <ul className="space-y-2.5">
                  {productLinks.slice(0, 4).map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-sm text-foreground/80 hover:text-foreground transition-colors">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2.5">
                  {productLinks.slice(4).map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-sm text-foreground/80 hover:text-foreground transition-colors">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-display font-semibold text-sm uppercase tracking-[0.14em] text-muted-foreground">Legal</h4>
              <div className="mt-6 grid grid-cols-2 gap-x-16 gap-y-2.5">
                <ul className="space-y-2.5">
                  {legalLinks.slice(0, 4).map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-sm text-foreground/80 hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2.5">
                  {legalLinks.slice(4).map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-sm text-foreground/80 hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={openCookiePreferences}
                      className="text-sm text-foreground/80 hover:text-foreground transition-colors text-left"
                    >
                      Cookie settings
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-16 border-t border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2026 Zentaro Systems Ltd. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">
            LuxTracker is not affiliated with any of the brands shown. Values are estimates, not investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
