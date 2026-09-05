import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSecondaryClient, supabase } from '../lib/supabase';
import type { Profile, Role } from '../types';

export function useProfiles() {
  return useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, person:people(*)').order('created_at');
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export interface MemberFormData {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  person_id: string;
  active: boolean;
}

/**
 * Crea la cuenta de un nuevo miembro desde la app (solo administradores).
 * Usa un cliente secundario para no reemplazar la sesión del administrador.
 * Requiere que en Supabase → Authentication → Providers → Email esté
 * desactivado "Confirm email" para que la persona pueda entrar de inmediato.
 */
export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: MemberFormData) => {
      const secondary = createSecondaryClient();
      const { data, error } = await secondary.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { full_name: form.full_name.trim() } },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error('No se pudo crear el usuario.');
      // El trigger crea el perfil como "viewer" inactivo; el administrador lo configura aquí
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          role: form.role,
          active: form.active,
          person_id: form.person_id || null,
        })
        .eq('id', userId);
      if (upErr) throw upErr;
      await secondary.auth.signOut().catch(() => undefined);
      return userId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Profile, 'full_name' | 'role' | 'active' | 'person_id'>> }) => {
      const { error } = await supabase.from('profiles').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
