// ─────────────────────────────────────────────────────────────
// Lógica financiera central · Nexus Finance
// Todas las cifras están en moneda base. Implementa las fórmulas
// definidas en la especificación (sección 07 · Modelo de cálculo).
// ─────────────────────────────────────────────────────────────
import type {
  Account,
  AppSettings,
  Milestone,
  MilestoneEffectiveStatus,
  Person,
  Project,
  Transaction,
} from '../types';
import { addDays, currentMonthKey, daysBetween, monthKey, shiftMonth, todayISO } from './formatters';

// ── Clasificación de movimientos ──────────────────────────────
export const EXPENSE_PAID_STATUSES = ['paid', 'reimbursable', 'reimbursed'] as const;

export function isCancelled(t: Transaction) {
  return t.status === 'cancelled';
}

/** Ingreso efectivamente cobrado */
export function isIncomeCollected(t: Transaction) {
  return t.type === 'income' && !isCancelled(t);
}

/** Gasto pagado (por Nexus o por una persona de su bolsillo) */
export function isExpensePaid(t: Transaction) {
  return t.type === 'expense' && (EXPENSE_PAID_STATUSES as readonly string[]).includes(t.status);
}

/** Gasto registrado contablemente (pagado o pendiente de pago) */
export function isExpenseRegistered(t: Transaction) {
  return t.type === 'expense' && (isExpensePaid(t) || t.status === 'pending');
}

/** Gasto que cuenta para los costos proyectados (incluye presupuestados) */
export function isExpenseProjected(t: Transaction) {
  return t.type === 'expense' && !isCancelled(t);
}

const sum = (list: Transaction[], pick: (t: Transaction) => number) => list.reduce((s, t) => s + pick(t), 0);

// ── Caja ──────────────────────────────────────────────────────
export interface CashDelta {
  account_id: string | null;
  delta: number;
}

/** Efecto de un movimiento sobre la caja (valor neto en moneda base) */
export function cashEffect(t: Transaction): CashDelta[] {
  if (isCancelled(t)) return [];
  switch (t.type) {
    case 'income':
      return [{ account_id: t.account_id, delta: t.base_amount }];
    case 'expense':
      // Solo el gasto pagado por Nexus mueve caja; el pagado por una persona
      // mueve caja cuando se registra el reembolso.
      return t.status === 'paid' ? [{ account_id: t.account_id, delta: -t.base_amount }] : [];
    case 'reimbursement':
    case 'withdrawal':
      return [{ account_id: t.account_id, delta: -t.base_amount }];
    case 'contribution':
      return [{ account_id: t.account_id, delta: t.base_amount }];
    case 'transfer':
      return [
        { account_id: t.account_id, delta: -t.base_amount },
        { account_id: t.to_account_id, delta: t.base_amount },
      ];
    case 'adjustment':
      return [{ account_id: t.account_id, delta: t.direction === 'out' ? -t.base_amount : t.base_amount }];
  }
}

export interface CashSummary {
  total: number;
  byAccount: { account: Account | null; balance: number }[];
}

export function computeCash(transactions: Transaction[], accounts: Account[], rateOf: (code: string) => number): CashSummary {
  const balances = new Map<string | null, number>();
  accounts.forEach((a) => balances.set(a.id, a.initial_balance * rateOf(a.currency)));
  transactions.forEach((t) => {
    cashEffect(t).forEach(({ account_id, delta }) => {
      balances.set(account_id, (balances.get(account_id) ?? 0) + delta);
    });
  });
  const byAccount = Array.from(balances.entries()).map(([id, balance]) => ({
    account: accounts.find((a) => a.id === id) ?? null,
    balance,
  }));
  byAccount.sort((a, b) => (a.account ? 0 : 1) - (b.account ? 0 : 1) || b.balance - a.balance);
  return { total: byAccount.reduce((s, x) => s + x.balance, 0), byAccount };
}

// ── Hitos / cartera ───────────────────────────────────────────
export function milestoneCollected(m: Milestone, transactions: Transaction[]): number {
  return sum(
    transactions.filter((t) => t.milestone_id === m.id && isIncomeCollected(t)),
    (t) => t.base_gross_amount
  );
}

export function milestoneEffectiveStatus(m: Milestone, collected: number, today = todayISO()): MilestoneEffectiveStatus {
  if (m.status === 'cancelled') return 'cancelled';
  if (m.base_amount > 0 && collected >= m.base_amount - 0.5) return 'paid';
  if (m.status === 'scheduled') return collected > 0 ? 'partial' : 'scheduled';
  if (m.due_date && m.due_date < today) return 'overdue';
  return collected > 0 ? 'partial' : 'invoiced';
}

