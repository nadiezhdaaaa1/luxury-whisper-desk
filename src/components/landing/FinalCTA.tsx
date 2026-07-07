import { ArrowRight } from "lucide-react";
import { ParticleField } from "./ParticleField";

export function FinalCTA() {
  return (
    <section className="py-6 bg-surface/70">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 lg:p-16"
          style={{ backgroundColor: "#001d3d" }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto">
              <ParticleField />
            </div>
          </div>
          <div className="relative grid lg:grid-cols-2 gap-10 items-center pointer-events-none">
            <div className="max-w-2xl pointer-events-auto">
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-white">
                Ready for your next great find?
              </h2>
              <p className="mt-5 text-base text-white/70 max-w-lg">
                Follow your brands, add your first piece, and get the price-rise signal before the forums do — in one private dashboard
              </p>
              <a
                href="/quiz"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-display font-semibold text-sm text-foreground transition-opacity hover:opacity-90"
              >
                Start tracking free <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
