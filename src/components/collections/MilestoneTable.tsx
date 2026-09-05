import { Pencil, Trash2, BadgeDollarSign, FileCheck2, Paperclip, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MilestoneView } from '../../lib/finance';
import { formatDate, formatMoney } from '../../lib/formatters';
import { milestoneKindLabels, milestoneStatusColors, milestoneStatusLabels, SEM } from '../../lib/constants';
import Badge from '../ui/Badge';
import { openAttachment } from '../../hooks/useAttachments';
import { errorMessage, tableCell, tableHead } from '../../lib/ui';

interface Props {
  views: MilestoneView[];
  showProject?: boolean;
  canEdit: (v: MilestoneView) => boolean;
  onEdit: (v: MilestoneView) => void;
  onDelete: (v: MilestoneView) => void;
  onRegisterPayment: (v: MilestoneView) => void;
  onMarkInvoiced: (v: MilestoneView) => void;
  onCancel?: (v: MilestoneView) => void;
}

export default function MilestoneTable({ views, showProject, canEdit, onEdit, onDelete, onRegisterPayment, onMarkInvoiced, onCancel }: Props) {
  return (
    <div className="bg-nx-card rounded-xl border border-nx-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nx-border">
              {showProject && <th className={tableHead}>Proyecto</th>}
              <th className={tableHead}>Concepto</th>
              <th className={tableHead}>Vencimiento</th>
              <th className={`${tableHead} text-right`}>Valor</th>
              <th className={`${tableHead} text-right`}>Cobrado</th>
              <th className={`${tableHead} text-right`}>Pendiente</th>
              <th className={tableHead}>Estado</th>
              <th className={tableHead}>Responsable</th>
              <th className={tableHead}>Próxima acción</th>
              <th className={`${tableHead} text-right`}></th>
            </tr>
          </thead>
          <tbody>
            {views.map((v) => {
              const m = v.milestone;
              const editable = canEdit(v);
              const open = v.status !== 'paid' && v.status !== 'cancelled';
              return (
                <tr key={m.id} className="border-b border-nx-border/50 hover:bg-nx-card-hover/60 transition-colors">
                  {showProject && <td className={`${tableCell} text-nx-muted whitespace-nowrap max-w-[150px] truncate`}>{m.project?.name ?? '—'}</td>}
                  <td className={`${tableCell} text-nx-text max-w-[240px]`}>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" title={m.concept}>
                        {m.concept}
                      </span>
                      {m.attachment_path && (
                        <button onClick={() => openAttachment(m.attachment_path!).catch((e) => toast.error(errorMessage(e)))} className="text-nx-blue-light shrink-0" title="Ver factura">
                          <Paperclip size={12} />
                        </button>
                      )}
                    </div>
                    <span className="text-nx-muted text-[11px] block">
                      {milestoneKindLabels[m.kind]}
                      {m.percentage ? ` · ${m.percentage} %` : ''}
                      {m.invoice_number ? ` · Fact. ${m.invoice_number}` : ''}
                    </span>
                  </td>
                  <td className={`${tableCell} whitespace-nowrap`}>
                    <span className={v.status === 'overdue' ? 'text-nx-red font-medium' : 'text-nx-text'}>{formatDate(m.due_date ?? m.scheduled_date)}</span>
                    {v.daysOverdue > 0 && <span className="text-nx-red text-[11px] block">{v.daysOverdue} día{v.daysOverdue === 1 ? '' : 's'} de atraso</span>}
                    {m.scheduled_date && m.due_date && m.scheduled_date !== m.due_date && (
                      <span className="text-nx-muted text-[11px] block">Prog. {formatDate(m.scheduled_date)}</span>
                    )}
                  </td>
                  <td className={`${tableCell} text-right text-nx-heading font-medium whitespace-nowrap`}>
                    {formatMoney(m.base_amount)}
                    {m.currency && m.exchange_rate !== 1 && <span className="text-nx-muted text-[11px] block">{formatMoney(m.amount, m.currency)}</span>}
                  </td>
                  <td className={`${tableCell} text-right whitespace-nowrap`} style={{ color: SEM.green }}>
                    {formatMoney(v.collected)}
                  </td>
                  <td className={`${tableCell} text-right whitespace-nowrap font-medium`} style={{ color: v.remaining > 0 ? (v.status === 'overdue' ? SEM.red : SEM.yellow) : SEM.muted }}>
                    {formatMoney(v.remaining)}
                  </td>
                  <td className={tableCell}>
                    <Badge label={milestoneStatusLabels[v.status]} color={milestoneStatusColors[v.status]} dot />
                    {m.probability < 100 && open && <span className="text-nx-muted text-[10px] block mt-0.5">Prob. {m.probability} %</span>}
                  </td>
                  <td className={`${tableCell} text-nx-muted whitespace-nowrap`}>{m.responsible?.name ?? '—'}</td>
                  <td className={`${tableCell} text-nx-muted max-w-[200px]`}>
                    <span className="truncate block" title={m.next_action ?? ''}>
                      {m.next_action ?? '—'}
                    </span>
                    {m.last_contact_date && <span className="text-[11px] block">Último contacto {formatDate(m.last_contact_date)}</span>}
                  </td>
                  <td className={`${tableCell} text-right`}>
                    {editable && (
                      <div className="flex gap-0.5 justify-end">
                        {open && m.status === 'scheduled' && (
                          <button onClick={() => onMarkInvoiced(v)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-blue-light hover:bg-nx-surface" title="Marcar como facturado">
                            <FileCheck2 size={14} />
                          </button>
                        )}
                        {open && (
                          <button onClick={() => onRegisterPayment(v)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-green hover:bg-nx-surface" title="Registrar cobro">
                            <BadgeDollarSign size={14} />
                          </button>
                        )}
                        <button onClick={() => onEdit(v)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-blue-light hover:bg-nx-surface" title="Editar">
                          <Pencil size={14} />
                        </button>
                        {open && onCancel && (
                          <button onClick={() => onCancel(v)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-yellow hover:bg-nx-surface" title="Cancelar hito">
                            <Ban size={14} />
                          </button>
                        )}
                        <button onClick={() => onDelete(v)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-red hover:bg-nx-surface" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {views.length === 0 && (
              <tr>
                <td colSpan={showProject ? 10 : 9} className="px-4 py-12 text-center text-nx-muted">
                  No hay hitos de cobro que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
