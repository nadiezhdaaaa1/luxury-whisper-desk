import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import {
  WelcomeEmail,
  PriceAlertEmail,
  WeeklyDigestEmail,
  SubscriptionCanceledEmail,
  SubscriptionRenewedEmail,
  AccountDeletionScheduledEmail,
  AccountDeletionCanceledEmail,
  EmailVerificationEmail,
  MagicLinkEmail,
  PasswordResetEmail,
  PasswordChangedEmail,
  NewSignInEmail,
  PortfolioPausedEmail,
  TrialEndingEmail,
  PaymentFailedEmail,
} from "@/components/emails/Templates";
import {
  clearEmailLog,
  getEmailLog,
  onPrefsChange,
  sendMockEmail,
  type EmailLogEntry,
  type EmailTemplate,
} from "@/lib/notifications-mock";

export const Route = createFileRoute("/_authenticated/app/email-preview")({
  component: EmailPreviewPage,
});

type Template = {
  id: EmailTemplate;
  label: string;
  group: "Auth" | "Alerts" | "Product" | "Billing" | "Account";
  channel: Parameters<typeof sendMockEmail>[0]["channel"];
  render: () => React.ReactNode;
};

const TEMPLATES: Template[] = [
  // Auth
  { id: "welcome", label: "Welcome", group: "Auth", channel: "product_news", render: () => <WelcomeEmail displayName="there" /> },
  { id: "email_verification", label: "Verify email", group: "Auth", channel: "security_alerts", render: () => <EmailVerificationEmail /> },
  { id: "magic_link", label: "Magic sign-in link", group: "Auth", channel: "security_alerts", render: () => <MagicLinkEmail /> },
  { id: "password_reset", label: "Password reset", group: "Auth", channel: "security_alerts", render: () => <PasswordResetEmail /> },
  { id: "password_changed", label: "Password changed", group: "Auth", channel: "security_alerts", render: () => <PasswordChangedEmail /> },
  { id: "new_sign_in", label: "New sign-in", group: "Auth", channel: "security_alerts", render: () => <NewSignInEmail /> },

  // Alerts
  { id: "price_alert", label: "Price alert · above", group: "Alerts", channel: "price_alerts", render: () => <PriceAlertEmail direction="above" /> },
  { id: "price_alert_below", label: "Price alert · below", group: "Alerts", channel: "price_alerts", render: () => <PriceAlertEmail direction="below" /> },
  { id: "weekly_digest", label: "Weekly digest", group: "Product", channel: "weekly_digest", render: () => <WeeklyDigestEmail /> },

  // Product
  { id: "portfolio_paused", label: "Portfolio item paused", group: "Product", channel: "plan_updates", render: () => <PortfolioPausedEmail /> },

  // Billing
  { id: "trial_ending", label: "Trial ending", group: "Billing", channel: "plan_updates", render: () => <TrialEndingEmail /> },
  { id: "subscription_renewed", label: "Subscription renewed", group: "Billing", channel: "plan_updates", render: () => <SubscriptionRenewedEmail /> },
  { id: "subscription_canceled", label: "Subscription cancelled", group: "Billing", channel: "plan_updates", render: () => <SubscriptionCanceledEmail /> },
  { id: "payment_failed", label: "Payment failed", group: "Billing", channel: "plan_updates", render: () => <PaymentFailedEmail /> },

  // Account
  { id: "account_deletion_scheduled", label: "Deletion scheduled", group: "Account", channel: "security_alerts", render: () => <AccountDeletionScheduledEmail /> },
  { id: "account_deletion_canceled", label: "Deletion cancelled", group: "Account", channel: "security_alerts", render: () => <AccountDeletionCanceledEmail /> },
];

const GROUP_ORDER: Template["group"][] = ["Auth", "Alerts", "Product", "Billing", "Account"];

function EmailPreviewPage() {
  const [active, setActive] = useState<EmailTemplate>(TEMPLATES[0].id);
  const [log, setLog] = useState<EmailLogEntry[]>([]);

  useEffect(() => {
    setLog(getEmailLog());
    return onPrefsChange(() => setLog(getEmailLog()));
  }, []);

  const current = TEMPLATES.find((t) => t.id === active) ?? TEMPLATES[0];

  function handleSend() {
    sendMockEmail({
      template: current.id,
      channel: current.channel,
      to: "you@example.com",
      data: { preview: true },
    });
    setLog(getEmailLog());
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to="/app/settings"
            hash="notifications"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to settings
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Email preview</h1>
          <p className="text-sm text-muted-foreground">
            Design-only mockups. Sending logs to console + respects your notification preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          {GROUP_ORDER.map((group) => {
            const items = TEMPLATES.filter((t) => t.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-1">
                <div className="px-3 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
                  {group}
                </div>
                {items.map((t) => {
                  const isActive = t.id === active;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActive(t.id)}
                      className={
                        "w-full text-left rounded-xl px-3 py-2 text-sm transition-colors " +
                        (isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-surface-2")
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="pt-4 mt-4 border-t border-hairline">
            <div className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Sent (mock)
            </div>
            {log.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nothing sent yet.</p>
            ) : (
              <ul className="space-y-1 max-h-64 overflow-y-auto">
                {log.slice(0, 10).map((entry) => (
                  <li key={entry.id} className="text-xs text-muted-foreground">
                    <span className={entry.skipped ? "line-through opacity-60" : ""}>{entry.template}</span>
                    {entry.skipped ? <span className="ml-1 text-[10px]">(opted out)</span> : null}
                  </li>
                ))}
              </ul>
            )}
            {log.length > 0 ? (
              <button
                type="button"
                onClick={() => { clearEmailLog(); setLog([]); }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Clear log
              </button>
            ) : null}
          </div>
        </aside>

        {/* Preview canvas */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Channel: <span className="font-medium text-foreground">{current.channel}</span>
            </div>
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
              Send test
            </button>
          </div>
          <div className="rounded-2xl bg-surface-2 p-6 sm:p-10">
            {current.render()}
          </div>
        </div>
      </div>
    </div>
  );
}
