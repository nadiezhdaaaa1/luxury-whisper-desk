type Props = {
  total: number;
  pricedCount: number;
  totalCount: number;
};

function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function TotalValueHeader({ total, pricedCount, totalCount }: Props) {
  const hasAnyPriced = pricedCount > 0;
  const partial = pricedCount > 0 && pricedCount < totalCount;

  return (
    <section className="rounded-3xl border border-hairline bg-champagne-soft/40 p-6 sm:p-10 mb-8">
      <p className="eyebrow text-muted-foreground">Total purchase value</p>
      {hasAnyPriced ? (
        <div className="mt-3 font-display font-bold tracking-tight text-primary text-4xl sm:text-6xl leading-none">
          {formatUSD(total)}
        </div>
      ) : (
        <div className="mt-3 font-display font-semibold tracking-tight text-foreground text-2xl sm:text-3xl leading-tight max-w-2xl">
          Add items with their purchase price to see your total
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground max-w-xl">
        Live market valuation coming soon — we'll show what your collection is worth now.
      </p>

      {partial ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Based on {pricedCount} of {totalCount} items with a purchase price.
        </p>
      ) : null}
    </section>
  );
}
