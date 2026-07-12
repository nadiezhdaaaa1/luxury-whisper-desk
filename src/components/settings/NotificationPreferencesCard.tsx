import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Lock, Mail } from "lucide-react";
import {
  CHANNEL_META,
  DEFAULT_PREFS,
  getPrefs,
  onPrefsChange,
  setPref,
  type NotificationChannel,
  type NotificationPrefs,
} from "@/lib/notifications-mock";
import { track } from "@/lib/analytics";

const ORDER: NotificationChannel[] = [
  "price_alerts",
  "weekly_digest",
  "plan_updates",
  "security_alerts",
  "product_news",
];

export function NotificationPreferencesCard() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(getPrefs());
    return onPrefsChange(() => setPrefs(getPrefs()));
  }, []);

  function toggle(ch: NotificationChannel, value: boolean) {
    if (CHANNEL_META[ch].required && !value) return;
    setPref(ch, value);
    track("notification_pref_toggled", { channel: ch, value });
  }

  return (
    <section id="notifications" className="mt-8">
      <h2 className="font-display text-base font-medium mb-3 text-foreground">Email notifications</h2>
      <div className="rounded-2xl border border-hairline bg-background overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            Whispers only — one email per meaningful event. No marketing spam.
          </div>
          <Link
            to="/app/email-preview"
            onClick={() => track("email_preview_opened")}
            className="ml-auto text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
          >
            Preview
          </Link>
        </div>
        <ul>
          {ORDER.map((ch, i) => {
            const meta = CHANNEL_META[ch];
            const checked = prefs[ch];
            return (
              <li
                key={ch}
                className={
                  "flex items-start gap-4 px-5 py-4 " +
                  (i < ORDER.length - 1 ? "border-b border-hairline" : "")
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-foreground">{meta.label}</span>
                    {meta.required ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
                        <Lock className="h-3 w-3" /> Required
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
                </div>
                <Switch
                  checked={checked}
                  disabled={meta.required}
                  onCheckedChange={(v) => toggle(ch, v)}
                  aria-label={meta.label}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
