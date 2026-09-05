import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import type { Alert } from '../../lib/finance';

const styles = {
  red: { icon: AlertTriangle, color: '#ef4444' },
  yellow: { icon: BellRing, color: '#eab308' },
  blue: { icon: Info, color: '#3b82f6' },
};

export default function AlertsPanel({ alerts, limit = 6 }: { alerts: Alert[]; limit?: number }) {
  const shown = alerts.slice(0, limit);
  return (
    <div className="bg-nx-card rounded-xl border border-nx-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-nx-heading font-semibold font-heading">Alertas</h3>
        {alerts.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-nx-red/15 text-nx-red font-medium">{alerts.length}</span>
        )}
      </div>
      {shown.length === 0 ? (
        <div className="flex items-center gap-3 text-nx-muted text-sm py-4">
          <CheckCircle2 className="text-nx-green" size={18} />
          Sin alertas. Todo bajo control.
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((a) => {
            const s = styles[a.level];
            const Icon = s.icon;
            const body = (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-nx-surface/60 border border-nx-border hover:border-nx-border-light transition-colors">
                <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: s.color + '1a' }}>
                  <Icon size={14} style={{ color: s.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-nx-heading text-sm font-medium leading-snug">{a.title}</p>
                  <p className="text-nx-muted text-xs mt-0.5 leading-snug">{a.detail}</p>
                </div>
                {a.link && <ChevronRight size={14} className="text-nx-muted shrink-0 mt-1" />}
              </div>
            );
            return <li key={a.id}>{a.link ? <Link to={a.link}>{body}</Link> : body}</li>;
          })}
          {alerts.length > limit && <li className="text-nx-muted text-xs text-center pt-1">y {alerts.length - limit} más…</li>}
        </ul>
      )}
    </div>
  );
}
