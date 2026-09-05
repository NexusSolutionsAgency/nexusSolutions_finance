import type { LucideIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && (
        <div className="p-3 rounded-xl bg-nx-blue/10 mb-3">
          <Icon className="text-nx-blue-light" size={22} />
        </div>
      )}
      <p className="text-nx-heading font-medium">{title}</p>
      {description && <p className="text-nx-muted text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