export interface MilestoneView {
  milestone: Milestone;
  collected: number;
  remaining: number;
  status: MilestoneEffectiveStatus;
  daysOverdue: number;
}

export function buildMilestoneViews(milestones: Milestone[], transactions: Transaction[], today = todayISO()): MilestoneView[] {
  return milestones.map((m) => {
    const collected = milestoneCollected(m, transactions);
    const status = milestoneEffectiveStatus(m, collected, today);
    const remaining = status === 'cancelled' ? 0 : Math.max(m.base_amount - collected, 0);
    const daysOverdue = status === 'overdue' && m.due_date ? daysBetween(m.due_date, today) : 0;
    return { milestone: m, collected, remaining, status, daysOverdue };
  });
}

// ── KPIs consolidados ─────────────────────────────────────────
export interface Kpis {
  invoiced: number;
  collected: number;
  receivable: number;
  overdue: number;
  expensesPaid: number;
  expensesRegistered: number;
  expensesProjected: number;
  profitActual: number;
  profitAccounting: number;
  marginActual: number | null;
  collectedPct: number | null;
  contributions: number;
  withdrawals: number;
  reimbursements: number;
  taxesCollected: number;
}

export function computeKpis(transactions: Transaction[], milestoneViews: MilestoneView[]): Kpis {
  const invoicedMilestoneIds = new Set(
    milestoneViews.filter((v) => v.milestone.status === 'invoiced').map((v) => v.milestone.id)
  );
  const invoicedFromMilestones = milestoneViews
    .filter((v) => v.milestone.status === 'invoiced')
    .reduce((s, v) => s + v.milestone.base_amount, 0);
  // Ingresos sin hito facturado cuentan como facturados y cobrados al mismo tiempo
  const looseIncome = sum(
    transactions.filter((t) => isIncomeCollected(t) && !(t.milestone_id && invoicedMilestoneIds.has(t.milestone_id))),
    (t) => t.base_gross_amount
  );
  const invoiced = invoicedFromMilestones + looseIncome;
  const collected = sum(transactions.filter(isIncomeCollected), (t) => t.base_gross_amount);
  const receivable = milestoneViews
    .filter((v) => v.milestone.status === 'invoiced' && v.status !== 'paid' && v.status !== 'cancelled')
    .reduce((s, v) => s + v.remaining, 0);
  const overdue = milestoneViews.filter((v) => v.status === 'overdue').reduce((s, v) => s + v.remaining, 0);

  const expensesPaid = sum(transactions.filter(isExpensePaid), (t) => t.base_gross_amount);
  const expensesRegistered = sum(transactions.filter(isExpenseRegistered), (t) => t.base_gross_amount);
  const expensesProjected = sum(transactions.filter(isExpenseProjected), (t) => t.base_gross_amount);

  const profitActual = collected - expensesPaid;
  const profitAccounting = invoiced - expensesRegistered;

  const taxesCollected = sum(
    transactions.filter((t) => isIncomeCollected(t) && t.tax_amount > 0),
    (t) => t.tax_amount * t.exchange_rate
  );

  return {
    invoiced,
    collected,
    receivable,
    overdue,
    expensesPaid,
    expensesRegistered,
    expensesProjected,
    profitActual,
    profitAccounting,
    marginActual: collected > 0 ? (profitActual / collected) * 100 : null,
    collectedPct: invoiced > 0 ? (collected / invoiced) * 100 : null,
    contributions: sum(transactions.filter((t) => t.type === 'contribution' && !isCancelled(t)), (t) => t.base_amount),
    withdrawals: sum(transactions.filter((t) => t.type === 'withdrawal' && !isCancelled(t)), (t) => t.base_amount),
    reimbursements: sum(transactions.filter((t) => t.type === 'reimbursement' && !isCancelled(t)), (t) => t.base_amount),
    taxesCollected,
  };
}

// ── Proyectos ─────────────────────────────────────────────────
export interface ProjectStats extends Kpis {
  project: Project;
  contractValue: number;
  budget: number;
  pendingToInvoice: number;
  profitProjected: number | null;
  marginProjected: number | null;
  budgetExceeded: boolean;
  lowMargin: boolean;
  nextMilestone: MilestoneView | null;
  transactionCount: number;
  milestoneViews: MilestoneView[];
}

