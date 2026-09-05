import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { round2 } from '../lib/formatters';
import type { Transaction, TransactionFilters, TransactionFormData } from '../types';

export const TRANSACTION_SELECT = `
  *,
  project:projects(id, name, is_general, status, currency, exchange_rate, contract_value, budget, target_margin, lead_person_id, client_id, billing_model, start_date, end_date, notes, created_at, updated_at),
  category:categories(*),
  client:clients(*),
  person:people!transactions_person_id_fkey(*),
  paid_by:people!transactions_paid_by_person_id_fkey(*),
  account:accounts!transactions_account_id_fkey(*),
  to_account:accounts!transactions_to_account_id_fkey(*),
  payment_method:payment_methods(*),
  milestone:milestones(id, concept, kind, base_amount, status, due_date, invoice_number)
`;

/** Lista de movimientos. Sin filtros devuelve todo (para KPIs y caja). */
export function useTransactions(filters?: TransactionFilters) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', filters ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('transactions').select(TRANSACTION_SELECT).order('date', { ascending: false }).order('created_at', { ascending: false });
      if (filters?.type) q = q.eq('type', filters.type);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.project_id) q = q.eq('project_id', filters.project_id);
      if (filters?.category_id) q = q.eq('category_id', filters.category_id);
      if (filters?.client_id) q = q.eq('client_id', filters.client_id);
      if (filters?.account_id) q = q.or(`account_id.eq.${filters.account_id},to_account_id.eq.${filters.account_id}`);
      if (filters?.person_id) q = q.or(`person_id.eq.${filters.person_id},paid_by_person_id.eq.${filters.person_id}`);
      if (filters?.date_from) q = q.gte('date', filters.date_from);
      if (filters?.date_to) q = q.lte('date', filters.date_to);
      if (filters?.search) {
        const s = filters.search.replace(/[%,()]/g, ' ').trim();
        if (s) q = q.or(`description.ilike.%${s}%,notes.ilike.%${s}%,invoice_number.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

/** Convierte el formulario en una fila lista para insertar/actualizar */
export function buildTransactionPayload(f: TransactionFormData, projectId: string, amountOverride?: number, taxOverride?: number) {
  const amount = round2(amountOverride ?? f.amount);
  const tax = round2(taxOverride ?? f.tax_amount);
  const net = round2(amount + tax);
  const rate = f.exchange_rate || 1;
  const t = f.type;
  const isExpense = t === 'expense';
  const personPaid = isExpense && f.payer_kind === 'person';

  return {
    date: f.date,
    type: t,
    status: f.status,
    description: f.description.trim(),
    notes: f.notes.trim() || null,
    project_id: projectId,
    category_id: t === 'income' || isExpense ? f.category_id || null : null,
    client_id: t === 'income' ? f.client_id || null : null,
    person_id: t === 'transfer' || t === 'adjustment' ? null : f.person_id || null,
    paid_by_person_id: personPaid ? f.paid_by_person_id || null : null,
    account_id: personPaid ? null : f.account_id || null,
    to_account_id: t === 'transfer' ? f.to_account_id || null : null,
    payment_method_id: f.payment_method_id || null,
    milestone_id: t === 'income' ? f.milestone_id || null : null,
    currency: f.currency,
    amount,
    tax_amount: tax,
    net_amount: net,
    exchange_rate: rate,
    base_amount: round2(net * rate),
    base_gross_amount: round2(amount * rate),
    direction: t === 'adjustment' ? f.direction : null,
    invoice_number: f.invoice_number.trim() || null,
    attachment_path: f.attachment_path || null,
  };
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function markReimbursed(personId: string) {
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'reimbursed' })
    .eq('type', 'expense')
    .eq('paid_by_person_id', personId)
    .eq('status', 'reimbursable');
  if (error) throw error;
}

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['milestones'] });
  qc.invalidateQueries({ queryKey: ['audit'] });
};

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: TransactionFormData) => {
      const createdBy = await currentUserId();
      const projectIds = form.project_ids.filter(Boolean);

      // Gasto compartido entre varios proyectos: una fila por proyecto
      if (form.type === 'expense' && projectIds.length > 1) {
        const groupId = crypto.randomUUID();
        let accAmount = 0;
        let accTax = 0;
        const rows = projectIds.map((pid, i) => {
          const isLast = i === projectIds.length - 1;
          const pct = (form.project_percentages[pid] ?? 0) / 100;
          const amount = isLast ? round2(form.amount - accAmount) : round2(form.amount * pct);
          const tax = isLast ? round2(form.tax_amount - accTax) : round2(form.tax_amount * pct);
          accAmount += amount;
          accTax += tax;
          return {
            ...buildTransactionPayload(form, pid, amount, tax),
            split_group_id: groupId,
            created_by: createdBy,
          };
        });
        const { data, error } = await supabase.from('transactions').insert(rows).select();
        if (error) throw error;
        return data as Transaction[];
      }

      const payload = { ...buildTransactionPayload(form, form.project_id), created_by: createdBy };
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;

      if (form.type === 'reimbursement' && form.mark_reimbursed && form.person_id) {
        await markReimbursed(form.person_id);
      }
      return [data as Transaction];
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: form }: { id: string; data: TransactionFormData }) => {
      const payload = buildTransactionPayload(form, form.project_id);
      const { data, error } = await supabase.from('transactions').update(payload).eq('id', id).select().single();
      if (error) throw error;
      if (form.type === 'reimbursement' && form.mark_reimbursed && form.person_id) {
        await markReimbursed(form.person_id);
      }
      return data as Transaction;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetTransactionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Transaction['status'] }) => {
      const { error } = await supabase.from('transactions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
