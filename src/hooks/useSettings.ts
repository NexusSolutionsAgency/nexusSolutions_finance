import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AppSettings } from '../types';

export const defaultSettings: AppSettings = {
  id: 1,
  company_name: 'Nexus Solutions Agency',
  tax_id: null,
  address: null,
  email: null,
  phone: null,
  base_currency: 'COP',
  invoice_prefix: 'NX-',
  next_invoice_number: 1,
  default_tax_rate: 0,
  min_margin: 20,
  due_soon_days: 7,
  cash_horizon_days: 30,
  updated_at: '',
};

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return (data as AppSettings) ?? defaultSettings;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export type SettingsFormData = Omit<AppSettings, 'id' | 'updated_at'>;

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: Partial<SettingsFormData>) => {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ id: 1, ...form })
        .select()
        .single();
      if (error) throw error;
      return data as AppSettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

/** Reserva el siguiente consecutivo de factura y lo incrementa. */
export function useNextInvoiceNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('invoice_prefix, next_invoice_number').eq('id', 1).single();
      if (error) throw error;
      const number = `${data.invoice_prefix}${String(data.next_invoice_number).padStart(4, '0')}`;
      const { error: upErr } = await supabase
        .from('app_settings')
        .update({ next_invoice_number: data.next_invoice_number + 1 })
        .eq('id', 1);
      if (upErr) throw upErr;
      return number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
