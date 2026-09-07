import type { SVGProps, ComponentType } from "react";
import {
  FacebookIcon,
  InstagramIcon,
  YouTubeIcon,
  PinterestIcon,
  RedditIcon,
  TikTokIcon,
} from "@/components/icons/SocialIcons";

export type SocialLink = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Clean canonical profile URL, no query string. */
  url: string;
  enabled: boolean;
};

/** Single source of truth for PriceYou social profiles. */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "Instagram",
    Icon: InstagramIcon,
    url: "https://www.instagram.com/price_you_/",
    enabled: true,
  },
  {
    label: "TikTok",
    Icon: TikTokIcon,
    url: "https://www.tiktok.com/@price.you.app",
    enabled: true,
  },
  {
    label: "YouTube",
    Icon: YouTubeIcon,
    url: "https://www.youtube.com/@Price_You",
    enabled: true,
  },
  {
    label: "Reddit",
    Icon: RedditIcon,
    url: "https://www.reddit.com/user/Price_You/",
    enabled: true,
  },
  // Hidden for now — flip `enabled` to bring them back.
  { label: "Facebook", Icon: FacebookIcon, url: "", enabled: false },
  {
    label: "Pinterest",
    Icon: PinterestIcon,
    url: "https://www.pinterest.com/price_you_/",
    enabled: false,
  },
];

/** Only the networks we currently render, in display order. */
export const activeSocialLinks = SOCIAL_LINKS.filter((s) => s.enabled);

/** Canonical profile URLs for structured data. */
export const socialProfileUrls = activeSocialLinks.map((s) => s.url);
