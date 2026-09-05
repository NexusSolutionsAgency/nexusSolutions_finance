import type { AuditEntry } from '../types';

const HIDDEN = new Set(['id', 'created_at', 'updated_at', 'created_by', 'split_group_id', 'base_amount', 'base_gross_amount', 'net_amount']);

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('es-CO');
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + '…' : s;
}

/** Campos que cambiaron en una edición, listos para mostrar */
export function diffEntries(e: AuditEntry): { field: string; from: string; to: string }[] {
  if (e.action !== 'UPDATE' || !e.old_data || !e.new_data) return [];
  const keys = new Set([...Object.keys(e.old_data), ...Object.keys(e.new_data)]);
  const out: { field: string; from: string; to: string }[] = [];
  keys.forEach((k) => {
    if (HIDDEN.has(k)) return;
    const a = e.old_data![k];
    const b = e.new_data![k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: k, from: fmt(a), to: fmt(b) });
  });
  return out;
}
