import { useState } from 'react';
import { Pencil, Trash2, ChevronLeft, ChevronRight, Paperclip, History, ArrowUpDown, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Transaction } from '../../types';
import { formatDate, formatMoney } from '../../lib/formatters';
import {
  transactionStatusColors,
  transactionStatusLabels,
  transactionTypeColors,
  transactionTypeShort,
} from '../../lib/constants';
import Badge from '../ui/Badge';
import { amountSign, counterpartyLabel } from '../../lib/transactions';
import { openAttachment } from '../../hooks/useAttachments';
import { errorMessage, tableCell, tableHead } from '../../lib/ui';

interface Props {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onHistory?: (t: Transaction) => void;
  canEdit: (t: Transaction) => boolean;
  pageSize?: number;
  compact?: boolean;
}

export default function TransactionTable({ transactions, onEdit, onDelete, onHistory, canEdit, pageSize = 20, compact }: Props) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<'date' | 'base_amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...transactions].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'date') return mul * (a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
    return mul * (a.base_amount - b.base_amount);
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (f: 'date' | 'base_amount') => {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(f);
      setSortDir('desc');
    }
    setPage(0);
  };

  const total = transactions.reduce((s, t) => {
    const { sign } = amountSign(t);
    if (sign === '+') return s + t.base_amount;
    if (sign === '−' && t.status !== 'budgeted' && t.status !== 'cancelled') return s - t.base_amount;
    return s;
  }, 0);

  return (
    <div className="bg-nx-card rounded-xl border border-nx-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nx-border">
              <th className={`${tableHead} cursor-pointer hover:text-nx-heading`} onClick={() => toggleSort('date')}>
                <span className="inline-flex items-center gap-1">
                  Fecha <ArrowUpDown size={11} className={sortField === 'date' ? 'text-nx-blue-light' : ''} />
                </span>
              </th>
              <th className={tableHead}>Tipo</th>
              <th className={tableHead}>Descripción</th>
              {!compact && <th className={tableHead}>Proyecto</th>}
              <th className={tableHead}>Tercero</th>
              {!compact && <th className={tableHead}>Categoría</th>}
              <th className={tableHead}>Estado</th>
              {!compact && <th className={tableHead}>Cuenta</th>}
              <th className={`${tableHead} text-right cursor-pointer hover:text-nx-heading`} onClick={() => toggleSort('base_amount')}>
                <span className="inline-flex items-center gap-1 justify-end">
                  Valor <ArrowUpDown size={11} className={sortField === 'base_amount' ? 'text-nx-blue-light' : ''} />
                </span>
              </th>
              <th className={`${tableHead} text-right`}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const { sign, color } = amountSign(t);
              const editable = canEdit(t);
              return (
                <tr key={t.id} className="border-b border-nx-border/50 hover:bg-nx-card-hover/60 transition-colors">
                  <td className={`${tableCell} text-nx-text whitespace-nowrap`}>{formatDate(t.date)}</td>
                  <td className={tableCell}>
                    <Badge label={transactionTypeShort[t.type]} color={transactionTypeColors[t.type]} />
                  </td>
                  <td className={`${tableCell} text-nx-text max-w-[260px]`}>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" title={t.description}>
                        {t.description}
                      </span>
                      {t.split_group_id && <Users size={12} className="text-nx-muted shrink-0" aria-label="Gasto compartido" />}
                      {t.attachment_path && (
                        <button
                          onClick={() => openAttachment(t.attachment_path!).catch((e) => toast.error(errorMessage(e)))}
                          className="text-nx-blue-light hover:text-nx-heading shrink-0"
                          title="Ver comprobante"
                        >
                          <Paperclip size={12} />
                        </button>
                      )}
                    </div>
                    {(t.notes || t.invoice_number) && (
                      <span className="text-nx-muted text-[11px] block truncate" title={t.notes ?? ''}>
                        {[t.invoice_number ? `Fact. ${t.invoice_number}` : null, t.notes].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </td>
                  {!compact && <td className={`${tableCell} text-nx-muted whitespace-nowrap max-w-[160px] truncate`}>{t.project?.name ?? '—'}</td>}
                  <td className={`${tableCell} text-nx-muted whitespace-nowrap max-w-[180px] truncate`} title={counterpartyLabel(t)}>
                    {counterpartyLabel(t)}
                  </td>
                  {!compact && <td className={`${tableCell} text-nx-muted whitespace-nowrap`}>{t.category?.name ?? '—'}</td>}
                  <td className={tableCell}>
                    <Badge label={transactionStatusLabels[t.status]} color={transactionStatusColors[t.status]} dot />
                  </td>
                  {!compact && (
                    <td className={`${tableCell} text-nx-muted whitespace-nowrap`}>
                      {t.type === 'transfer' ? '—' : t.account?.name ?? (t.paid_by ? 'Bolsillo persona' : '—')}
                    </td>
                  )}
                  <td className={`${tableCell} text-right whitespace-nowrap`}>
                    <span className="font-semibold" style={{ color }}>
                      {sign}
                      {formatMoney(t.base_amount)}
                    </span>
                    {t.currency !== undefined && t.exchange_rate !== 1 && (
                      <span className="text-nx-muted text-[11px] block">{formatMoney(t.net_amount, t.currency)}</span>
                    )}
                    {t.tax_amount !== 0 && (
                      <span className="text-nx-muted text-[11px] block">
                        bruto {formatMoney(t.base_gross_amount)}
                      </span>
                    )}
                  </td>
                  <td className={`${tableCell} text-right`}>
                    <div className="flex gap-0.5 justify-end">
                      {onHistory && (
                        <button onClick={() => onHistory(t)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-heading hover:bg-nx-surface" title="Historial">
                          <History size={14} />
                        </button>
                      )}
                      {editable && (
                        <>
                          <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-blue-light hover:bg-nx-surface" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => onDelete(t)} className="p-1.5 rounded-lg text-nx-muted hover:text-nx-red hover:bg-nx-surface" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-nx-muted">
                  No hay movimientos que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-nx-border flex-wrap gap-2">
        <span className="text-nx-muted text-xs">
          {sorted.length === 0 ? 'Sin registros' : `Mostrando ${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, sorted.length)} de ${sorted.length}`}
          <span className="ml-3 text-nx-text">
            Neto: <span className={total >= 0 ? 'text-nx-green font-semibold' : 'text-nx-red font-semibold'}>{formatMoney(total, undefined, { sign: true })}</span>
          </span>
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-lg text-nx-muted hover:text-nx-heading hover:bg-nx-surface disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-nx-muted text-xs">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded-lg text-nx-muted hover:text-nx-heading hover:bg-nx-surface disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
