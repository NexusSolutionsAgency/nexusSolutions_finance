import { useState } from 'react';
import { Check } from 'lucide-react';
import type { BillingModel, Project, ProjectFormData, ProjectStatus } from '../../types';
import { useClients, useCurrencies, usePeople } from '../../hooks/useCatalogs';
import { billingModelLabels, projectStatusLabels } from '../../lib/constants';
import { getBaseCurrency } from '../../lib/formatters';
import { inputClass, selectClass } from '../../lib/ui';
import Modal, { ModalActions } from '../ui/Modal';
import Field from '../ui/Field';

interface Props {
  open: boolean;
  project?: Project | null;
  saving?: boolean;
  onSubmit: (data: ProjectFormData) => void;
  onClose: () => void;
}

function emptyForm(base: string): ProjectFormData {
  return {
    name: '',
    client_id: '',
    lead_person_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
    contract_value: 0,
    budget: 0,
    currency: base,
    exchange_rate: 1,
    billing_model: 'single',
    target_margin: 30,
    notes: '',
    member_ids: [],
  };
}

export default function ProjectModal(props: Props) {
  if (!props.open) return null;
  return <ProjectModalForm key={props.project?.id ?? 'new'} {...props} />;
}

function ProjectModalForm({ open, project, saving, onSubmit, onClose }: Props) {
  const base = getBaseCurrency();
  const { data: clients } = useClients();
  const { data: people } = usePeople();
  const { data: currencies } = useCurrencies();
  const isEditing = !!project;

  const [form, setForm] = useState<ProjectFormData>(() =>
    project
      ? {
          name: project.name,
          client_id: project.client_id ?? '',
          lead_person_id: project.lead_person_id ?? '',
          start_date: project.start_date ?? '',
          end_date: project.end_date ?? '',
          status: project.status,
          contract_value: project.contract_value,
          budget: project.budget,
          currency: project.currency,
          exchange_rate: project.exchange_rate,
          billing_model: project.billing_model,
          target_margin: project.target_margin,
          notes: project.notes ?? '',
          member_ids: (project.members ?? []).map((m) => m.person_id),
        }
      : emptyForm(base)
  );

  const update = <K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setCurrency = (code: string) => {
    const rate = code === base ? 1 : currencies?.find((c) => c.code === code)?.rate_to_base ?? 1;
    setForm((f) => ({ ...f, currency: code, exchange_rate: rate }));
  };

  const toggleMember = (id: string) =>
    setForm((f) => ({ ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter((x) => x !== id) : [...f.member_ids, id] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const activePeople = (people ?? []).filter((p) => p.active || form.member_ids.includes(p.id) || p.id === form.lead_person_id);

  return (
    <Modal open={open} title={isEditing ? 'Editar proyecto' : 'Agregar proyecto'} subtitle="Cada proyecto funciona como una unidad financiera independiente." onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Nombre" required className="sm:col-span-2">
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} placeholder="p. ej. NEXUS Fragrances" disabled={project?.is_general} />
          </Field>

          <Field label="Cliente">
            <select value={form.client_id} onChange={(e) => update('client_id', e.target.value)} className={selectClass}>
              <option value="">Sin cliente (interno)</option>
              {clients?.filter((c) => c.active || c.id === form.client_id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Responsable / líder">
            <select value={form.lead_person_id} onChange={(e) => update('lead_person_id', e.target.value)} className={selectClass}>
              <option value="">Sin asignar</option>
              {activePeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha de inicio">
            <input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fecha de fin (estimada)">
            <input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Estado">
            <select value={form.status} onChange={(e) => update('status', e.target.value as ProjectStatus)} className={selectClass} disabled={project?.is_general}>
              {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {projectStatusLabels[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Modelo de cobro">
            <select value={form.billing_model} onChange={(e) => update('billing_model', e.target.value as BillingModel)} className={selectClass}>
              {(Object.keys(billingModelLabels) as BillingModel[]).map((b) => (
                <option key={b} value={b}>
                  {billingModelLabels[b]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moneda del contrato">
            <select value={form.currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
              {(currencies ?? []).filter((c) => c.active || c.code === form.currency).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </Field>
          {form.currency !== base ? (
            <Field label={`Tasa (1 ${form.currency} = ? ${base})`}>
              <input type="number" min="0.000001" step="0.000001" value={form.exchange_rate || ''} onChange={(e) => update('exchange_rate', parseFloat(e.target.value) || 1)} className={inputClass} />
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}

          <Field label="Valor contratado" hint="Total acordado con el cliente. Base para la utilidad proyectada.">
            <input type="number" min="0" step="0.01" value={form.contract_value || ''} onChange={(e) => update('contract_value', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
          </Field>
          <Field label="Presupuesto de costos" hint="Si los costos registrados lo superan, se genera una alerta.">
            <input type="number" min="0" step="0.01" value={form.budget || ''} onChange={(e) => update('budget', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
          </Field>

          <Field label="Margen objetivo (%)" hint="Debajo de este margen se marca el proyecto en alerta.">
            <input type="number" min="0" max="100" step="0.1" value={form.target_margin || ''} onChange={(e) => update('target_margin', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="30" />
          </Field>

          <Field label="Miembros del equipo" className="sm:col-span-2" hint="Los líderes y colaboradores solo ven los proyectos donde participan.">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activePeople.map((p) => {
                const sel = form.member_ids.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleMember(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-left transition-colors ${
                      sel ? 'border-nx-blue bg-nx-blue/10 text-nx-blue-light' : 'border-nx-border-light bg-nx-surface text-nx-text hover:border-nx-muted'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-nx-blue border-nx-blue' : 'border-nx-muted'}`}>
                      {sel && <Check size={10} className="text-white" />}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
              {activePeople.length === 0 && <p className="text-nx-muted text-xs col-span-full">Agrega personas en Configuración → Personas.</p>}
            </div>
          </Field>

          <Field label="Notas" className="sm:col-span-2">
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Alcance, condiciones, observaciones…" />
          </Field>
        </div>
        <ModalActions saving={!!saving} isEditing={isEditing} onCancel={onClose} />
      </form>
    </Modal>
  );
}
