import { Bell, LayoutGrid, Wallet, Timer } from "lucide-react";

const problems = [
  {
    icon: Bell,
    title: "Price rises arrive late",
    text: "Brands raise retail prices with no announcement. You hear it on forums 24–48h later — when the piece is already gone.",
    featured: true,
  },
  {
    icon: LayoutGrid,
    title: "Your collection is scattered",
    text: "Prices, photos, notes, and documents live across Excel, WhatsApp, notes, and folders.",
  },
  {
    icon: Wallet,
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
            The luxury market moves faster than your spreadsheet.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Collectors and resellers track value by hand, across scattered tools — and learn about price moves too late.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((p) => (
            <div
              key={p.title}
              className={`card-soft p-6 flex flex-col gap-4 ${
                p.featured ? "ring-1 ring-champagne/50 bg-champagne-soft/40" : ""
              }`}
            >
              <div className="h-10 w-10 rounded-xl grid place-items-center border border-hairline bg-surface">
                <p.icon className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg leading-snug">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
