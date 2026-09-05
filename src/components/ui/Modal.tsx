import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

export default function Modal({ open, title, subtitle, onClose, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6" onMouseDown={onClose}>
      <div
        className={`bg-nx-card border border-nx-border rounded-2xl w-full ${sizes[size]} max-h-[92vh] flex flex-col shadow-2xl animate-fade-in`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-nx-border shrink-0">
          <div>
            <h2 className="text-nx-heading font-semibold text-lg font-heading">{title}</h2>
            {subtitle && <p className="text-nx-muted text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-nx-muted hover:text-nx-heading transition-colors p-1 -m-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ModalActions({
  saving,
  isEditing,
  onCancel,
  submitLabel,
  disabled,
  extra,
}: {
  saving: boolean;
  isEditing: boolean;
  onCancel: () => void;
  submitLabel?: string;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-nx-border mt-2">
      <div>{extra}</div>
      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-nx-surface border border-nx-border-light text-nx-text hover:bg-nx-card-hover transition-colors text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || disabled}
          className="px-5 py-2 rounded-lg bg-nx-blue text-white font-semibold text-sm hover:bg-nx-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando…' : submitLabel ?? (isEditing ? 'Guardar cambios' : 'Crear')}
        </button>
      </div>
    </div>
  );
}
