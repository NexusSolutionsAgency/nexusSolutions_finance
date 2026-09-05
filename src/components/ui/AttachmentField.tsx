import { useRef } from 'react';
import { Paperclip, ExternalLink, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { openAttachment, useUploadAttachment } from '../../hooks/useAttachments';
import { errorMessage, labelClass } from '../../lib/ui';

interface AttachmentFieldProps {
  value: string;
  onChange: (path: string) => void;
  folder: string;
  label?: string;
  disabled?: boolean;
}

/** Campo para subir/ver/quitar un comprobante (PDF o imagen) */
export default function AttachmentField({ value, onChange, folder, label = 'Comprobante', disabled }: AttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachment();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const path = await upload.mutateAsync({ file, folder });
      onChange(path);
      toast.success('Archivo adjuntado');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const fileName = value ? value.split('/').pop()?.replace(/^\d+-/, '') : '';

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-2 bg-nx-surface border border-nx-border-light rounded-lg px-3 py-2">
          <Paperclip size={14} className="text-nx-blue-light shrink-0" />
          <span className="text-nx-text text-sm truncate flex-1" title={fileName}>
            {fileName}
          </span>
          <button
            type="button"
            onClick={() => openAttachment(value).catch((e) => toast.error(errorMessage(e)))}
            className="p-1 text-nx-muted hover:text-nx-blue-light"
            title="Abrir"
          >
            <ExternalLink size={14} />
          </button>
          {!disabled && (
            <button type="button" onClick={() => onChange('')} className="p-1 text-nx-muted hover:text-nx-red" title="Quitar">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || upload.isPending}
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-nx-surface border border-dashed border-nx-border-light rounded-lg px-3 py-2 text-sm text-nx-muted hover:text-nx-heading hover:border-nx-blue/50 transition-colors disabled:opacity-50"
        >
          <Upload size={14} />
          {upload.isPending ? 'Subiendo…' : 'Adjuntar PDF o imagen (máx. 10 MB)'}
        </button>
      )}
    </div>
  );
}
