import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  className,
  stats,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  stats?: { total?: number; statsLoading?: boolean };
}) {
  const countBadge = stats?.statsLoading ? null : (
    <span className="inline-flex items-center rounded-md bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {stats?.total ?? 0} mentors
    </span>
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-display tracking-tight">{title}</h1>
        {countBadge}
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
