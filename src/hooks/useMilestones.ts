import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { round2 } from '../lib/formatters';
import type { Milestone, MilestoneFormData } from '../types';

const MILESTONE_SELECT = '*, project:projects(id, name, is_general, status, client_id, currency, exchange_rate, contract_value, budget, target_margin, lead_person_id, billing_model, start_date, end_date, notes, created_at, updated_at, client:clients(*)), responsible:people(*)';

export function useMilestones(projectId?: string) {
  return useQuery<Milestone[]>({
    queryKey: ['milestones', projectId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('milestones')
        .select(MILESTONE_SELECT)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('sort_order');
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Milestone[];
    },
  });
}

function toPayload(f: MilestoneFormData) {
  const rate = f.exchange_rate || 1;
  return {
    project_id: f.project_id,
    concept: f.concept.trim(),
    kind: f.kind,
    percentage: f.percentage || null,
    currency: f.currency,
    amount: round2(f.amount),
    exchange_rate: rate,
    base_amount: round2(f.amount * rate),
    scheduled_date: f.scheduled_date || null,
    due_date: f.due_date || null,
    status: f.status,
    invoice_number: f.invoice_number.trim() || null,
    invoiced_at: f.status === 'invoiced' ? f.invoiced_at || f.scheduled_date || null : null,
    responsible_person_id: f.responsible_person_id || null,
    probability: Math.min(100, Math.max(0, Math.round(f.probability))),
    last_contact_date: f.last_contact_date || null,
    next_action: f.next_action.trim() || null,
    notes: f.notes.trim() || null,
    attachment_path: f.attachment_path || null,
  };
}

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['milestones'] });
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['audit'] });
};

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: MilestoneFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('milestones')
        .insert({ ...toPayload(form), created_by: user.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateMilestones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (forms: MilestoneFormData[]) => {
      const { data: user } = await supabase.auth.getUser();
      const rows = forms.map((f, i) => ({ ...toPayload(f), sort_order: i, created_by: user.user?.id ?? null }));
      const { data, error } = await supabase.from('milestones').insert(rows).select();
      if (error) throw error;
      return data as Milestone[];
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: form }: { id: string; data: MilestoneFormData }) => {
      const { data, error } = await supabase.from('milestones').update(toPayload(form)).eq('id', id).select().single();
      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function usePatchMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Milestone> }) => {
      const { error } = await supabase.from('milestones').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
