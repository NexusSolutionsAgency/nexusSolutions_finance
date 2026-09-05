import type { LucideIcon } from 'lucide-react';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export default function Tabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem<K>[];
  active: K;
  onChange: (k: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
            active === key
              ? 'bg-nx-blue/15 text-nx-blue-light border-nx-blue/30'
              : 'bg-nx-card text-nx-muted border-nx-border hover:text-nx-heading hover:bg-nx-card-hover'
          }`}
        >
          {Icon && <Icon size={15} />}
          {label}
          {count !== undefined && (
            <span className={`text-[11px] ${active === key ? 'text-nx-blue-light/70' : 'text-nx-muted/70'}`}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
