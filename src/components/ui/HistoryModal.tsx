import { useAuditLog } from '../../hooks/useAudit';
import { formatDateTime } from '../../lib/formatters';
import { diffEntries } from '../../lib/audit';
import Modal from './Modal';
import Spinner from './Spinner';
import Badge from './Badge';
import { SEM } from '../../lib/constants';
import type { AuditEntry } from '../../types';

const actionLabel: Record<AuditEntry['action'], { label: string; color: string }> = {
  INSERT: { label: 'Creado', color: SEM.green },
  UPDATE: { label: 'Editado', color: SEM.blue },
  DELETE: { label: 'Eliminado', color: SEM.red },
};

export default function HistoryModal({
  open,
  onClose,
  table,
  recordId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  table: string;
  recordId: string | null;
  title?: string;
}) {
  const { data, isLoading } = useAuditLog({ table, recordId: recordId ?? undefined, enabled: open && !!recordId });

  return (
    <Modal open={open} title="Historial de cambios" subtitle={title} onClose={onClose} size="md">
      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-nx-muted text-sm text-center py-8">Sin historial registrado.</p>
        ) : (
          <ol className="space-y-3">
            {data.map((e) => {
              const a = actionLabel[e.action];
              const diffs = diffEntries(e);
              return (
                <li key={e.id} className="bg-nx-surface/60 border border-nx-border rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge label={a.label} color={a.color} />
                    <span className="text-nx-heading">{e.changed_by_email ?? 'Sistema'}</span>
                    <span className="text-nx-muted ml-auto">{formatDateTime(e.changed_at)}</span>
                  </div>
                  {diffs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {diffs.map((d) => (
                        <li key={d.field} className="text-xs text-nx-muted">
                          <span className="text-nx-text font-medium">{d.field}</span>: <span className="line-through opacity-70">{d.from}</span>{' '}
                          <span className="text-nx-blue-light">→ {d.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Modal>
  );
}
