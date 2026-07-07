import { Check } from "lucide-react";

const cards = [
  {
    label: "Primary",
    labelColor: "#001d3d",
    title: "For resellers",
    text: "Find great buying opportunities before everyone else.",
...
    text: "Keep everything you own organized and always know what's in your collection.",
...
    text: "Planning your next purchase? We'll help you buy at the right time.",
...
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Made for anyone who loves buying luxury smarter
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-px bg-hairline overflow-hidden rounded-sm border border-hairline">
          {cards.map((c) => (
            <div
              key={c.title}
              className="p-7 pb-9 lg:p-9 lg:pb-11 flex flex-col bg-background"
            >
              <span
                className="inline-flex self-start text-[11px] font-display font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: c.labelColor }}
              >
                {c.label}
              </span>
              <h3 className="mt-4 font-display font-semibold text-2xl">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
              <ul className="mt-5 space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="mt-0.5 h-5 w-5 rounded-full grid place-items-center shrink-0"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--positive) 10%, transparent)",
                        color: "var(--positive)",
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
