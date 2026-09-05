// ─────────────────────────────────────────────────────────────
// Tipos del dominio · Nexus Finance
// ─────────────────────────────────────────────────────────────

export type Role = 'admin' | 'finance' | 'project_lead' | 'collaborator' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  person_id: string | null;
  created_at: string;
  updated_at: string;
  person?: Person | null;
}

export type PersonType = 'partner' | 'employee' | 'contractor' | 'supplier' | 'collaborator' | 'investor';

export interface Person {
  id: string;
  name: string;
  type: PersonType;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate_to_base: number;
  decimals: number;
  is_base: boolean;
  active: boolean;
  sort_order: number;
}

export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  active: boolean;
  sort_order: number;
}

export type AccountType = 'bank' | 'cash' | 'wallet' | 'card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  active: boolean;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type BillingModel = 'single' | 'advance_final' | 'deliverables' | 'monthly' | 'commission' | 'mixed' | 'custom';

export interface Project {
  id: string;
  name: string;
  client_id: string | null;
  lead_person_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  contract_value: number;
  budget: number;
  currency: string;
  exchange_rate: number;
  billing_model: BillingModel;
  target_margin: number;
  notes: string | null;
  is_general: boolean;
  created_at: string;
  updated_at: string;
  // joins
  client?: Client | null;
  lead?: Person | null;
  members?: { person_id: string; person?: Person | null }[];
}

export interface ProjectFormData {
  name: string;
  client_id: string;
  lead_person_id: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  contract_value: number;
  budget: number;
  currency: string;
  exchange_rate: number;
  billing_model: BillingModel;
  target_margin: number;
  notes: string;
  member_ids: string[];
}

export type MilestoneKind =
  | 'advance'
  | 'start'
  | 'delivery'
  | 'approval'
  | 'monthly'
  | 'commission'
  | 'renewal'
  | 'final'
  | 'other';

export type MilestoneStatus = 'scheduled' | 'invoiced' | 'cancelled';

/** Estado calculado del hito, que es lo que ve el usuario */
export type MilestoneEffectiveStatus = 'scheduled' | 'invoiced' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface Milestone {
  id: string;
  project_id: string;
  concept: string;
  kind: MilestoneKind;
  percentage: number | null;
  currency: string;
  amount: number;
  exchange_rate: number;
  base_amount: number;
  scheduled_date: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  invoice_number: string | null;
  invoiced_at: string | null;
  responsible_person_id: string | null;
  probability: number;
  last_contact_date: string | null;
  next_action: string | null;
  notes: string | null;
  attachment_path: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joins
  project?: Project | null;
  responsible?: Person | null;
}

export interface MilestoneFormData {
  project_id: string;
  concept: string;
  kind: MilestoneKind;
  percentage: number;
  currency: string;
  amount: number;
  exchange_rate: number;
  scheduled_date: string;
  due_date: string;
  status: MilestoneStatus;
  invoice_number: string;
  invoiced_at: string;
  responsible_person_id: string;
  probability: number;
  last_contact_date: string;
  next_action: string;
  notes: string;
  attachment_path: string;
}

export type TransactionType =
  | 'income'
  | 'expense'
  | 'reimbursement'
  | 'contribution'
  | 'withdrawal'
  | 'transfer'
  | 'adjustment';

export type TransactionStatus =
  | 'done'
  | 'collected'
  | 'budgeted'
  | 'pending'
  | 'paid'
  | 'reimbursable'
  | 'reimbursed'
  | 'cancelled';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  notes: string | null;
  project_id: string;
  category_id: string | null;
  client_id: string | null;
  person_id: string | null;
  paid_by_person_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
  payment_method_id: string | null;
  milestone_id: string | null;
  currency: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  exchange_rate: number;
  base_amount: number;
  base_gross_amount: number;
  direction: 'in' | 'out' | null;
  invoice_number: string | null;
  attachment_path: string | null;
  split_group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joins
  project?: Project | null;
  category?: Category | null;
  client?: Client | null;
  person?: Person | null;
  paid_by?: Person | null;
  account?: Account | null;
  to_account?: Account | null;
  payment_method?: PaymentMethod | null;
  milestone?: Milestone | null;
}

export interface TransactionFormData {
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  notes: string;
  project_id: string;
  /** Selección múltiple de proyectos para gastos compartidos */
  project_ids: string[];
  project_percentages: Record<string, number>;
  category_id: string;
  client_id: string;
  person_id: string;
  paid_by_person_id: string;
  /** 'company' = pagado desde una cuenta de Nexus · 'person' = pagado por una persona */
  payer_kind: 'company' | 'person';
  account_id: string;
  to_account_id: string;
  payment_method_id: string;
  milestone_id: string;
  currency: string;
  amount: number;
  tax_amount: number;
  exchange_rate: number;
  direction: 'in' | 'out';
  invoice_number: string;
  attachment_path: string;
  /** Al registrar un reembolso: marcar gastos reembolsables de la persona como reembolsados */
  mark_reimbursed: boolean;
}

export interface TransactionFilters {
  type: TransactionType | '';
  status: string;
  project_id: string;
  category_id: string;
  person_id: string;
  client_id: string;
  account_id: string;
  date_from: string;
  date_to: string;
  search: string;
}

export const emptyTransactionFilters: TransactionFilters = {
  type: '',
  status: '',
  project_id: '',
  category_id: '',
  person_id: '',
  client_id: '',
  account_id: '',
  date_from: '',
  date_to: '',
  search: '',
};

export interface AppSettings {
  id: number;
  company_name: string;
  tax_id: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  base_currency: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_tax_rate: number;
  min_margin: number;
  due_soon_days: number;
  cash_horizon_days: number;
  updated_at: string;
}

export interface AuditEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}