export function computeProjectStats(
  project: Project,
  transactions: Transaction[],
  milestoneViews: MilestoneView[],
  settings: Pick<AppSettings, 'min_margin'>,
  today = todayISO()
): ProjectStats {
  const tx = transactions.filter((t) => t.project_id === project.id);
  const mv = milestoneViews.filter((v) => v.milestone.project_id === project.id);
  const kpis = computeKpis(tx, mv);
  const contractValue = project.contract_value * project.exchange_rate;
  const budget = project.budget * project.exchange_rate;
  const profitProjected = contractValue > 0 ? contractValue - kpis.expensesProjected : null;
  const marginProjected = contractValue > 0 && profitProjected !== null ? (profitProjected / contractValue) * 100 : null;
  const target = project.target_margin > 0 ? project.target_margin : settings.min_margin;
  const lowMargin =
    !project.is_general &&
    ((kpis.marginActual !== null && kpis.marginActual < target) ||
      (marginProjected !== null && marginProjected < target));

  const pending = mv
    .filter((v) => v.status !== 'paid' && v.status !== 'cancelled')
    .sort((a, b) => {
      const da = a.milestone.due_date ?? a.milestone.scheduled_date ?? '9999';
      const db = b.milestone.due_date ?? b.milestone.scheduled_date ?? '9999';
      return da.localeCompare(db);
    });
  const upcoming = pending.find((v) => (v.milestone.due_date ?? v.milestone.scheduled_date ?? '') >= today);

  return {
    ...kpis,
    project,
    contractValue,
    budget,
    pendingToInvoice: Math.max(contractValue - kpis.invoiced, 0),
    profitProjected,
    marginProjected,
    budgetExceeded: budget > 0 && kpis.expensesRegistered > budget,
    lowMargin,
    nextMilestone: upcoming ?? pending[0] ?? null,
    transactionCount: tx.length,
    milestoneViews: mv,
  };
}

// ── Personas ──────────────────────────────────────────────────
export interface PersonSummary {
  person: Person;
  expensesPaidByPerson: number; // total que ha pagado de su bolsillo
  pendingReimbursement: number; // gastos aún reembolsables
  reimbursedExpenses: number; // gastos ya marcados como reembolsados
  reimbursementsReceived: number;
  contributions: number;
  withdrawals: number;
  pendingPayments: number; // pagos/comisiones pendientes a la persona
  paymentsReceived: number; // pagos hechos por Nexus a la persona
  balance: number; // > 0: Nexus le debe · < 0: la persona debe a Nexus
  projectIds: string[];
  transactionCount: number;
}

export function computePersonSummary(person: Person, transactions: Transaction[]): PersonSummary {
  const related = transactions.filter(
    (t) => !isCancelled(t) && (t.person_id === person.id || t.paid_by_person_id === person.id)
  );
  const ownPocket = related.filter((t) => t.type === 'expense' && t.paid_by_person_id === person.id);
  const pendingReimbursement = sum(ownPocket.filter((t) => t.status === 'reimbursable'), (t) => t.base_amount);
  const reimbursedExpenses = sum(ownPocket.filter((t) => t.status === 'reimbursed'), (t) => t.base_amount);
  const reimbursementsReceived = sum(related.filter((t) => t.type === 'reimbursement' && t.person_id === person.id), (t) => t.base_amount);
  const pendingPayments = sum(
    related.filter((t) => t.type === 'expense' && t.person_id === person.id && t.status === 'pending'),
    (t) => t.base_amount
  );
  const paymentsReceived = sum(
    related.filter((t) => t.type === 'expense' && t.person_id === person.id && t.status === 'paid'),
    (t) => t.base_amount
  );
  const unapplied = Math.max(reimbursementsReceived - reimbursedExpenses, 0);
  return {
    person,
    expensesPaidByPerson: pendingReimbursement + reimbursedExpenses,
    pendingReimbursement,
    reimbursedExpenses,
    reimbursementsReceived,
    contributions: sum(related.filter((t) => t.type === 'contribution' && t.person_id === person.id), (t) => t.base_amount),
    withdrawals: sum(related.filter((t) => t.type === 'withdrawal' && t.person_id === person.id), (t) => t.base_amount),
    pendingPayments,
    paymentsReceived,
    balance: pendingReimbursement + pendingPayments - unapplied,
    projectIds: Array.from(new Set(related.map((t) => t.project_id))),
    transactionCount: related.length,
  };
}

