import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AuditEntry } from '../types';

export function useAuditLog(opts?: { table?: string; recordId?: string; limit?: number; enabled?: boolean }) {
  return useQuery<AuditEntry[]>({
    queryKey: ['audit', opts?.table ?? 'all', opts?.recordId ?? 'all', opts?.limit ?? 200],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      let q = supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(opts?.limit ?? 200);
      if (opts?.table) q = q.eq('table_name', opts.table);
      if (opts?.recordId) q = q.eq('record_id', opts.recordId);
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}
