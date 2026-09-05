import { useState } from 'react';
import { Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Milestone, MilestoneFormData, MilestoneKind, MilestoneStatus } from '../../types';
import { useProjects } from '../../hooks/useProjects';
import { useCurrencies, usePeople } from '../../hooks/useCatalogs';
import { useNextInvoiceNumber } from '../../hooks/useSettings';
import { milestoneKindLabels } from '../../lib/constants';
import { formatMoney, getBaseCurrency, round2 } from '../../lib/formatters';
import { emptyMilestoneForm } from '../../lib/forms';
import { errorMessage, inputClass, selectClass } from '../../lib/ui';
import Modal, { ModalActions } from '../ui/Modal';
import Field from '../ui/Field';
import AttachmentField from '../ui/AttachmentField';

interface Props {
  open: boolean;
  milestone?: Milestone | null;
  projectId?: string;
  saving?: boolean;
  onSubmit: (data: MilestoneFormData) => void;
  onClose: () => void;
  allowedProjectIds?: string[] | null;
}

const statusOptions: { value: MilestoneStatus; label: string; help: string }[] = [
  { value: 'scheduled', label: 'Programado', help: 'Aún no se ha facturado.' },
  { value: 'invoiced', label: 'Facturado', help: 'Ya se emitió la factura; queda como cuenta por cobrar.' },
  { value: 'cancelled', label: 'Cancelado', help: 'No se cobrará.' },
];

export default function MilestoneModal(props: Props) {
  if (!props.open) return null;
  return <MilestoneModalForm key={props.milestone?.id ?? props.projectId ?? 'new'} {...props} />;
}

