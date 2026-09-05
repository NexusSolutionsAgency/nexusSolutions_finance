// Clases reutilizables de Tailwind para mantener consistencia visual

export const inputClass =
  'w-full bg-nx-surface border border-nx-border-light rounded-lg px-3 py-2 text-sm text-nx-text placeholder-nx-muted/70 focus:outline-none focus:border-nx-blue/60 focus:ring-1 focus:ring-nx-blue/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

export const selectClass = inputClass;

export const labelClass = 'block text-nx-muted text-xs font-medium mb-1';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-nx-blue text-white font-semibold text-sm hover:bg-nx-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-nx-surface border border-nx-border-light text-nx-text text-sm hover:bg-nx-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-nx-muted text-sm hover:text-nx-heading hover:bg-nx-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-nx-red text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const card = 'bg-nx-card rounded-xl border border-nx-border';

export const cardPad = `${card} p-5`;

export const tableHead = 'text-left text-nx-muted font-medium text-xs uppercase tracking-wide px-3 py-2.5 whitespace-nowrap';

export const tableCell = 'px-3 py-2.5 text-sm';

export const pill = (active: boolean) =>
  `px-3 py-1 rounded-full text-xs font-medium transition-colors ${
    active ? 'bg-nx-blue/20 text-nx-blue-light border border-nx-blue/30' : 'bg-nx-surface border border-nx-border-light text-nx-muted hover:text-nx-heading'
  }`;

export function errorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string; error_description?: string };
  if (e?.code === '23505') return 'Ya existe un registro con ese nombre.';
  if (e?.code === '23503') return 'No se puede eliminar porque tiene registros relacionados.';
  if (e?.code === '42501' || e?.message?.includes('row-level security')) return 'No tienes permisos para realizar esta acción.';
  if (e?.message === 'Invalid login credentials') return 'Correo o contraseña incorrectos.';
  return e?.message || e?.error_description || 'Ocurrió un error inesperado.';
}
