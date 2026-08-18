import { ArrowRight } from "lucide-react";
import { ParticleField } from "./ParticleField";
import { usePointerGlow } from "@/hooks/use-pointer-glow";

export function FinalCTA() {
  const ctaRef = usePointerGlow<HTMLAnchorElement>();
  return (
    <section className="py-6 bg-surface/70">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 lg:p-16 mx-auto max-w-[calc(80rem-48px)]"
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
                Follow your favorite brands, save the pieces you love, and we'll let you know when
                it's the right time to buy.
              </p>
              <a ref={ctaRef} href="/quiz" className="mt-8 btn-on-navy pointer-events-auto">
                Start free <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
