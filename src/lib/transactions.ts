// Helpers puros sobre movimientos (presentación y exportación)
import type { Transaction } from '../types';
import { SEM, transactionStatusLabels, transactionTypeColors, transactionTypeLabels } from './constants';

/** Signo y color con el que se muestra el valor de un movimiento */
export function amountSign(t: Transaction): { sign: string; color: string } {
  if (t.type === 'transfer') return { sign: '', color: SEM.muted };
  if (t.type === 'income' || t.type === 'contribution' || (t.type === 'adjustment' && t.direction === 'in')) {
    return { sign: '+', color: SEM.green };
  }
  if (t.type === 'expense' && (t.status === 'budgeted' || t.status === 'cancelled')) return { sign: '−', color: SEM.muted };
  return { sign: '−', color: t.type === 'expense' ? SEM.red : transactionTypeColors[t.type] };
}

/** Tercero a mostrar según el tipo de movimiento */
export function counterpartyLabel(t: Transaction): string {
  if (t.type === 'income') return t.client?.name ?? t.person?.name ?? '—';
  if (t.type === 'expense') {
    const parts = [t.person?.name];
    if (t.paid_by) parts.push(`pagó ${t.paid_by.name}`);
    return parts.filter(Boolean).join(' · ') || '—';
  }
  if (t.type === 'transfer') return `${t.account?.name ?? '?'} → ${t.to_account?.name ?? '?'}`;
  return t.person?.name ?? '—';
}

/** Filas planas para Excel */
export function transactionsToRows(list: Transaction[]) {
  return list.map((t) => ({
    Fecha: t.date,
    Tipo: transactionTypeLabels[t.type],
    Estado: transactionStatusLabels[t.status],
    Descripción: t.description,
    Proyecto: t.project?.name ?? '',
    Categoría: t.category?.name ?? '',
    Cliente: t.client?.name ?? '',
    Tercero: counterpartyLabel(t),
    'Pagado por': t.paid_by?.name ?? (t.account ? 'Nexus' : ''),
    Cuenta: t.account?.name ?? '',
    'Cuenta destino': t.to_account?.name ?? '',
    'Medio de pago': t.payment_method?.name ?? '',
    Factura: t.invoice_number ?? '',
    Moneda: t.currency,
    'Valor bruto': t.amount,
    'Impuestos/retenciones': t.tax_amount,
    'Valor neto': t.net_amount,
    Tasa: t.exchange_rate,
    'Neto (base)': t.base_amount,
    'Bruto (base)': t.base_gross_amount,
    Notas: t.notes ?? '',
  }));
}
