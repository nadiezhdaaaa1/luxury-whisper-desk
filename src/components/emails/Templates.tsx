import { EmailShell } from "./EmailShell";

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function WelcomeEmail({ displayName = "there" }: { displayName?: string }) {
  return (
    <EmailShell
      previewText="Welcome to PriceYou — here's how to get the most from your account."
      headline={`Welcome, ${displayName}.`}

      intro="You now have a quiet, calm way to track the pieces you care about. Two suggestions to make the first week useful:"
      cta={{ label: "Open my portfolio", href: "/app/portfolio" }}
      footerNote="Reply to this email if you want a hand setting things up — a human reads every message."
    >
      <ol className="text-sm text-foreground space-y-3 list-decimal pl-5">
        <li>Add 2–3 pieces you already own to your portfolio. We'll begin tracking market movement quietly.</li>
        <li>Follow a brand or a specific reference on your brand watchlist. You'll get a whisper — never spam — when price crosses your target.</li>
      </ol>
    </EmailShell>
  );
}

export function PriceAlertEmail({
  brand = "Rolex",
  model = "Submariner 126610LN",
  direction = "above" as "above" | "below",
  target = 14500,
  current = 15200,
}: {
  brand?: string;
  model?: string;
  direction?: "above" | "below";
  target?: number;
  current?: number;
} = {}) {
  const above = direction === "above";
  const pct = target > 0 ? Math.abs(((current - target) / target) * 100) : 0;
  return (
    <EmailShell
      previewText={`${brand} ${model} is now ${above ? "above" : "below"} your target price.`}
      headline={above ? "Your target has been passed." : "Your target price is in reach."}
      intro={`${brand} ${model} just moved ${above ? "above" : "below"} the price you set.`}
      cta={{ label: "Open my brand watchlist", href: "/app/watchlist" }}
    >
      <div className="rounded-xl border border-hairline bg-surface-2/40 p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Target</span>
          <span className="font-semibold text-foreground">{fmtUSD(target)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Now</span>
          <span className="font-display text-lg font-semibold text-foreground">{fmtUSD(current)}</span>
        </div>
        <div className="flex items-center justify-between text-sm pt-1 border-t border-hairline">
          <span className="text-muted-foreground">Move</span>
          <span className={above ? "font-semibold text-[color:var(--alert)]" : "font-semibold text-[color:var(--positive)]"}>
            {above ? "+" : "−"}{pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        We only whisper — one email per crossing. Adjust or clear your target from the brand watchlist card.
      </p>
    </EmailShell>
  );
}

export function WeeklyDigestEmail({
  portfolioCount = 6,
  watchlistCount = 12,
  topMovers = [
    { name: "Patek 5711/1A", pct: 4.2 },
    { name: "Hermès Kelly 25", pct: 3.1 },
    { name: "Cartier Tank", pct: -1.8 },
  ] as Array<{ name: string; pct: number }>,
} = {}) {
  return (
    <EmailShell
      previewText="Your Sunday summary — quiet movement across the things you care about."
      headline="Your week, at a glance."
      intro={`${portfolioCount} pieces in your portfolio · ${watchlistCount} on your brand watchlist. No urgent alerts this week — just movement worth noticing.`}
      cta={{ label: "See the details", href: "/app/portfolio" }}
    >
      <div className="rounded-xl border border-hairline bg-surface-2/40 p-5">
        <div className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Top movers
        </div>
        <ul className="space-y-2">
          {topMovers.map((m) => {
            const up = m.pct >= 0;
            return (
              <li key={m.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{m.name}</span>
                <span className={up ? "font-semibold text-[color:var(--positive)]" : "font-semibold text-[color:var(--alert)]"}>
                  {up ? "+" : ""}{m.pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </EmailShell>
  );
}

export function SubscriptionCanceledEmail({
  endDate = "November 12, 2026",
}: { endDate?: string } = {}) {
  return (
    <EmailShell
      previewText={`Your Pro plan is cancelled — you keep access until ${endDate}.`}
      headline="Your Pro plan is scheduled to end."
      intro={`No charge on the next cycle. You'll keep every Pro feature until ${endDate}, and your data stays exactly where it is after.`}
      cta={{ label: "Resume Pro", href: "/app/settings" }}
      footerNote="Change your mind? Resume anytime — no re-onboarding, no lost history."
    >
      <div className="rounded-xl border border-hairline bg-surface-2/40 p-5 text-sm text-foreground">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pro access until</span>
          <span className="font-semibold">{endDate}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        After that date, we'll pause tracking on items beyond the free tier. Nothing is deleted — everything's still there when you come back.
      </p>
    </EmailShell>
  );
}

export function SubscriptionRenewedEmail({
  amount = 12,
  nextDate = "January 12, 2027",
}: { amount?: number; nextDate?: string } = {}) {
  return (
    <EmailShell
      previewText={`Receipt for your PriceYou Pro subscription (${fmtUSD(amount)}).`}
      headline="Receipt — thank you."

      intro="Your Pro plan renewed. A short receipt for your records."
      cta={{ label: "View invoice history", href: "/app/settings" }}
    >
      <div className="rounded-xl border border-hairline bg-surface-2/40 p-5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-semibold text-foreground">Pro — monthly</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-display text-lg font-semibold text-foreground">{fmtUSD(amount)}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-hairline">
          <span className="text-muted-foreground">Next billing</span>
          <span className="font-medium text-foreground">{nextDate}</span>
        </div>
      </div>
    </EmailShell>
  );
}

export function AccountDeletionScheduledEmail({
  deleteDate = "December 12, 2026",
}: { deleteDate?: string } = {}) {
  return (
    <EmailShell
      previewText={`Your account is scheduled for deletion on ${deleteDate}. Cancel anytime before then.`}
      headline="Your account is scheduled for deletion."
      intro={`We received your request. Your account, portfolio, and brand watchlist will be permanently deleted on ${deleteDate} — 30 days from today.`}
      cta={{ label: "Cancel deletion", href: "/app/settings" }}
      footerNote="If you didn't request this, cancel deletion immediately and change your password."
    >
      <div className="rounded-xl border border-[color:var(--alert)]/40 bg-[color:var(--alert)]/5 p-5 text-sm text-foreground space-y-1.5">
        <div className="font-display font-semibold uppercase tracking-widest text-[10px] text-[color:var(--alert)]">
          What happens next
        </div>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>You keep full access until the deletion date.</li>
          <li>Sign in at any time before then to cancel — one click, no questions.</li>
          <li>After deletion, we cannot restore anything.</li>
        </ul>
      </div>
    </EmailShell>
  );
}

export function AccountDeletionCanceledEmail() {
  return (
    <EmailShell
      previewText="Your account deletion request has been cancelled. Nothing changed."
      headline="Good — we cancelled the deletion."
      intro="Everything is exactly where you left it. No data was removed."
      cta={{ label: "Back to portfolio", href: "/app/portfolio" }}
    >
      <p className="text-sm text-muted-foreground">
        If you didn't cancel this, please secure your account by changing your password and reviewing recent sign-ins.
      </p>
    </EmailShell>
  );
}

// ---------- Auth ----------

export function EmailVerificationEmail({
  displayName = "there",
  verifyUrl = "#",
}: { displayName?: string; verifyUrl?: string } = {}) {
  return (
    <EmailShell
      previewText="Confirm your email to activate your PriceYou account."
      headline="Confirm your email."
      intro={`Hi ${displayName} — one quick step and your account is ready. This link expires in 24 hours.`}
      cta={{ label: "Verify email", href: verifyUrl }}
      footerNote="Didn't create an account? Ignore this email — nothing will happen."
    >
      <p className="text-xs text-muted-foreground break-all">
        Or paste this link into your browser: <span className="text-foreground">{verifyUrl}</span>
      </p>
    </EmailShell>
  );
}

export function MagicLinkEmail({ magicUrl = "#" }: { magicUrl?: string } = {}) {
  return (
    <EmailShell
      previewText="Your PriceYou sign-in link — valid for 15 minutes."
      headline="Your sign-in link."
      intro="Tap the button below to sign in. The link works once and expires in 15 minutes."
      cta={{ label: "Sign in to PriceYou", href: magicUrl }}
      footerNote="Didn't request this? You can safely ignore this email."
    >
      <p className="text-xs text-muted-foreground break-all">
        Or paste this link into your browser: <span className="text-foreground">{magicUrl}</span>
      </p>
    </EmailShell>
  );
}

export function PasswordResetEmail({ resetUrl = "#" }: { resetUrl?: string } = {}) {
  return (
    <EmailShell
      previewText="Reset your PriceYou password — link valid for 1 hour."
      headline="Reset your password."
      intro="We received a request to reset your password. The link below is valid for 1 hour."
      cta={{ label: "Choose a new password", href: resetUrl }}
      footerNote="Didn't ask for this? Ignore this email — your password won't change."
    >
      <p className="text-xs text-muted-foreground break-all">
        Or paste this link into your browser: <span className="text-foreground">{resetUrl}</span>
      </p>
    </EmailShell>
  );
}

export function PasswordChangedEmail({
  when = "just now",
}: { when?: string } = {}) {
  return (
    <EmailShell
      previewText="Your PriceYou password was changed."
      headline="Your password was changed."
      intro={`This is a confirmation that your password was updated ${when}. If this was you, no further action is needed.`}
      cta={{ label: "Review sign-in activity", href: "/app/settings" }}
      footerNote="If this wasn't you, reset your password immediately and contact hello@price.you."
    />
  );
}

export function NewSignInEmail({
  device = "Chrome on macOS",
  location = "Dublin, Ireland",
  when = "Today at 14:32 GMT",
}: { device?: string; location?: string; when?: string } = {}) {
  return (
    <EmailShell
      previewText={`New sign-in to PriceYou from ${device}.`}
      headline="New sign-in to your account."
      intro="We noticed a sign-in from a device we haven't seen before. If that was you, no action needed."
      cta={{ label: "This wasn't me", href: "/app/settings" }}
    >
      <div className="rounded-xl border border-hairline bg-surface-2/40 p-5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Device</span>
          <span className="font-medium text-foreground">{device}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Location</span>
          <span className="font-medium text-foreground">{location}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">When</span>
          <span className="font-medium text-foreground">{when}</span>
        </div>
      </div>
    </EmailShell>
  );
}

// ---------- Product / billing ----------

export function PortfolioPausedEmail({
  itemName = "Omega Speedmaster 3861",
  freeLimit = 3,
}: { itemName?: string; freeLimit?: number } = {}) {
  return (
    <EmailShell
      previewText={`${itemName} is paused — you're at the free-tier limit of ${freeLimit} tracked pieces.`}
      headline="A piece was paused."
      intro={`You're at the free-tier limit of ${freeLimit} tracked pieces, so the oldest item — ${itemName} — is now paused. It's still in your portfolio, just not being tracked.`}
      cta={{ label: "Upgrade to Pro", href: "/app/settings" }}
      footerNote="Upgrade removes the cap. Downgrade later and paused pieces stay exactly as they are."
    >
      <p className="text-sm text-muted-foreground">
        Nothing was deleted. Purchase price and details remain on the card — tracking simply stops until you upgrade or remove another piece.
      </p>
    </EmailShell>
  );
}

export function TrialEndingEmail({
  daysLeft = 3,
  endDate = "November 15, 2026",
  amount = 12,
}: { daysLeft?: number; endDate?: string; amount?: number } = {}) {
  return (
    <EmailShell
      previewText={`Your Pro trial ends in ${daysLeft} days.`}
      headline={`Your trial ends in ${daysLeft} days.`}
      intro={`Your Pro trial ends on ${endDate}. To keep unlimited tracking, add a payment method — otherwise your account quietly returns to Free.`}
      cta={{ label: "Add payment method", href: "/app/settings" }}
      footerNote="No auto-charge without your card on file. Nothing is deleted if you switch to Free."
    >
      <div className="rounded-xl border border-hairline bg-surface-2/40 p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Plan after trial</span>
          <span className="font-semibold text-foreground">Pro · {fmtUSD(amount)}/mo</span>
        </div>
      </div>
    </EmailShell>
  );
}

export function PaymentFailedEmail({
  amount = 12,
  retryDate = "November 14, 2026",
}: { amount?: number; retryDate?: string } = {}) {
  return (
    <EmailShell
      previewText={`We couldn't charge your card for ${fmtUSD(amount)}.`}
      headline="Payment didn't go through."
      intro={`Your bank declined the ${fmtUSD(amount)} charge for your Pro plan. We'll try again on ${retryDate}. Your Pro access stays active until then.`}
      cta={{ label: "Update payment method", href: "/app/settings" }}
      footerNote="If the second attempt also fails, your account moves to Free — nothing is deleted."
    >
      <div className="rounded-xl border border-[color:var(--alert)]/40 bg-[color:var(--alert)]/5 p-5 text-sm text-foreground space-y-1.5">
        <div className="font-display font-semibold uppercase tracking-widest text-[10px] text-[color:var(--alert)]">
          What you can do
        </div>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Check the card on file has funds and isn't expired.</li>
          <li>Add a new card — we'll retry immediately after.</li>
          <li>Reply to this email if you need a hand.</li>
        </ul>
      </div>
    </EmailShell>
  );
}
