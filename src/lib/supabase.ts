import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** true cuando las variables de entorno están presentes (en Vercel o en .env local) */
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

// Con valores de relleno el cliente se crea igual y la app muestra un aviso claro
// en lugar de romperse (y evita que el bundler elimine el código como "inalcanzable").
export const supabase = createClient(supabaseUrl || 'https://sin-configurar.supabase.co', supabaseAnonKey || 'sin-configurar');

/**
 * Cliente secundario sin persistencia de sesión.
 * Se usa para que un administrador cree cuentas de otros miembros
 * sin que su propia sesión se reemplace por la del nuevo usuario.
 */
export function createSecondaryClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const ATTACHMENTS_BUCKET = 'comprobantes';
