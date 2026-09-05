import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-nx-card border border-nx-border rounded-2xl max-w-md w-full p-6 animate-fade-in shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${tone === 'danger' ? 'bg-nx-red/10' : 'bg-nx-blue/10'}`}>
            <AlertTriangle className={tone === 'danger' ? 'text-nx-red' : 'text-nx-blue-light'} size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-nx-heading font-semibold text-lg font-heading">{title}</h3>
              <button onClick={onCancel} className="text-nx-muted hover:text-nx-heading">
                <X size={18} />
              </button>
            </div>
            <p className="text-nx-muted mt-2 text-sm whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-nx-surface border border-nx-border-light text-nx-text hover:bg-nx-card-hover transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors text-sm disabled:opacity-50 ${
              tone === 'danger' ? 'bg-nx-red hover:bg-red-600' : 'bg-nx-blue hover:bg-nx-blue-dark'
            }`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
