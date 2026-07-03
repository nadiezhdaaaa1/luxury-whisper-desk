import { Clock, Images, DollarSign, Timer } from "lucide-react";

const GOLD = "#C9A84C";

const problems = [
  {
    icon: Clock,
    title: "Price rises arrive late",
    text: "Brands raise retail prices with no announcement. You hear it on forums 24–48h later — when the piece is already gone.",
  },
  {
    icon: Images,
    title: "Your collection is scattered",
    text: "Prices, photos, notes, and documents live across Excel, WhatsApp, notes, and folders.",
  },
  {
    icon: DollarSign,
    title: "You don't see total capital",
    text: "You know what you paid for each piece — not what the whole collection is worth today.",
  },
  {
    icon: Timer,
    title: "Windows close fast",
    text: "Drops, discounts, and resale gaps disappear within hours. Miss the signal, miss the move.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-t border-hairline py-20 lg:py-28">
      <div className="container-page">
        <div className="max-w-2xl">
          <span className="eyebrow">The problem</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            The luxury market moves faster than your spreadsheet
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Collectors and resellers track value by hand, across scattered tools — and learn about price moves too late
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className={`flex flex-col gap-4 ${
                i === 0 ? "lg:pr-14" : i === problems.length - 1 ? "lg:pl-14" : "lg:px-14"
              } ${i > 0 ? "lg:border-l lg:border-hairline" : ""} ${
                i > 0 ? "md:[&:nth-child(even)]:border-l md:[&:nth-child(even)]:border-hairline md:[&:nth-child(even)]:pl-14 md:[&:nth-child(odd)]:pr-14" : ""
              }`}
            >
              <p.icon
                className="h-8 w-8"
                strokeWidth={1.75}
                color={GOLD}
              />
              <h3 className="font-display font-semibold text-lg leading-snug">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
