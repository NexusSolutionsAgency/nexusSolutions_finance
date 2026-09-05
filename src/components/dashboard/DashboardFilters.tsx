import { Filter, X } from 'lucide-react';
import type { TransactionType } from '../../types';
import { useProjects } from '../../hooks/useProjects';
import { useCategories, useClients, usePeople } from '../../hooks/useCatalogs';
import { milestoneStatusLabels, transactionTypeLabels } from '../../lib/constants';
import { emptyDashboardFilters, hasActiveFilters, type DashboardFilters as DF } from '../../lib/filters';
import { pill, selectClass, inputClass } from '../../lib/ui';
import { currentMonthKey, shiftMonth } from '../../lib/formatters';

interface Props {
  filters: DF;
  onChange: (f: DF) => void;
}

const thisYear = new Date().getFullYear();
const YEARS = [thisYear, thisYear - 1, thisYear - 2].map(String);

function monthRange(key: string) {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
}

export default function DashboardFilters({ filters, onChange }: Props) {
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: people } = usePeople();
  const { data: clients } = useClients();

  const update = (key: keyof DF, value: string) => onChange({ ...filters, [key]: value });
  const clearAll = () => onChange({ ...emptyDashboardFilters });
  const active = hasActiveFilters(filters);

  const onlyDates = !filters.type && !filters.project_id && !filters.person_id && !filters.category_id && !filters.client_id && !filters.collection_status;
  const activeYear = YEARS.find((y) => filters.date_from === `${y}-01-01` && filters.date_to === `${y}-12-31`);
  const cur = monthRange(currentMonthKey());
  const prev = monthRange(shiftMonth(currentMonthKey(), -1));
  const isThisMonth = filters.date_from === cur.from && filters.date_to === cur.to;
  const isPrevMonth = filters.date_from === prev.from && filters.date_to === prev.to;

  const setRange = (from: string, to: string, activeNow: boolean) => {
    if (activeNow) onChange({ ...filters, date_from: '', date_to: '' });
    else onChange({ ...filters, date_from: from, date_to: to });
  };

  return (
    <div className="bg-nx-card rounded-xl border border-nx-border p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-nx-muted">
            <Filter size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Filtros</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => onChange({ ...filters, date_from: '', date_to: '' })} className={pill(!filters.date_from && !filters.date_to)}>
              Todo
            </button>
            <button onClick={() => setRange(cur.from, cur.to, isThisMonth)} className={pill(isThisMonth)}>
              Este mes
            </button>
            <button onClick={() => setRange(prev.from, prev.to, isPrevMonth)} className={pill(isPrevMonth)}>
              Mes anterior
            </button>
            {YEARS.map((y) => (
              <button key={y} onClick={() => setRange(`${y}-01-01`, `${y}-12-31`, activeYear === y && onlyDates)} className={pill(activeYear === y)}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {active && (
          <button onClick={clearAll} className="text-nx-muted hover:text-nx-blue-light text-xs flex items-center gap-1">
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2">
        <select value={filters.project_id} onChange={(e) => update('project_id', e.target.value)} className={selectClass}>
          <option value="">Todos los proyectos</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={filters.type} onChange={(e) => update('type', e.target.value)} className={selectClass}>
          <option value="">Todos los tipos</option>
          {(Object.keys(transactionTypeLabels) as TransactionType[]).map((t) => (
            <option key={t} value={t}>
              {transactionTypeLabels[t]}
            </option>
          ))}
        </select>
        <select value={filters.category_id} onChange={(e) => update('category_id', e.target.value)} className={selectClass}>
          <option value="">Todas las categorías</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filters.person_id} onChange={(e) => update('person_id', e.target.value)} className={selectClass}>
          <option value="">Todos los responsables</option>
          {people?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={filters.client_id} onChange={(e) => update('client_id', e.target.value)} className={selectClass}>
          <option value="">Todos los clientes</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filters.collection_status} onChange={(e) => update('collection_status', e.target.value)} className={selectClass}>
          <option value="">Estado del cobro</option>
          {Object.entries(milestoneStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input type="date" value={filters.date_from} onChange={(e) => update('date_from', e.target.value)} className={inputClass} />
        <input type="date" value={filters.date_to} onChange={(e) => update('date_to', e.target.value)} className={inputClass} />
      </div>
    </div>
  );
}
