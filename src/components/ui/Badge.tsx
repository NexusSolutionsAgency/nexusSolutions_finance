interface BadgeProps {
  label: string;
  color: string;
  size?: 'xs' | 'sm';
  dot?: boolean;
  className?: string;
}

/** Etiqueta de estado con color semántico (semáforo) */
export default function Badge({ label, color, size = 'xs', dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap ${
        size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      style={{ backgroundColor: color + '1f', color }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </span>
  );
}
