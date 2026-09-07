import type { SVGProps, ComponentType } from "react";
import {
  FacebookIcon,
  InstagramIcon,
  YouTubeIcon,
  PinterestIcon,
  RedditIcon,
  TikTokIcon,
} from "@/components/icons/SocialIcons";

export type SocialSurface = "footer" | "sidebar";

export type SocialLink = {
  /** Lowercase network key, used for UTM campaign names. */
  network: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Clean canonical profile URL, no query string. */
  url: string;
  enabled: boolean;
};

/** Single source of truth for PriceYou social profiles. */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    network: "instagram",
    label: "Instagram",
    Icon: InstagramIcon,
    url: "https://www.instagram.com/price_you_/",
    enabled: true,
  },
  {
    network: "tiktok",
    label: "TikTok",
    Icon: TikTokIcon,
    url: "https://www.tiktok.com/@price.you.app",
    enabled: true,
  },
  {
    network: "youtube",
    label: "YouTube",
    Icon: YouTubeIcon,
    url: "https://www.youtube.com/@Price_You",
    enabled: true,
  },
  {
    network: "reddit",
    label: "Reddit",
    Icon: RedditIcon,
    url: "https://www.reddit.com/user/Price_You/",
    enabled: true,
  },
  // Hidden for now — flip `enabled` to bring them back.
  { network: "facebook", label: "Facebook", Icon: FacebookIcon, url: "", enabled: false },
  {
    network: "pinterest",
    label: "Pinterest",
    Icon: PinterestIcon,
    url: "https://www.pinterest.com/price_you_/",
    enabled: false,
  },
];

/** Only the networks we currently render, in display order. */
export const activeSocialLinks = SOCIAL_LINKS.filter((s) => s.enabled);

const SURFACE_UTM: Record<SocialSurface, { source: string; medium: string; id: string }> = {
  footer: { source: "website", medium: "website footer", id: "website" },
  sidebar: { source: "app", medium: "app sidebar", id: "app" },
};

/** Base profile URL with surface-specific UTM params appended. */
export function socialUrl(link: SocialLink, surface: SocialSurface): string {
  if (!link.url) return link.url;
  const { source, medium, id } = SURFACE_UTM[surface];
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: `${link.network} ${medium}`,
    utm_id: id,
  });
  const query = params.toString().replace(/%20/g, "+");
  return `${link.url}${link.url.includes("?") ? "&" : "?"}${query}`;
}

/** Clean canonical profile URLs for structured data (no UTMs). */
export const socialProfileUrls = activeSocialLinks.map((s) => s.url);
