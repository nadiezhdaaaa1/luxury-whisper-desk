import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePointerGlow } from "@/hooks/use-pointer-glow";

export function FinalCTA() {
  const ctaRef = usePointerGlow<HTMLAnchorElement>();
  return (
    <section className="py-6 bg-surface">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 lg:p-16"
          style={{ backgroundColor: "var(--brand-red)" }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 679.127 678.256"
            className="pointer-events-none absolute h-[680px] w-[680px] bottom-[-322.84px] right-[-231px]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              opacity="0.4"
              fill="var(--brand-red-shade)"
              d="M339.564 0L353.632 201.653L408.005 6.95981L381.193 207.317L473.645 27.5544L407.05 218.413L533.795 60.9404L430.143 234.487L585.993 105.751L449.529 254.881L628.103 160.152L464.412 278.759L658.399 221.916L474.184 305.144L675.643 288.515L478.445 332.957L679.127 357.221L477.02 361.058L668.71 425.222L469.967 388.296L644.817 489.734L457.576 413.558L608.427 548.116L440.353 435.808L561.03 597.978L419.004 454.135L504.566 637.278L394.403 467.79L441.347 664.407L367.556 476.213L373.961 678.256L339.564 479.06L305.166 678.256L311.571 476.213L237.78 664.407L284.724 467.79L174.561 637.278L260.123 454.135L118.097 597.978L238.774 435.808L70.6999 548.116L221.551 413.558L34.3101 489.734L209.16 388.296L10.4174 425.222L202.107 361.058L0 357.221L200.682 332.957L3.48438 288.515L204.943 305.144L20.7279 221.916L214.715 278.759L51.0245 160.152L229.598 254.881L93.134 105.751L248.984 234.487L145.332 60.9404L272.078 218.413L205.483 27.5544L297.934 207.317L271.122 6.95981L325.495 201.653L339.564 0Z"
            />
          </svg>
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div className="max-w-2xl">
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-white">
                Ready for your next great find?
              </h2>
              <p className="mt-5 text-base text-white/70 max-w-lg">
                Follow your favorite brands, save the pieces you love, and we'll let you know when
                it's the right time to buy.
              </p>
              <Link ref={ctaRef} to="/quiz" className="mt-8 btn-on-brand">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
