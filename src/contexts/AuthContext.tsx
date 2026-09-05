import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, Project, Role } from '../types';

interface Permissions {
  role: Role | null;
  isAdmin: boolean;
  /** Admin o Finanzas */
  isStaff: boolean;
  /** Puede crear/editar algo en el sistema (no es solo lectura) */
  canWrite: boolean;
  canManageProjects: boolean;
  canManageCatalogs: boolean;
  canViewReports: boolean;
  canViewAudit: boolean;
  /** Puede editar movimientos, hitos y datos del proyecto indicado */
  canEditProject: (project: Project | null | undefined) => boolean;
  /** Puede registrar gastos en el proyecto indicado (incluye colaboradores) */
  canAddExpense: (project: Project | null | undefined) => boolean;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: Permissions;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, person:people(*)')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('No se pudo cargar el perfil', error);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) setProfile(await fetchProfile(data.session.user.id));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        setProfile(await fetchProfile(newSession.user.id));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) setProfile(await fetchProfile(session.user.id));
  }, [session]);

  const can = useMemo<Permissions>(() => {
    const role: Role | null = profile && profile.active ? profile.role : null;
    const isAdmin = role === 'admin';
    const isStaff = role === 'admin' || role === 'finance';
    const personId = profile?.person_id ?? null;
    const isMember = (p: Project | null | undefined) => {
      if (!p || !personId) return false;
      if (p.lead_person_id === personId) return true;
      return (p.members ?? []).some((m) => m.person_id === personId);
    };
    return {
      role,
      isAdmin,
      isStaff,
      canWrite: role !== null && role !== 'viewer',
      canManageProjects: isStaff,
      canManageCatalogs: isStaff,
      canViewReports: isStaff || role === 'viewer' || role === 'project_lead',
      canViewAudit: isStaff,
      canEditProject: (p) => isStaff || (role === 'project_lead' && isMember(p)),
      canAddExpense: (p) => isStaff || ((role === 'project_lead' || role === 'collaborator') && isMember(p)),
    };
  }, [profile]);

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signOut, resetPassword, updatePassword, refreshProfile, can }),
    [session, profile, loading, signIn, signOut, resetPassword, updatePassword, refreshProfile, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
