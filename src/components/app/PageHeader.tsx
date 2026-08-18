type Props = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] text-foreground">
        {title}
      </h1>
      {subtitle ? <p className="mt-3 text-base text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
