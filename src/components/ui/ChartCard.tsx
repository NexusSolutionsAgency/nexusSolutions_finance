export default function ChartCard({
  title,
  subtitle,
  children,
  empty,
  height = 'h-72',
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
  height?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-nx-card rounded-xl border border-nx-border p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-nx-heading font-semibold font-heading">{title}</h3>
          {subtitle && <p className="text-nx-muted text-xs mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {empty ? (
        <p className="text-nx-muted text-sm text-center py-12">Sin datos para mostrar</p>
      ) : (
        <div className={height}>{children}</div>
      )}
    </div>
  );
}