function MilestoneModalForm({ open, milestone, projectId, saving, onSubmit, onClose, allowedProjectIds }: Props) {
  const base = getBaseCurrency();
  const { data: projects } = useProjects();
  const { data: people } = usePeople();
  const { data: currencies } = useCurrencies();
  const nextInvoice = useNextInvoiceNumber();
  const isEditing = !!milestone;

  const [form, setForm] = useState<MilestoneFormData>(() => {
    if (milestone) {
      return {
        project_id: milestone.project_id,
        concept: milestone.concept,
        kind: milestone.kind,
        percentage: milestone.percentage ?? 0,
        currency: milestone.currency,
        amount: milestone.amount,
        exchange_rate: milestone.exchange_rate,
        scheduled_date: milestone.scheduled_date ?? '',
        due_date: milestone.due_date ?? '',
        status: milestone.status,
        invoice_number: milestone.invoice_number ?? '',
        invoiced_at: milestone.invoiced_at ?? '',
        responsible_person_id: milestone.responsible_person_id ?? '',
        probability: milestone.probability,
        last_contact_date: milestone.last_contact_date ?? '',
        next_action: milestone.next_action ?? '',
        notes: milestone.notes ?? '',
        attachment_path: milestone.attachment_path ?? '',
      };
    }
    const pid = projectId || allowedProjectIds?.[0] || '';
    const project = projects?.find((p) => p.id === pid);
    const f = emptyMilestoneForm(base, pid);
    if (project) {
      f.currency = project.currency;
      f.exchange_rate = project.exchange_rate;
      f.responsible_person_id = project.lead_person_id ?? '';
    }
    return f;
  });

  const update = <K extends keyof MilestoneFormData>(key: K, value: MilestoneFormData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const project = projects?.find((p) => p.id === form.project_id);
  const contract = project?.contract_value ?? 0;

  const setProject = (id: string) => {
    const p = projects?.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      project_id: id,
      currency: p?.currency ?? f.currency,
      exchange_rate: p?.exchange_rate ?? f.exchange_rate,
      responsible_person_id: f.responsible_person_id || p?.lead_person_id || '',
    }));
  };

  const setCurrency = (code: string) => {
    const rate = code === base ? 1 : currencies?.find((c) => c.code === code)?.rate_to_base ?? 1;
    setForm((f) => ({ ...f, currency: code, exchange_rate: rate }));
  };

  const setPercentage = (pct: number) => {
    setForm((f) => ({
      ...f,
      percentage: pct,
      amount: contract > 0 && f.currency === project?.currency ? round2((contract * pct) / 100) : f.amount,
    }));
  };

  const setAmount = (amount: number) => {
    setForm((f) => ({
      ...f,
      amount,
      percentage: contract > 0 && f.currency === project?.currency ? round2((amount / contract) * 100) : f.percentage,
    }));
  };

  const generateInvoice = async () => {
    try {
      const n = await nextInvoice.mutateAsync();
      update('invoice_number', n);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) return toast.error('Selecciona un proyecto.');
    if (!(form.amount > 0)) return toast.error('El valor debe ser mayor a cero.');
    onSubmit(form);
  };

  const projectList = (projects ?? []).filter(
    (p) => !p.is_general && (p.status === 'active' || p.status === 'paused' || p.id === form.project_id) && (!allowedProjectIds || allowedProjectIds.includes(p.id))
  );

  return (
    <Modal open={open} title={isEditing ? 'Editar hito de cobro' : 'Nuevo hito de cobro'} subtitle="Facturar no significa cobrar: el cobro se registra aparte como ingreso." onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Proyecto" required>
            <select required value={form.project_id} onChange={(e) => setProject(e.target.value)} className={selectClass} disabled={!!projectId && !isEditing}>
              <option value="">Selecciona…</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo de hito">
            <select value={form.kind} onChange={(e) => update('kind', e.target.value as MilestoneKind)} className={selectClass}>
              {(Object.keys(milestoneKindLabels) as MilestoneKind[]).map((k) => (
                <option key={k} value={k}>
                  {milestoneKindLabels[k]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Concepto" required className="sm:col-span-2">
            <input required value={form.concept} onChange={(e) => update('concept', e.target.value)} className={inputClass} placeholder="p. ej. Anticipo 50 % · Entrega de piezas gráficas" />
          </Field>

          <Field label="Moneda">
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

          <Field label="Valor" required hint={form.currency !== base ? `Equivale a ${formatMoney(round2(form.amount * form.exchange_rate))}` : undefined}>
            <input type="number" required min="0.01" step="0.01" value={form.amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
          </Field>
          <Field label="% del contrato" hint={contract > 0 ? `Contrato: ${formatMoney(contract, project?.currency)}` : 'El proyecto no tiene valor contratado.'}>
            <input type="number" min="0" max="100" step="0.01" value={form.percentage || ''} onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
          </Field>

          <Field label="Fecha programada">
            <input type="date" value={form.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Fecha de vencimiento" hint="Pasada esta fecha sin cobro completo, el hito queda vencido.">
            <input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Estado" hint={statusOptions.find((s) => s.value === form.status)?.help}>
            <select value={form.status} onChange={(e) => update('status', e.target.value as MilestoneStatus)} className={selectClass}>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Probabilidad de cobro (%)" hint="Se usa en el flujo de caja proyectado.">
            <input type="number" min="0" max="100" step="1" value={form.probability} onChange={(e) => update('probability', parseInt(e.target.value) || 0)} className={inputClass} />
          </Field>

          <Field label="Número de factura">
            <div className="flex gap-2">
              <input value={form.invoice_number} onChange={(e) => update('invoice_number', e.target.value)} className={inputClass} placeholder="p. ej. NX-0012" />
              <button
                type="button"
                onClick={generateInvoice}
                disabled={nextInvoice.isPending}
                className="shrink-0 px-3 rounded-lg bg-nx-surface border border-nx-border-light text-nx-muted hover:text-nx-heading text-xs"
                title="Generar consecutivo"
              >
                <Hash size={14} />
              </button>
            </div>
          </Field>
          <Field label="Fecha de facturación">
            <input type="date" value={form.invoiced_at} onChange={(e) => update('invoiced_at', e.target.value)} className={inputClass} disabled={form.status !== 'invoiced'} />
          </Field>

          <Field label="Responsable del cobro">
            <select value={form.responsible_person_id} onChange={(e) => update('responsible_person_id', e.target.value)} className={selectClass}>
              <option value="">Sin asignar</option>
              {people?.filter((p) => p.active || p.id === form.responsible_person_id).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Último contacto">
            <input type="date" value={form.last_contact_date} onChange={(e) => update('last_contact_date', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Próxima acción" className="sm:col-span-2">
            <input value={form.next_action} onChange={(e) => update('next_action', e.target.value)} className={inputClass} placeholder="p. ej. Enviar recordatorio el viernes" />
          </Field>

          <div className="sm:col-span-2">
            <AttachmentField value={form.attachment_path} onChange={(p) => update('attachment_path', p)} folder="facturas" label="Factura / soporte" />
          </div>

          <Field label="Notas" className="sm:col-span-2">
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </Field>
        </div>
        <ModalActions saving={!!saving} isEditing={isEditing} onCancel={onClose} />
      </form>
    </Modal>
  );
}
