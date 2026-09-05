import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project, ProjectFormData } from '../types';

// La FK explícita evita la ambigüedad con la relación muchos-a-muchos vía project_members
const PROJECT_SELECT = '*, client:clients(*), lead:people!projects_lead_person_id_fkey(*), members:project_members(person_id, person:people(*))';

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select(PROJECT_SELECT).order('is_general', { ascending: false }).order('name');
      if (error) throw error;
      return data as Project[];
    },
  });
}

function toPayload(f: ProjectFormData) {
  return {
    name: f.name.trim(),
    client_id: f.client_id || null,
    lead_person_id: f.lead_person_id || null,
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    status: f.status,
    contract_value: f.contract_value || 0,
    budget: f.budget || 0,
    currency: f.currency,
    exchange_rate: f.exchange_rate || 1,
    billing_model: f.billing_model,
    target_margin: f.target_margin || 0,
    notes: f.notes.trim() || null,
  };
}

async function syncMembers(projectId: string, memberIds: string[]) {
  const { error: delErr } = await supabase.from('project_members').delete().eq('project_id', projectId);
  if (delErr) throw delErr;
  const ids = Array.from(new Set(memberIds.filter(Boolean)));
  if (ids.length) {
    const { error } = await supabase.from('project_members').insert(ids.map((person_id) => ({ project_id: projectId, person_id })));
    if (error) throw error;
  }
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: ProjectFormData) => {
      const { data, error } = await supabase.from('projects').insert(toPayload(form)).select().single();
      if (error) throw error;
      await syncMembers(data.id, form.member_ids);
      return data as Project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: form, isGeneral }: { id: string; data: ProjectFormData; isGeneral?: boolean }) => {
      const payload = toPayload(form);
      // El proyecto General siempre permanece activo
      if (isGeneral) payload.status = 'active';
      const { data, error } = await supabase.from('projects').update(payload).eq('id', id).select().single();
      if (error) throw error;
      await syncMembers(id, form.member_ids);
      return data as Project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useSetProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Project['status'] }) => {
      const { error } = await supabase.from('projects').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}
