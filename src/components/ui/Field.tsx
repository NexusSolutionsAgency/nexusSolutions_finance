import { labelClass } from '../../lib/ui';

interface FieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function Field({ label, hint, required, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label}
        {required && <span className="text-nx-red ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-nx-muted/80 text-[11px] mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left group"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-nx-blue' : 'bg-nx-border-light'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </span>
      <span>
        <span className="text-nx-text text-sm">{label}</span>
        {description && <span className="block text-nx-muted text-xs">{description}</span>}
      </span>
    </button>
  );
}
