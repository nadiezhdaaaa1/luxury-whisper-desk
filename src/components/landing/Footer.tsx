import { Link } from "@tanstack/react-router";
import { openCookiePreferences, optOutOfSaleOrSharing } from "@/lib/consent";
import { Logo } from "@/components/Logo";
import {
  FacebookIcon,
  InstagramIcon,
  YouTubeIcon,
  PinterestIcon,
  RedditIcon,
  TikTokIcon,
} from "@/components/icons/SocialIcons";

const socialLinks = [
  { href: "#", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.instagram.com/price_you_/", label: "Instagram", Icon: InstagramIcon },
  {
    href: "https://www.youtube.com/channel/UChJzuOb2r2a1YzjbWZi_PPg",
    label: "YouTube",
    Icon: YouTubeIcon,
  },
  { href: "https://www.pinterest.com/price_you_/", label: "Pinterest", Icon: PinterestIcon },
  { href: "https://www.reddit.com/user/Price_You/", label: "Reddit", Icon: RedditIcon },
  { href: "https://www.tiktok.com/@price.you.app", label: "TikTok", Icon: TikTokIcon },
];

const productLinks = [
  { to: "/" as const, hash: "how", label: "How it works" },
  { to: "/" as const, hash: "features", label: "Features" },
  { to: "/" as const, hash: "categories", label: "Categories" },
  { to: "/" as const, hash: "audience", label: "Who it's for" },
  { to: "/" as const, hash: "pricing", label: "Pricing" },
  { to: "/blog" as const, label: "Blog" },
  { to: "/contact" as const, label: "Contact us" },
  { to: "/login" as const, label: "Log in" },
];

const legalLinks: { to: string; label: string }[] = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/billing", label: "Subscription & Billing" },
  { to: "/refunds", label: "Refund & Cancellation" },
  { to: "/disclaimer", label: "Signal & Estimate Disclaimer" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/dmca", label: "DMCA Copyright" },
];

export function Footer() {
  return (
    <footer className="bg-surface/70">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-x-10 lg:grid-cols-12 lg:gap-x-16">
          {/* Logo */}
          <div className="leading-none lg:col-span-4 lg:row-start-1">
            <Link to="/" className="inline-block leading-none" aria-label="PriceYou home">
              <Logo className="text-2xl text-muted-foreground" />
            </Link>
            <ul className="mt-5 flex flex-wrap items-center gap-5">
              {socialLinks.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex text-muted-foreground transition-all duration-200 hover:text-primary hover:scale-110"
                  >
                    <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info — right on tablet, below logo on desktop */}
          <div className="w-fit md:ml-auto lg:ml-0 text-xs text-muted-foreground leading-relaxed lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:-mt-4">
            <p className="font-display font-semibold text-foreground/80">
              KERIVO STUDIO LIMITED&nbsp; · trading as PriceYou
            </p>
            <p className="mt-1">
              5 South Charlotte Street,&nbsp;
              <br />
              Edinburgh, EH2 4AN, United Kingdom&nbsp;
              <br />
              Company No. SC889293
            </p>
            <p className="mt-1">
              <a href="mailto:hello@price.you" className="hover:text-foreground transition-colors">
                hello@price.you
              </a>
            </p>
          </div>

          {/* Menus */}
          <div className="md:col-span-2 lg:col-span-8 lg:col-start-5 lg:row-start-1 lg:row-span-2 flex flex-col md:flex-row md:justify-start lg:justify-end gap-10 md:gap-24">
            <div>
              <p className="font-display font-semibold text-sm uppercase tracking-[0.14em] text-muted-foreground">
                Product
              </p>
              <div className="mt-6 grid grid-cols-[repeat(2,minmax(0,max-content))] gap-x-16 gap-y-2.5 [&_a]:block [&_a]:max-w-[200px] [&_button]:max-w-[200px]">
                <ul className="space-y-2.5">
                  {productLinks.slice(0, 4).map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        hash={l.hash}
                        className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2.5">
                  {productLinks.slice(4).map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        hash={l.hash}
                        className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <p className="font-display font-semibold text-sm uppercase tracking-[0.14em] text-muted-foreground">
                Legal
              </p>
              <div className="mt-6 grid grid-cols-[repeat(2,minmax(0,max-content))] gap-x-16 gap-y-2.5 [&_a]:block [&_a]:max-w-[200px] [&_button]:max-w-[200px]">
                <ul className="space-y-2.5">
                  {legalLinks.slice(0, 4).map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2.5">
                  {legalLinks.slice(4).map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                      >
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
                  <li>
                    <button
                      type="button"
                      onClick={optOutOfSaleOrSharing}
                      className="text-sm text-foreground/80 hover:text-foreground transition-colors text-left"
                    >
                      Do Not Sell or Share My Personal Information
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-16 border-t border-surface-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 KERIVO STUDIO LIMITED. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            PriceYou is not affiliated with any of the brands shown. Values are estimates, not
            investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
