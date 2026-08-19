import { useEffect, useState } from "react";
import { Lock, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { track } from "@/lib/analytics";
import {
  quietHoursStatus,
  useAlertDelivery,
  type AlertDelivery,
  type AlertRhythm,
  type MinMove,
  type QuietDays,
  type QuietOnEnd,
} from "@/lib/alert-delivery";

type Props = { plan?: "free" | "pro" };

const ROW = "px-5 py-4 border-t border-hairline";

function RowLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <span className="font-display text-sm font-semibold text-foreground">{title}</span>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}

export function AlertDeliveryCard({ plan }: Props) {
  const isPro = plan === "pro";
  const { settings, ready, update: save } = useAlertDelivery();
  // The status line is time-relative ("Quiet until 08:00"), so it is re-derived
  // on a minute tick even when nothing changed.
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function update(patch: Partial<AlertDelivery>, event: string) {
    if (!isPro) return;
    save(patch);
    track(event, patch as Record<string, unknown>);
  }

  const open = isPro && ready && settings.quiet_hours_enabled;
  const status = !isPro
    ? "Scheduling when alerts reach you is part of Pro."
    : ready
      ? quietHoursStatus(new Date(), settings)
      : "Loading your delivery settings…";

  return (
    <section id="alert-delivery" className="mt-8">
      <h2 className="font-display text-base font-medium mb-3 text-foreground">Alert delivery</h2>
      <div className="rounded-2xl border border-hairline bg-background overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <Moon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 text-sm text-muted-foreground">
            Control when alerts reach you, and how loud they are. Signals still arrive — you choose
            the time.
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-champagne-soft px-2.5 py-1 text-[10px] font-display font-semibold uppercase tracking-widest text-foreground">
            {isPro ? null : <Lock className="h-3 w-3" />} Pro
          </span>
        </div>

        {/* Master switch / upgrade row */}
        {isPro && !ready ? (
          <div className={`${ROW} flex items-start gap-4`} aria-busy="true">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-28 rounded bg-surface-2 animate-pulse" />
              <div className="mt-2 h-3 w-64 max-w-full rounded bg-surface-2 animate-pulse" />
            </div>
            <div className="h-6 w-11 shrink-0 rounded-full bg-surface-2 animate-pulse" />
          </div>
        ) : isPro ? (
          <div className={`${ROW} flex items-start gap-4`}>
            <RowLabel title="Quiet hours" description="Hold non-urgent alerts during set hours." />
            <Switch
              checked={settings.quiet_hours_enabled}
              onCheckedChange={(v) => update({ quiet_hours_enabled: v }, "quiet_hours_toggled")}
              aria-label="Quiet hours"
            />
          </div>
        ) : (
          <div className={`${ROW} flex items-start gap-4 flex-wrap`}>
            <RowLabel
              title="Quiet hours"
              description="Hold non-urgent alerts during set hours, choose an alert rhythm, and ignore small moves."
            />
            <a
              href="#plans"
              onClick={() => track("upgrade_viewed", { source: "alert_delivery" })}
              className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-4 text-sm font-display font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              See Pro plans
            </a>
          </div>
        )}

        {/* Locked preview */}
        {!isPro && (
          <div className="opacity-50 pointer-events-none select-none" aria-hidden="true">
            <div className={`${ROW} flex items-center gap-3`}>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <RowLabel title="Quiet window" description="22:00 – 08:00 · Every day" />
            </div>
            <div className={`${ROW} flex items-center gap-3`}>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <RowLabel
                title="Let retail price-rise alerts through"
                description="Retail increases are time-sensitive — most collectors keep this on."
              />
            </div>
            <div className={`${ROW} flex items-center gap-3`}>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <RowLabel title="Alert rhythm & minimum move" description="Instant · Any move" />
            </div>
          </div>
        )}

        {/* Progressive disclosure */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            {/* Times */}
            <div className={`${ROW} flex flex-wrap items-end gap-4`}>
              <div>
                <label
                  htmlFor="quiet-from"
                  className="block font-display text-sm font-semibold text-foreground"
                >
                  From
                </label>
                <input
                  id="quiet-from"
                  type="time"
                  value={settings.from}
                  disabled={!open}
                  onChange={(e) => update({ from: e.target.value }, "quiet_hours_time_changed")}
                  className="mt-1.5 h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="quiet-to"
                  className="block font-display text-sm font-semibold text-foreground"
                >
                  To
                </label>
                <input
                  id="quiet-to"
                  type="time"
                  value={settings.to}
                  disabled={!open}
                  onChange={(e) => update({ to: e.target.value }, "quiet_hours_time_changed")}
                  className="mt-1.5 h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className={`${ROW} flex flex-wrap items-center gap-3`}>
              <RowLabel title="Timezone" description="Quiet hours follow this device's clock." />
              <span className="font-mono text-sm text-foreground">{settings.timezone}</span>
            </div>

            {/* Days */}
            <div className={`${ROW} flex flex-wrap items-center gap-4`}>
              <RowLabel title="Days" />
              <ToggleGroup
                type="single"
                value={settings.days}
                disabled={!open}
                onValueChange={(v) =>
                  v && update({ days: v as QuietDays }, "quiet_hours_days_changed")
                }
                aria-label="Quiet hours days"
                className="gap-2"
              >
                <ToggleGroupItem value="every" className="min-h-[44px] px-4">
                  Every day
                </ToggleGroupItem>
                <ToggleGroupItem value="weekdays" className="min-h-[44px] px-4">
                  Weekdays
                </ToggleGroupItem>
                <ToggleGroupItem value="weekends" className="min-h-[44px] px-4">
                  Weekends
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* On end */}
            <div className={`${ROW}`}>
              <RowLabel title="When quiet hours end" />
              <RadioGroup
                className="mt-3 gap-3"
                value={settings.on_end}
                disabled={!open}
                onValueChange={(v) =>
                  update({ on_end: v as QuietOnEnd }, "quiet_hours_on_end_changed")
                }
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="summary" id="quiet-end-summary" />
                  <label htmlFor="quiet-end-summary" className="text-sm text-foreground">
                    Deliver held alerts as one summary
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="skip" id="quiet-end-skip" />
                  <label htmlFor="quiet-end-skip" className="text-sm text-foreground">
                    Skip them entirely
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Price rise exception */}
            <div className={`${ROW} flex items-start gap-4`}>
              <RowLabel
                title="Let retail price-rise alerts through"
                description="Retail increases are time-sensitive — most collectors keep this on."
              />
              <Switch
                checked={settings.allow_price_rise}
                disabled={!open}
                onCheckedChange={(v) =>
                  update({ allow_price_rise: v }, "quiet_hours_price_rise_toggled")
                }
                aria-label="Let retail price-rise alerts through"
              />
            </div>

            {/* Rhythm */}
            <div className={`${ROW} flex flex-wrap items-center gap-4`}>
              <RowLabel
                title="Alert rhythm"
                description="How often price alerts are delivered. Your weekly digest is separate."
              />
              <Select
                value={settings.rhythm}
                disabled={!open}
                onValueChange={(v) => update({ rhythm: v as AlertRhythm }, "alert_rhythm_changed")}
              >
                <SelectTrigger className="h-11 w-[180px]" aria-label="Alert rhythm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum move */}
            <div className={`${ROW} flex flex-wrap items-center gap-4`}>
              <RowLabel
                title="Minimum move"
                description="Ignore price changes smaller than this."
              />
              <Select
                value={String(settings.min_move)}
                disabled={!open}
                onValueChange={(v) =>
                  update({ min_move: Number(v) as MinMove }, "alert_min_move_changed")
                }
              >
                <SelectTrigger className="h-11 w-[180px]" aria-label="Minimum move">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any move</SelectItem>
                  <SelectItem value="3">3%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Status strip */}
        <div className="px-5 py-3 border-t border-hairline bg-surface-2/60">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}
