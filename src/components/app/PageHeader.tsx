type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function PageHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2] text-foreground">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
