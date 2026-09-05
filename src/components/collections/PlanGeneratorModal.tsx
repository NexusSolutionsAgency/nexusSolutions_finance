import { useMemo, useState } from 'react';
import type { BillingModel, MilestoneFormData, Project } from '../../types';
import { billingModelLabels } from '../../lib/constants';
import { formatDate, formatMoney, todayISO } from '../../lib/formatters';
import { generatePlan, type PlanGenState } from '../../lib/forms';
import { inputClass, selectClass } from '../../lib/ui';
import Modal, { ModalActions } from '../ui/Modal';
import Field from '../ui/Field';

interface Props {
  open: boolean;
  project: Project;
  saving?: boolean;
  onGenerate: (forms: MilestoneFormData[]) => void;
  onClose: () => void;
}

export default function PlanGeneratorModal(props: Props) {
  if (!props.open) return null;
  return <PlanGeneratorForm key={props.project.id} {...props} />;
}

function PlanGeneratorForm({ open, project, saving, onGenerate, onClose }: Props) {
  const [g, setG] = useState<PlanGenState>(() => ({
    model: project.billing_model,
    total: project.contract_value,
    count: project.billing_model === 'monthly' ? 6 : 3,
    advancePct: 50,
    firstDate: project.start_date ?? todayISO(),
    intervalDays: 30,
    dueDays: 15,
  }));

  const preview = useMemo(() => (g.total > 0 ? generatePlan(project, g) : []), [project, g]);
  const upd = <K extends keyof PlanGenState>(k: K, v: PlanGenState[K]) => setG((s) => ({ ...s, [k]: v }));
  const needsCount = g.model === 'deliverables' || g.model === 'monthly' || g.model === 'mixed';
  const needsAdvance = g.model === 'advance_final' || g.model === 'mixed';

  return (
    <Modal open={open} title="Generar plan de cobros" subtitle="Crea los hitos automáticamente según el modelo de cobro. Luego puedes editarlos uno a uno." onClose={onClose} size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (preview.length) onGenerate(preview);
        }}
        className="p-5"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Modelo">
            <select value={g.model} onChange={(e) => upd('model', e.target.value as BillingModel)} className={selectClass}>
              {(Object.keys(billingModelLabels) as BillingModel[]).map((b) => (
                <option key={b} value={b}>
                  {billingModelLabels[b]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Total a cobrar (${project.currency})`}>
            <input type="number" min="0" step="0.01" value={g.total || ''} onChange={(e) => upd('total', parseFloat(e.target.value) || 0)} className={inputClass} />
          </Field>
          <Field label="Primera fecha">
            <input type="date" value={g.firstDate} onChange={(e) => upd('firstDate', e.target.value)} className={inputClass} />
          </Field>
          {needsAdvance && (
            <Field label="Anticipo (%)">
              <input type="number" min="0" max="100" value={g.advancePct} onChange={(e) => upd('advancePct', parseFloat(e.target.value) || 0)} className={inputClass} />
            </Field>
          )}
          {needsCount && (
            <Field label={g.model === 'monthly' ? 'Número de meses' : 'Número de entregas'}>
              <input type="number" min="1" max="60" value={g.count} onChange={(e) => upd('count', parseInt(e.target.value) || 1)} className={inputClass} />
            </Field>
          )}
          {(g.model === 'deliverables' || g.model === 'mixed') && (
            <Field label="Días entre entregas">
              <input type="number" min="1" value={g.intervalDays} onChange={(e) => upd('intervalDays', parseInt(e.target.value) || 30)} className={inputClass} />
            </Field>
          )}
          <Field label="Plazo de pago (días)" hint="Vencimiento = fecha programada + plazo">
            <input type="number" min="0" value={g.dueDays} onChange={(e) => upd('dueDays', parseInt(e.target.value) || 0)} className={inputClass} />
          </Field>
        </div>

        <div className="mt-4 bg-nx-surface/60 border border-nx-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nx-muted border-b border-nx-border">
                <th className="text-left px-3 py-2 font-medium">Concepto</th>
                <th className="text-left px-3 py-2 font-medium">Programado</th>
                <th className="text-left px-3 py-2 font-medium">Vence</th>
                <th className="text-right px-3 py-2 font-medium">%</th>
                <th className="text-right px-3 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((m, i) => (
                <tr key={i} className="border-b border-nx-border/50">
                  <td className="px-3 py-1.5 text-nx-text">{m.concept}</td>
                  <td className="px-3 py-1.5 text-nx-muted">{formatDate(m.scheduled_date)}</td>
                  <td className="px-3 py-1.5 text-nx-muted">{formatDate(m.due_date)}</td>
                  <td className="px-3 py-1.5 text-right text-nx-muted">{m.percentage}</td>
                  <td className="px-3 py-1.5 text-right text-nx-heading font-medium">{formatMoney(m.amount, project.currency)}</td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-nx-muted">
                    Indica el total a cobrar para ver la vista previa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ModalActions saving={!!saving} isEditing={false} onCancel={onClose} submitLabel={`Crear ${preview.length} hito${preview.length === 1 ? '' : 's'}`} disabled={preview.length === 0} />
      </form>
    </Modal>
  );
}
