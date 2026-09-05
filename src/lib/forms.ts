// Valores iniciales de formularios y generadores puros (sin React)
import type { BillingModel, MilestoneFormData, Project, TransactionFormData } from '../types';
import type { MilestoneView } from './finance';
import { addDays, round2, shiftMonth, todayISO } from './formatters';

export function emptyTransactionForm(base: string): TransactionFormData {
  return {
    date: todayISO(),
    type: 'expense',
    status: 'paid',
    description: '',
    notes: '',
    project_id: '',
    project_ids: [],
    project_percentages: {},
    category_id: '',
    client_id: '',
    person_id: '',
    paid_by_person_id: '',
    payer_kind: 'company',
    account_id: '',
    to_account_id: '',
    payment_method_id: '',
    milestone_id: '',
    currency: base,
    amount: 0,
    tax_amount: 0,
    exchange_rate: 1,
    direction: 'in',
    invoice_number: '',
    attachment_path: '',
    mark_reimbursed: true,
  };
}

export function emptyMilestoneForm(base: string, projectId = ''): MilestoneFormData {
  return {
    project_id: projectId,
    concept: '',
    kind: 'other',
    percentage: 0,
    currency: base,
    amount: 0,
    exchange_rate: 1,
    scheduled_date: todayISO(),
    due_date: addDays(todayISO(), 15),
    status: 'scheduled',
    invoice_number: '',
    invoiced_at: '',
    responsible_person_id: '',
    probability: 100,
    last_contact_date: '',
    next_action: '',
    notes: '',
    attachment_path: '',
  };
}

/** Prellenado del formulario de ingreso para registrar el cobro de un hito */
export function paymentInitialFor(v: MilestoneView): Partial<TransactionFormData> {
  const m = v.milestone;
  return {
    type: 'income',
    status: 'collected',
    project_id: m.project_id,
    project_ids: [m.project_id],
    milestone_id: m.id,
    client_id: m.project?.client_id ?? '',
    currency: m.currency,
    exchange_rate: m.exchange_rate,
    amount: round2(v.remaining / (m.exchange_rate || 1)),
    description: `Cobro: ${m.concept}`,
    invoice_number: m.invoice_number ?? '',
    person_id: m.responsible_person_id ?? '',
  };
}

export interface PlanGenState {
  model: BillingModel;
  total: number;
  count: number;
  advancePct: number;
  firstDate: string;
  intervalDays: number;
  dueDays: number;
}

function addMonthsISO(iso: string, months: number) {
  const key = shiftMonth(iso.slice(0, 7), months);
  const day = iso.slice(8, 10);
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${key}-${String(Math.min(Number(day), last)).padStart(2, '0')}`;
}

/** Genera los hitos de un plan de cobros según el modelo elegido */
export function generatePlan(project: Project, g: PlanGenState): MilestoneFormData[] {
  const base = emptyMilestoneForm(project.currency, project.id);
  const mk = (concept: string, kind: MilestoneFormData['kind'], amount: number, pct: number, date: string): MilestoneFormData => ({
    ...base,
    concept,
    kind,
    amount: round2(amount),
    percentage: round2(pct),
    currency: project.currency,
    exchange_rate: project.exchange_rate,
    scheduled_date: date,
    due_date: addDays(date, g.dueDays),
    responsible_person_id: project.lead_person_id ?? '',
  });
  const total = g.total;
  const end = project.end_date && project.end_date > g.firstDate ? project.end_date : addDays(g.firstDate, g.intervalDays * Math.max(1, g.count - 1));

  switch (g.model) {
    case 'single':
      return [mk('Pago único', 'final', total, 100, g.firstDate)];
    case 'advance_final': {
      const adv = round2((total * g.advancePct) / 100);
      return [mk(`Anticipo ${g.advancePct} %`, 'advance', adv, g.advancePct, g.firstDate), mk('Pago final', 'final', total - adv, 100 - g.advancePct, end)];
    }
    case 'deliverables': {
      const n = Math.max(1, g.count);
      const each = round2(total / n);
      return Array.from({ length: n }, (_, i) =>
        mk(`Entrega ${i + 1} de ${n}`, 'delivery', i === n - 1 ? round2(total - each * (n - 1)) : each, round2(100 / n), addDays(g.firstDate, g.intervalDays * i))
      );
    }
    case 'monthly': {
      const n = Math.max(1, g.count);
      const each = round2(total / n);
      return Array.from({ length: n }, (_, i) => {
        const date = addMonthsISO(g.firstDate, i);
        const label = new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        return mk(`Mensualidad ${label}`, 'monthly', i === n - 1 ? round2(total - each * (n - 1)) : each, round2(100 / n), date);
      });
    }
    case 'commission':
      return [mk('Comisión', 'commission', total, 100, g.firstDate)];
    case 'mixed': {
      const adv = round2((total * g.advancePct) / 100);
      const rest = total - adv;
      const n = Math.max(1, g.count);
      const each = round2(rest / n);
      return [
        mk(`Anticipo ${g.advancePct} %`, 'advance', adv, g.advancePct, g.firstDate),
        ...Array.from({ length: n }, (_, i) =>
          mk(`Entrega ${i + 1} de ${n}`, 'delivery', i === n - 1 ? round2(rest - each * (n - 1)) : each, round2((100 - g.advancePct) / n), addDays(g.firstDate, g.intervalDays * (i + 1)))
        ),
      ];
    }
    default:
      return [mk('Cobro', 'other', total, 100, g.firstDate)];
  }
}
