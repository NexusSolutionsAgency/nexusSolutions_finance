import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Account, Category, Client, Currency, PaymentMethod, Person } from '../types';

// Claves que dependen de los catálogos (para refrescar joins tras un cambio)
const DEPENDENT_KEYS = ['transactions', 'projects', 'milestones', 'profiles'];

interface CrudOptions<F> {
  table: string;
  queryKey: string;
  idField?: string;
  order: { column: string; ascending?: boolean }[];
  toPayload: (form: F) => Record<string, unknown>;
}

/**
 * Fábrica de hooks CRUD para tablas de catálogo simples.
 * Devuelve { useList, useCreate, useUpdate, useDelete }.
 */
function createCrudHooks<T, F>({ table, queryKey, idField = 'id', order, toPayload }: CrudOptions<F>) {
  const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
    qc.invalidateQueries({ queryKey: [queryKey] });
    DEPENDENT_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  function useList() {
    return useQuery<T[]>({
      queryKey: [queryKey],
      queryFn: async () => {
        let q = supabase.from(table).select('*');
        order.forEach((o) => {
          q = q.order(o.column, { ascending: o.ascending ?? true });
        });
        const { data, error } = await q;
        if (error) throw error;
        return data as T[];
      },
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (form: F) => {
        const { data, error } = await supabase.from(table).insert(toPayload(form)).select().single();
        if (error) throw error;
        return data as T;
      },
      onSuccess: () => invalidate(qc),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, data: form }: { id: string; data: F }) => {
        const { data, error } = await supabase.from(table).update(toPayload(form)).eq(idField, id).select().single();
        if (error) throw error;
        return data as T;
      },
      onSuccess: () => invalidate(qc),
    });
  }

  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq(idField, id);
        if (error) throw error;
      },
      onSuccess: () => invalidate(qc),
    });
  }

  return { useList, useCreate, useUpdate, useDelete };
}

const clean = (s: string) => s.trim() || null;

// ── Categorías ──
export interface CategoryFormData {
  name: string;
  type: Category['type'];
  active: boolean;
  sort_order: number;
}
const categories = createCrudHooks<Category, CategoryFormData>({
  table: 'categories',
  queryKey: 'categories',
  order: [{ column: 'type' }, { column: 'sort_order' }, { column: 'name' }],
  toPayload: (f) => ({ name: f.name.trim(), type: f.type, active: f.active, sort_order: f.sort_order }),
});
export const useCategories = categories.useList;
export const useCreateCategory = categories.useCreate;
export const useUpdateCategory = categories.useUpdate;
export const useDeleteCategory = categories.useDelete;

// ── Monedas ──
export interface CurrencyFormData {
  code: string;
  name: string;
  symbol: string;
  rate_to_base: number;
  decimals: number;
  active: boolean;
  sort_order: number;
}
const currencies = createCrudHooks<Currency, CurrencyFormData>({
  table: 'currencies',
  queryKey: 'currencies',
  idField: 'code',
  order: [{ column: 'sort_order' }, { column: 'code' }],
  toPayload: (f) => ({
    code: f.code.trim().toUpperCase(),
    name: f.name.trim(),
    symbol: f.symbol.trim(),
    rate_to_base: f.rate_to_base,
    decimals: f.decimals,
    active: f.active,
    sort_order: f.sort_order,
  }),
});
export const useCurrencies = currencies.useList;
export const useCreateCurrency = currencies.useCreate;
export const useUpdateCurrency = currencies.useUpdate;
export const useDeleteCurrency = currencies.useDelete;

// ── Cuentas ──
export interface AccountFormData {
  name: string;
  type: Account['type'];
  currency: string;
  initial_balance: number;
  active: boolean;
}
const accounts = createCrudHooks<Account, AccountFormData>({
  table: 'accounts',
  queryKey: 'accounts',
  order: [{ column: 'name' }],
  toPayload: (f) => ({
    name: f.name.trim(),
    type: f.type,
    currency: f.currency,
    initial_balance: f.initial_balance,
    active: f.active,
  }),
});
export const useAccounts = accounts.useList;
export const useCreateAccount = accounts.useCreate;
export const useUpdateAccount = accounts.useUpdate;
export const useDeleteAccount = accounts.useDelete;

// ── Métodos de pago ──
export interface PaymentMethodFormData {
  name: string;
  active: boolean;
  sort_order: number;
}
const paymentMethods = createCrudHooks<PaymentMethod, PaymentMethodFormData>({
  table: 'payment_methods',
  queryKey: 'payment_methods',
  order: [{ column: 'sort_order' }, { column: 'name' }],
  toPayload: (f) => ({ name: f.name.trim(), active: f.active, sort_order: f.sort_order }),
});
export const usePaymentMethods = paymentMethods.useList;
export const useCreatePaymentMethod = paymentMethods.useCreate;
export const useUpdatePaymentMethod = paymentMethods.useUpdate;
export const useDeletePaymentMethod = paymentMethods.useDelete;

// ── Clientes ──
export interface ClientFormData {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  tax_id: string;
  notes: string;
  active: boolean;
}
const clients = createCrudHooks<Client, ClientFormData>({
  table: 'clients',
  queryKey: 'clients',
  order: [{ column: 'name' }],
  toPayload: (f) => ({
    name: f.name.trim(),
    contact_name: clean(f.contact_name),
    email: clean(f.email),
    phone: clean(f.phone),
    tax_id: clean(f.tax_id),
    notes: clean(f.notes),
    active: f.active,
  }),
});
export const useClients = clients.useList;
export const useCreateClient = clients.useCreate;
export const useUpdateClient = clients.useUpdate;
export const useDeleteClient = clients.useDelete;

// ── Personas ──
export interface PersonFormData {
  name: string;
  type: Person['type'];
  email: string;
  phone: string;
  notes: string;
  active: boolean;
}
const people = createCrudHooks<Person, PersonFormData>({
  table: 'people',
  queryKey: 'people',
  order: [{ column: 'name' }],
  toPayload: (f) => ({
    name: f.name.trim(),
    type: f.type,
    email: clean(f.email),
    phone: clean(f.phone),
    notes: clean(f.notes),
    active: f.active,
  }),
});
export const usePeople = people.useList;
export const useCreatePerson = people.useCreate;
export const useUpdatePerson = people.useUpdate;
export const useDeletePerson = people.useDelete;
