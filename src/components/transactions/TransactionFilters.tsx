import { Search, X, Filter } from 'lucide-react';
import type { TransactionFilters as TF, TransactionStatus, TransactionType } from '../../types';
import { emptyTransactionFilters } from '../../types';
import { useProjects } from '../../hooks/useProjects';
import { useAccounts, useCategories, useClients, usePeople } from '../../hooks/useCatalogs';
import { transactionStatusLabels, transactionTypeLabels } from '../../lib/constants';
import { inputClass, pill } from '../../lib/ui';
import FilterSelect from '../ui/FilterSelect';

interface Props {
  filters: TF;
  onChange: (f: TF) => void;
}

const thisYear = new Date().getFullYear();
const YEARS = [thisYear, thisYear - 1, thisYear - 2].map(String);

export default function TransactionFiltersBar({ filters, onChange }: Props) {
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: people } = usePeople();
  const { data: clients } = useClients();
  const { data: accounts } = useAccounts();

  const update = (key: keyof TF, value: string) => onChange({ ...filters, [key]: value });
  const hasFilters = Object.values(filters).some((v) => v !== '');
  const activeYear = YEARS.find((y) => filters.date_from === `${y}-01-01` && filters.date_to === `${y}-12-31`);

  return (
    <div className="bg-nx-card rounded-xl border border-nx-border p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-nx-muted">
            <Filter size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Filtros</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onChange({ ...filters, date_from: '', date_to: '' })} className={pill(!filters.date_from && !filters.date_to)}>
              Todo
            </button>
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() =>
                  activeYear === y
                    ? onChange({ ...filters, date_from: '', date_to: '' })
                    : onChange({ ...filters, date_from: `${y}-01-01`, date_to: `${y}-12-31` })
                }
                className={pill(activeYear === y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        {hasFilters && (
          <button onClick={() => onChange({ ...emptyTransactionFilters })} className="text-nx-muted hover:text-nx-blue-light text-xs flex items-center gap-1">
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-2">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nx-muted" size={14} />
          <input
            type="text"
            placeholder="Buscar descripción, nota o factura…"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <FilterSelect
          label="Tipo"
          allLabel="Todos los tipos"
          value={filters.type}
          onChange={(v) => update('type', v)}
          options={(Object.keys(transactionTypeLabels) as TransactionType[]).map((t) => ({ value: t, label: transactionTypeLabels[t] }))}
        />
        <FilterSelect
          label="Estado"
          allLabel="Todos los estados"
          value={filters.status}
          onChange={(v) => update('status', v)}
          options={(Object.keys(transactionStatusLabels) as TransactionStatus[]).map((s) => ({ value: s, label: transactionStatusLabels[s] }))}
        />
        <FilterSelect
          label="Proyecto"
          allLabel="Todos los proyectos"
          value={filters.project_id}
          onChange={(v) => update('project_id', v)}
          options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterSelect
          label="Categoría"
          allLabel="Todas las categorías"
          value={filters.category_id}
          onChange={(v) => update('category_id', v)}
          options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          label="Persona"
          allLabel="Todas las personas"
          value={filters.person_id}
          onChange={(v) => update('person_id', v)}
          options={(people ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterSelect
          label="Cliente"
          allLabel="Todos los clientes"
          value={filters.client_id}
          onChange={(v) => update('client_id', v)}
          options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          label="Cuenta"
          allLabel="Todas las cuentas"
          value={filters.account_id}
          onChange={(v) => update('account_id', v)}
          options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))}
        />
        <div className="flex gap-2">
          <input type="date" value={filters.date_from} onChange={(e) => update('date_from', e.target.value)} className={`${inputClass} ${filters.date_from ? '' : 'text-nx-muted'}`} title="Desde" />
          <input type="date" value={filters.date_to} onChange={(e) => update('date_to', e.target.value)} className={`${inputClass} ${filters.date_to ? '' : 'text-nx-muted'}`} title="Hasta" />
        </div>
      </div>
    </div>
  );
}
