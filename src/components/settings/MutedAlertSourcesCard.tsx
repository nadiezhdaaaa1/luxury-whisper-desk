import { BellOff, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { unmuteSource, useMutedSources } from "@/lib/muted-sources";

export function MutedAlertSourcesCard() {
  const muted = useMutedSources();

  return (
    <section id="muted-sources" className="mt-8">
      <h2 className="font-display text-base font-medium mb-3 text-foreground">Muted alert sources</h2>
      <div className="rounded-2xl border border-hairline bg-background overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <BellOff className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            Alerts about your brands from these sources are hidden. Alerts from
            other sources on the same brand still come through.
          </div>
        </div>
        {muted.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">
            Nothing muted. Tap the bell icon on a price alert to silence its source.
          </div>
        ) : (
          <ul>
            {muted.map((host, i) => (
              <li
                key={host}
                className={
                  "flex items-center gap-3 px-5 py-3 " +
                  (i < muted.length - 1 ? "border-b border-hairline" : "")
                }
              >
                <span className="font-mono text-sm text-foreground truncate">{host}</span>
                <button
                  type="button"
                  onClick={() => {
                    unmuteSource(host);
                    track("signal_source_unmuted", { host, via: "settings" });
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-hairline bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                  aria-label={`Unmute ${host}`}
                >
                  <X className="h-3 w-3" /> Unmute
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