export function balanceLabel(balance: number): { text: string; tone: 'green' | 'yellow' | 'gray' } {
  if (balance > 0.5) return { text: 'Nexus le debe a esta persona', tone: 'yellow' };
  if (balance < -0.5) return { text: 'Esta persona le debe a Nexus', tone: 'green' };
  return { text: 'Saldo en cero', tone: 'gray' };
}

// ── Series mensuales ──────────────────────────────────────────
export interface MonthPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
  cashIn: number;
  cashOut: number;
  cashNet: number;
  cumulativeCash: number;
  invoiced: number;
}

export function monthlySeries(transactions: Transaction[], milestoneViews: MilestoneView[] = []): MonthPoint[] {
  const map = new Map<string, MonthPoint>();
  const get = (key: string) => {
    let p = map.get(key);
    if (!p) {
      p = { month: key, income: 0, expenses: 0, net: 0, cashIn: 0, cashOut: 0, cashNet: 0, cumulativeCash: 0, invoiced: 0 };
      map.set(key, p);
    }
    return p;
  };
  transactions.forEach((t) => {
    const p = get(monthKey(t.date));
    if (isIncomeCollected(t)) p.income += t.base_gross_amount;
    if (isExpensePaid(t)) p.expenses += t.base_gross_amount;
    cashEffect(t).forEach(({ delta }) => {
      if (delta >= 0) p.cashIn += delta;
      else p.cashOut += -delta;
    });
  });
  milestoneViews.forEach((v) => {
    if (v.milestone.status === 'invoiced') {
      const key = monthKey(v.milestone.invoiced_at ?? v.milestone.due_date ?? v.milestone.scheduled_date ?? v.milestone.created_at);
      get(key).invoiced += v.milestone.base_amount;
    }
  });
  const points = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  let cumulative = 0;
  points.forEach((p) => {
    p.net = p.income - p.expenses;
    p.cashNet = p.cashIn - p.cashOut;
    cumulative += p.cashNet;
    p.cumulativeCash = cumulative;
  });
  return points;
}

// ── Flujo de caja proyectado ──────────────────────────────────
export interface ProjectionPoint {
  month: string;
  isProjection: boolean;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
  actualNet: number | null;
}

export function projectedCashflow(
  transactions: Transaction[],
  milestoneViews: MilestoneView[],
  cashToday: number,
  monthsBack = 5,
  monthsAhead = 6,
  today = todayISO()
): ProjectionPoint[] {
  const current = currentMonthKey();
  const actual = monthlySeries(transactions);
  const points: ProjectionPoint[] = [];

  // Meses pasados: resultado real
  for (let i = monthsBack; i >= 1; i--) {
    const key = shiftMonth(current, -i);
    const a = actual.find((p) => p.month === key);
    points.push({
      month: key,
      isProjection: false,
      inflow: a?.cashIn ?? 0,
      outflow: a?.cashOut ?? 0,
      net: a?.cashNet ?? 0,
      balance: 0,
      actualNet: a?.cashNet ?? 0,
    });
  }

  // Meses futuros (incluido el actual): proyección
  const inflows = new Map<string, number>();
  const outflows = new Map<string, number>();
  const bucket = (dateISO: string | null) => {
    if (!dateISO) return current;
    const k = monthKey(dateISO);
    return k < current ? current : k;
  };
  milestoneViews
    .filter((v) => v.status !== 'paid' && v.status !== 'cancelled')
    .forEach((v) => {
      const k = bucket(v.milestone.due_date ?? v.milestone.scheduled_date);
      inflows.set(k, (inflows.get(k) ?? 0) + v.remaining * (v.milestone.probability / 100));
    });
  transactions
    .filter((t) => t.type === 'expense' && (t.status === 'pending' || t.status === 'budgeted'))
    .forEach((t) => {
      const k = bucket(t.date);
      outflows.set(k, (outflows.get(k) ?? 0) + t.base_amount);
    });
  // Gastos pendientes de reembolso a personas también son salidas próximas
  transactions
    .filter((t) => t.type === 'expense' && t.status === 'reimbursable')
    .forEach((t) => {
      outflows.set(current, (outflows.get(current) ?? 0) + t.base_amount);
    });

  const currentActual = actual.find((p) => p.month === current);
  let balance = cashToday;
  for (let i = 0; i < monthsAhead; i++) {
    const key = shiftMonth(current, i);
    const inflow = inflows.get(key) ?? 0;
    const outflow = outflows.get(key) ?? 0;
    balance += inflow - outflow;
    points.push({
      month: key,
      isProjection: true,
      inflow,
      outflow,
      net: inflow - outflow,
      balance,
      actualNet: i === 0 && currentActual ? currentActual.cashNet : null,
    });
  }

  // Balance histórico hacia atrás partiendo de la caja de hoy
  let back = cashToday - (currentActual?.cashNet ?? 0);
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (p.isProjection) continue;
    p.balance = back;
    back -= p.net;
  }
  void today;
  return points;
}

