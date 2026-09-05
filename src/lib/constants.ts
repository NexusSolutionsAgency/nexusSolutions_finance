import type {
  AccountType,
  BillingModel,
  CategoryType,
  MilestoneEffectiveStatus,
  MilestoneKind,
  PersonType,
  ProjectStatus,
  Role,
  TransactionStatus,
  TransactionType,
} from '../types';

// ── Semáforo (colores semánticos, exclusivos para estados financieros) ──
export const SEM = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#64748b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  gold: '#f59e0b',
  muted: '#94a3b8',
} as const;

// ── Tipos de movimiento ──
export const transactionTypeLabels: Record<TransactionType, string> = {
  income: 'Ingreso cobrado',
  expense: 'Gasto',
  reimbursement: 'Reembolso',
  contribution: 'Aporte de socio',
  withdrawal: 'Retiro de socio',
  transfer: 'Transferencia',
  adjustment: 'Ajuste contable',
};

export const transactionTypeShort: Record<TransactionType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  reimbursement: 'Reembolso',
  contribution: 'Aporte',
  withdrawal: 'Retiro',
  transfer: 'Transferencia',
  adjustment: 'Ajuste',
};

export const transactionTypeColors: Record<TransactionType, string> = {
  income: SEM.green,
  expense: SEM.red,
  reimbursement: SEM.cyan,
  contribution: SEM.purple,
  withdrawal: SEM.gold,
  transfer: SEM.blue,
  adjustment: SEM.muted,
};

export const transactionTypeHelp: Record<TransactionType, string> = {
  income: 'Dinero recibido de un cliente. Suma a caja y a la utilidad.',
  expense: 'Costo del negocio o del proyecto. Resta utilidad; resta caja solo si lo pagó Nexus.',
  reimbursement: 'Nexus devuelve a una persona un gasto que pagó de su bolsillo. Solo caja.',
  contribution: 'Un socio inyecta dinero. Solo caja, no es ingreso.',
  withdrawal: 'Un socio retira dinero. Solo caja, no es gasto.',
  transfer: 'Mueve dinero entre cuentas de Nexus. No cambia el total de caja.',
  adjustment: 'Corrección manual del saldo de una cuenta.',
};

// ── Estados ──
export const transactionStatusLabels: Record<TransactionStatus, string> = {
  done: 'Realizado',
  collected: 'Cobrado',
  budgeted: 'Presupuestado',
  pending: 'Pendiente',
  paid: 'Pagado',
  reimbursable: 'Reembolsable',
  reimbursed: 'Reembolsado',
  cancelled: 'Cancelado',
};

export const transactionStatusColors: Record<TransactionStatus, string> = {
  done: SEM.green,
  collected: SEM.green,
  budgeted: SEM.blue,
  pending: SEM.yellow,
  paid: SEM.green,
  reimbursable: SEM.yellow,
  reimbursed: SEM.green,
  cancelled: SEM.gray,
};

/** Estados permitidos según el tipo de movimiento y quién pagó */
export function allowedStatuses(type: TransactionType, payerKind: 'company' | 'person'): TransactionStatus[] {
  if (type === 'income') return ['collected', 'cancelled'];
  if (type === 'expense') {
    if (payerKind === 'person') return ['reimbursable', 'reimbursed', 'cancelled'];
    return ['paid', 'pending', 'budgeted', 'cancelled'];
  }
  return ['done', 'cancelled'];
}

// ── Hitos / cobros ──
export const milestoneKindLabels: Record<MilestoneKind, string> = {
  advance: 'Anticipo',
  start: 'Inicio',
  delivery: 'Entrega',
  approval: 'Aprobación',
  monthly: 'Mensualidad',
  commission: 'Comisión',
  renewal: 'Renovación',
  final: 'Pago final',
  other: 'Otro',
};

export const milestoneStatusLabels: Record<MilestoneEffectiveStatus, string> = {
  scheduled: 'Programado',
  invoiced: 'Facturado',
  partial: 'Pago parcial',
  paid: 'Cobrado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

export const milestoneStatusColors: Record<MilestoneEffectiveStatus, string> = {
  scheduled: SEM.blue,
  invoiced: SEM.yellow,
  partial: SEM.yellow,
  paid: SEM.green,
  overdue: SEM.red,
  cancelled: SEM.gray,
};

// ── Personas ──
export const personTypeLabels: Record<PersonType, string> = {
  partner: 'Socio',
  employee: 'Empleado',
  contractor: 'Contratista / Freelancer',
  supplier: 'Proveedor',
  collaborator: 'Colaborador',
  investor: 'Inversionista',
};

export const personTypeColors: Record<PersonType, string> = {
  partner: SEM.blue,
  employee: SEM.cyan,
  contractor: SEM.purple,
  supplier: SEM.gold,
  collaborator: SEM.green,
  investor: SEM.yellow,
};

// ── Proyectos ──
export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Finalizado',
  archived: 'Archivado',
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  active: SEM.green,
  paused: SEM.yellow,
  completed: SEM.blue,
  archived: SEM.gray,
};

export const billingModelLabels: Record<BillingModel, string> = {
  single: 'Pago único',
  advance_final: 'Anticipo y pago final',
  deliverables: 'Cobro por entregables',
  monthly: 'Mensualidad',
  commission: 'Comisión',
  mixed: 'Mixto',
  custom: 'Personalizado',
};

// ── Cuentas ──
export const accountTypeLabels: Record<AccountType, string> = {
  bank: 'Cuenta bancaria',
  cash: 'Efectivo / Caja',
  wallet: 'Billetera digital',
  card: 'Tarjeta',
  other: 'Otra',
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  both: 'Ambos',
};

// ── Roles ──
export const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  finance: 'Finanzas',
  project_lead: 'Líder de proyecto',
  collaborator: 'Colaborador',
  viewer: 'Solo lectura',
};

export const roleHelp: Record<Role, string> = {
  admin: 'Acceso completo, incluida la configuración y los miembros.',
  finance: 'Movimientos, cobranzas, proyectos y reportes. No administra usuarios ni configuración avanzada.',
  project_lead: 'Solo ve y edita los proyectos donde es líder o miembro.',
  collaborator: 'Registra gastos en sus proyectos y consulta lo que registró.',
  viewer: 'Consulta toda la información sin poder modificarla.',
};

// Paleta para gráficas categóricas
export const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#eab308',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

export const GENERAL_PROJECT_NAME = 'General / Administración';
