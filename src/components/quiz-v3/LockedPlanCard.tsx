// The plan the visitor already bought, shown as the card they clicked.
// Reuses the landing `price-frame` utilities so it reads as the same object.
// Deliberately has NO change control of any kind.
import { PAYWALL_CARDS } from "@/lib/subscription";

export type LockedPlanId = "monthly" | "quarterly" | "annual";

const FRAME_BY_ID: Record<LockedPlanId, string> = {
  monthly: "price-frame-neutral",
  quarterly: "price-frame-accent",
  annual: "price-frame-annual",
};

/** Maps the access-model period + trial flag onto a paywall card. */
export function lockedPlanId(
  period: "monthly" | "quarterly" | "annual" | null,
  trialing: boolean,
): LockedPlanId {
  if (trialing) return "monthly";
  if (period === "quarterly") return "quarterly";
  if (period === "annual") return "annual";
  return "monthly";
}

export function LockedPlanCard({ planId }: { planId: LockedPlanId }) {
  const card = PAYWALL_CARDS.find((c) => c.id === planId);
  if (!card) return null;

  return (
    <div>
      <div className={`price-frame ${FRAME_BY_ID[planId]}`}>
        <div className="card-soft p-6">
          <h3 className="price-plan-name font-display text-[18px] leading-[28px] tracking-[-0.8253px]">
            {card.name}
          </h3>
          <div className="pt-[12px] flex items-end gap-2">
            <span className="font-display font-bold text-[30px] leading-[30px] tracking-[-0.4599px]">
              {card.price}
            </span>
            <span className="font-display text-[13px] leading-[21.45px] tracking-[-0.0762px] text-muted-foreground">
              {card.unit}
            </span>
          </div>
          {card.renewal ? (
            <p className="pt-[6px] font-display font-semibold text-[13px] leading-[21px] text-positive">
              {card.renewal}
            </p>
          ) : null}
          <p className="mt-3 text-[11px] text-muted-foreground">
            You can switch or cancel in settings.
          </p>
        </div>
      </div>
    </div>

  );
}
