import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  hint?: string;
  small?: boolean;
  onClick?: () => void;
}

export default function KpiCard({ label, value, icon: Icon, color, hint, small, onClick }: KpiCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-nx-card rounded-xl border border-nx-border text-left w-full ${small ? 'p-4' : 'p-5'} ${
        onClick ? 'hover:border-nx-blue/40 hover:bg-nx-card-hover transition-colors' : ''
      }`}
      style={{ borderColor: color + '33' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-nx-muted text-xs font-medium uppercase tracking-wide">{label}</span>
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: color + '1a' }}>
          <Icon size={small ? 14 : 16} style={{ color }} />
        </div>
      </div>
      <p className={`font-bold font-heading ${small ? 'text-lg' : 'text-2xl'} truncate`} style={{ color }} title={value}>
        {value}
      </p>
      {hint && <p className="text-nx-muted text-[11px] mt-1">{hint}</p>}
    </Wrapper>
  );
}
