import { selectClass } from '../../lib/ui';

interface Option {
  value: string;
  label: string;
}

interface Props {
  /** Nombre del filtro; se muestra como texto cuando no hay selección */
  label: string;
  /** Texto de la opción que quita el filtro, p. ej. "Todas las categorías" */
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

/**
 * Select de filtro: cerrado y sin selección muestra el nombre del filtro
 * ("Categoría"); al abrirlo, la primera opción es "Todas…" para limpiarlo.
 */
export default function FilterSelect({ label, allLabel, value, onChange, options, className = '' }: Props) {
  const empty = value === '';
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${selectClass} ${empty ? 'text-nx-muted' : ''} ${className}`}
      title={label}
    >
      <option value="">{empty ? label : allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
