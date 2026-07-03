import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 lg:p-16"
          style={{ backgroundColor: "#001d3d" }}
        >
          <div className="relative max-w-2xl">
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-white">
              Start tracking your luxury capital.
            </h2>
            <p className="mt-5 text-base text-white/70 max-w-lg">
              Follow your brands, add your first piece, and get the price-rise signal before the forums do — in one private dashboard.
            </p>
            <a
              href="/start"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-display font-semibold text-sm text-foreground transition-opacity hover:opacity-90"
            >
              Start tracking free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
