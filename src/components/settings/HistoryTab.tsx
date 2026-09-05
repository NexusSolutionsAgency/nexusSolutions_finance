import { useState } from 'react';
import { useAuditLog } from '../../hooks/useAudit';
import { formatDateTime } from '../../lib/formatters';
import { SEM } from '../../lib/constants';
import { selectClass } from '../../lib/ui';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { diffEntries } from '../../lib/audit';
import type { AuditEntry } from '../../types';

const tableLabels: Record<string, string> = {
  transactions: 'Movimiento',
  milestones: 'Hito de cobro',
  projects: 'Proyecto',
  people: 'Persona',
  clients: 'Cliente',
  categories: 'Categoría',
  accounts: 'Cuenta',
  currencies: 'Moneda',
  payment_methods: 'Método de pago',
  app_settings: 'Configuración',
  profiles: 'Miembro',
};

const actionMeta: Record<AuditEntry['action'], { label: string; color: string }> = {
  INSERT: { label: 'Creó', color: SEM.green },
  UPDATE: { label: 'Editó', color: SEM.blue },
  DELETE: { label: 'Eliminó', color: SEM.red },
};

function summarize(e: AuditEntry): string {
  const d = (e.new_data ?? e.old_data ?? {}) as Record<string, unknown>;
  const s = d.description ?? d.concept ?? d.name ?? d.full_name ?? d.company_name ?? d.code ?? d.email ?? '';
  return String(s);
}

export default function HistoryTab() {
  const [table, setTable] = useState('');
  const { data, isLoading } = useAuditLog({ table: table || undefined, limit: 300 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-nx-muted text-sm max-w-2xl">Cada creación, edición y eliminación queda registrada con usuario y fecha. Se muestran los últimos 300 cambios.</p>
        <select value={table} onChange={(e) => setTable(e.target.value)} className={`${selectClass} w-auto`}>
          <option value="">Todo</option>
          {Object.entries(tableLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="bg-nx-card rounded-xl border border-nx-border divide-y divide-nx-border/60">
          {data?.map((e) => {
            const a = actionMeta[e.action];
            const diffs = diffEntries(e).slice(0, 6);
            return (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-nx-muted whitespace-nowrap">{formatDateTime(e.changed_at)}</span>
                  <span className="text-nx-heading font-medium">{e.changed_by_email ?? 'Sistema'}</span>
                  <Badge label={a.label} color={a.color} />
                  <span className="text-nx-muted">{tableLabels[e.table_name] ?? e.table_name}</span>
                  <span className="text-nx-text truncate max-w-[320px]">{summarize(e)}</span>
                </div>
                {diffs.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {diffs.map((d) => (
                      <li key={d.field} className="text-[11px] text-nx-muted">
                        <span className="text-nx-text">{d.field}</span>: <span className="line-through opacity-60">{d.from}</span> <span className="text-nx-blue-light">→ {d.to}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {(data ?? []).length === 0 && <p className="text-nx-muted text-sm text-center py-10">Sin cambios registrados.</p>}
        </div>
      )}
    </div>
  );
}
