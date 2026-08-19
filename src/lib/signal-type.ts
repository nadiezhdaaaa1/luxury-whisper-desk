import { Gem, ShoppingBag, Sparkles, Tag, TrendingUp, Watch, Zap } from "lucide-react";
import type { SignalCategory, SignalType } from "@/lib/signals";

export const SIGNAL_CATEGORY_ICON: Record<SignalCategory, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};

export const SIGNAL_CATEGORY_LABEL: Record<SignalCategory, string> = {
  watches: "Watch",
  jewelry: "Jewelry",
  bags: "Bag",
};

export const SIGNAL_TYPE_STYLE: Record<
  SignalType,
  { icon: typeof TrendingUp; bg: string; text: string; ring: string; dot: string }
> = {
  price_increase: {
    icon: TrendingUp,
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-amber-200",
    dot: "bg-[var(--signal-price-increase)]",
  },
  new_collection: {
    icon: Sparkles,
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/20",
    dot: "bg-[var(--signal-new-collection)]",
  },
  discount: {
    icon: Tag,
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    ring: "ring-emerald-200",
    dot: "bg-[var(--signal-discount)]",
  },
  drop: {
    icon: Zap,
    bg: "bg-purple-100",
    text: "text-purple-800",
    ring: "ring-purple-200",
    dot: "bg-[var(--signal-drop)]",
  },
};
