import { Clock, Images, DollarSign, Timer } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Price rises arrive late",
    text: "Brands raise retail prices with no announcement. You hear it on forums 24–48h later — when the piece is already gone.",
    color: "var(--brand-red-strong)", // brand red
  },
  {
    icon: Images,
    title: "Your collection is scattered",
    text: "Prices, photos, notes, and documents live across Excel, WhatsApp, notes, and folders.",
    color: "#001d3d", // dark navy
  },
  {
    icon: DollarSign,
    title: "You don't see total capital",
    text: "You know what you paid for each piece — not what the whole collection is worth today.",
    color: "#034748", // deep green
  },
  {
    icon: Timer,
    title: "Good opportunities don't wait\u00a0",
    text: "Drops, discounts, and resale gaps disappear within hours. Miss the alert, miss the move.",
    color: "#3d1e5a", // dark aubergine purple
  },
];

export function ProblemSection() {
  return (
    <section className="border-t border-hairline py-16 lg:py-24">
      <div className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          {/* Left: Context */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <span className="eyebrow">The problem</span>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] text-foreground">
              Keeping track shouldn't feel like a full-time job
            </h2>

            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-md">
              Your wishlist, collection, and prices are spread across different apps. By the time
              you spot a change, the opportunity is often gone.
            </p>
          </div>

          {/* Right: 2×2 grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-hairline overflow-hidden rounded-sm border border-hairline">
            {problems.map((p) => (
              <div
                key={p.title}
                className="group bg-background p-5 lg:p-10 transition-colors duration-500 hover:bg-white"
              >
                <div className="mb-8 transition-transform duration-500 group-hover:scale-110 origin-left">
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    <p.icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold leading-tight mb-3 text-foreground">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
