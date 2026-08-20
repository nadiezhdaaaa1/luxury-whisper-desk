/**
 * The one place the production origin is written down.
 *
 * DELIBERATE: this is a hardcoded constant, NOT an environment variable, and
 * NOT derived from the request host. A previous build derived it from the
 * environment and shipped `http://localhost:3000` as the canonical URL,
 * og:url and sitemap host on the production domain — which tells Google the
 * real pages are duplicates of an address it cannot reach. There is exactly
 * one production origin, so there is nothing to configure. Do not reintroduce
 * an env var or a request-host lookup here.
 *
 * Consequence to keep in mind: preview and staging deploys will also emit
 * price.you canonicals. That is intended — previews must not compete in
 * search — but any non-production host must also send `noindex`.
 */
export const SITE_URL = "https://price.you";

/** Absolute URL for a site-relative path. canonicalUrl("/blog") -> "https://price.you/blog" */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