// ── Alertas ───────────────────────────────────────────────────
export interface Alert {
  id: string;
  level: 'red' | 'yellow' | 'blue';
  title: string;
  detail: string;
  link?: string;
}

export function computeAlerts(
  projectStats: ProjectStats[],
  milestoneViews: MilestoneView[],
  transactions: Transaction[],
  cashTotal: number,
  settings: Pick<AppSettings, 'due_soon_days' | 'cash_horizon_days' | 'min_margin'>,
  projectName: (id: string) => string,
  formatMoney: (n: number) => string,
  today = todayISO()
): Alert[] {
  const alerts: Alert[] = [];
  const soon = addDays(today, settings.due_soon_days);

  milestoneViews
    .filter((v) => v.status === 'overdue')
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .forEach((v) => {
      alerts.push({
        id: `overdue-${v.milestone.id}`,
        level: 'red',
        title: `Cobro vencido · ${projectName(v.milestone.project_id)}`,
        detail: `${v.milestone.concept}: ${formatMoney(v.remaining)} pendiente, ${v.daysOverdue} día${v.daysOverdue === 1 ? '' : 's'} de atraso.`,
        link: '/cobranzas',
      });
    });

  milestoneViews
    .filter((v) => (v.status === 'invoiced' || v.status === 'partial') && v.milestone.due_date && v.milestone.due_date >= today && v.milestone.due_date <= soon)
    .forEach((v) => {
      const days = daysBetween(today, v.milestone.due_date!);
      alerts.push({
        id: `due-${v.milestone.id}`,
        level: 'yellow',
        title: `Factura próxima a vencer · ${projectName(v.milestone.project_id)}`,
        detail: `${v.milestone.concept}: ${formatMoney(v.remaining)} vence ${days === 0 ? 'hoy' : `en ${days} día${days === 1 ? '' : 's'}`}.`,
        link: '/cobranzas',
      });
    });

  projectStats
    .filter((p) => p.budgetExceeded)
    .forEach((p) => {
      alerts.push({
        id: `budget-${p.project.id}`,
        level: 'red',
        title: `Presupuesto excedido · ${p.project.name}`,
        detail: `Costos registrados ${formatMoney(p.expensesRegistered)} frente a presupuesto ${formatMoney(p.budget)}.`,
        link: `/proyectos/${p.project.id}`,
      });
    });

  projectStats
    .filter((p) => p.lowMargin)
    .forEach((p) => {
      const target = p.project.target_margin > 0 ? p.project.target_margin : settings.min_margin;
      const m = p.marginActual ?? p.marginProjected;
      alerts.push({
        id: `margin-${p.project.id}`,
        level: 'yellow',
        title: `Margen bajo · ${p.project.name}`,
        detail: `Margen ${m !== null ? m.toFixed(1) : '—'} % por debajo del objetivo de ${target.toFixed(0)} %.`,
        link: `/proyectos/${p.project.id}`,
      });
    });

  const horizon = addDays(today, settings.cash_horizon_days);
  const commitments = transactions
    .filter((t) => t.type === 'expense' && (t.status === 'pending' || t.status === 'reimbursable') && t.date <= horizon)
    .reduce((s, t) => s + t.base_amount, 0);
  if (commitments > 0 && cashTotal < commitments) {
    alerts.push({
      id: 'cash-shortfall',
      level: 'red',
      title: 'Falta de caja para compromisos próximos',
      detail: `Compromisos de ${formatMoney(commitments)} en los próximos ${settings.cash_horizon_days} días frente a ${formatMoney(cashTotal)} disponibles.`,
      link: '/movimientos',
    });
  }

  const order = { red: 0, yellow: 1, blue: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

// ── Utilidades ────────────────────────────────────────────────
export function groupBy<T>(list: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  list.forEach((x) => {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  });
  return m;
}
