import { Sparkles, Tag, TrendingUp, Zap } from "lucide-react";
import type { SignalType } from "@/lib/signals";

export const SIGNAL_TYPE_STYLE: Record<
  SignalType,
  { icon: typeof TrendingUp; bg: string; text: string; ring: string; dot: string }
> = {
  price_increase: {
    icon: TrendingUp,
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
  },
  new_collection: {
    icon: Sparkles,
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/20",
    dot: "bg-primary",
  },
  discount: {
    icon: Tag,
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
  drop: {
    icon: Zap,
    bg: "bg-purple-100",
    text: "text-purple-800",
    ring: "ring-purple-200",
    dot: "bg-purple-500",
  },
};
