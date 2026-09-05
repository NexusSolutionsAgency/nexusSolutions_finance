import type { Transaction, TransactionFilters } from '../types';
import type { MilestoneView } from './finance';

export interface DashboardFilters extends TransactionFilters {
  collection_status: string;
}

export const emptyDashboardFilters: DashboardFilters = {
  type: '',
  status: '',
  project_id: '',
  category_id: '',
  person_id: '',
  client_id: '',
  account_id: '',
  date_from: '',
  date_to: '',
  search: '',
  collection_status: '',
};

export function hasActiveFilters(f: object) {
  return Object.values(f).some((v) => v !== '');
}

/** Filtrado en memoria (mismos criterios que el servidor) */
export function applyTransactionFilters(list: Transaction[], f: Partial<DashboardFilters>): Transaction[] {
  const search = f.search?.trim().toLowerCase();
  return list.filter((t) => {
    if (f.type && t.type !== f.type) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.project_id && t.project_id !== f.project_id) return false;
    if (f.category_id && t.category_id !== f.category_id) return false;
    if (f.client_id && t.client_id !== f.client_id) return false;
    if (f.account_id && t.account_id !== f.account_id && t.to_account_id !== f.account_id) return false;
    if (f.person_id && t.person_id !== f.person_id && t.paid_by_person_id !== f.person_id) return false;
    if (f.date_from && t.date < f.date_from) return false;
    if (f.date_to && t.date > f.date_to) return false;
    if (search) {
      const hay = `${t.description} ${t.notes ?? ''} ${t.invoice_number ?? ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function applyMilestoneFilters(list: MilestoneView[], f: Partial<DashboardFilters>): MilestoneView[] {
  return list.filter((v) => {
    const m = v.milestone;
    if (f.project_id && m.project_id !== f.project_id) return false;
    if (f.person_id && m.responsible_person_id !== f.person_id) return false;
    if (f.client_id && m.project?.client_id !== f.client_id) return false;
    if (f.collection_status && v.status !== f.collection_status) return false;
    const ref = m.due_date ?? m.scheduled_date ?? m.created_at.slice(0, 10);
    if (f.date_from && ref < f.date_from) return false;
    if (f.date_to && ref > f.date_to) return false;
    return true;
  });
}
