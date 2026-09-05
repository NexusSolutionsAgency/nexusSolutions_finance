import { useState } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Account, Category, Client, Currency, PaymentMethod, Person, Transaction } from '../../types';
import {
  useAccounts,
  useCategories,
  useClients,
  useCreateAccount,
  useCreateCategory,
  useCreateClient,
  useCreateCurrency,
  useCreatePaymentMethod,
  useCreatePerson,
  useCurrencies,
  useDeleteAccount,
  useDeleteCategory,
  useDeleteClient,
  useDeleteCurrency,
  useDeletePaymentMethod,
  useDeletePerson,
  usePaymentMethods,
  usePeople,
  useUpdateAccount,
  useUpdateCategory,
  useUpdateClient,
  useUpdateCurrency,
  useUpdatePaymentMethod,
  useUpdatePerson,
  type AccountFormData,
  type CategoryFormData,
  type ClientFormData,
  type CurrencyFormData,
  type PaymentMethodFormData,
  type PersonFormData,
} from '../../hooks/useCatalogs';
import { accountTypeLabels, categoryTypeLabels, personTypeColors, personTypeLabels, SEM } from '../../lib/constants';
import { formatMoney, getBaseCurrency } from '../../lib/formatters';
import { btnPrimary, errorMessage, inputClass, selectClass } from '../../lib/ui';
import Modal, { ModalActions } from '../ui/Modal';
import Field, { Toggle } from '../ui/Field';
import ConfirmDialog from '../ui/ConfirmDialog';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

// ─────────────────────────────────────────────────────────────
// Motor genérico de catálogos: lista + formulario + borrado
// ─────────────────────────────────────────────────────────────
interface FieldDef<F> {
  key: keyof F;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'toggle';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  span2?: boolean;
  step?: string;
  disabledWhenEditing?: boolean;
}

interface CatalogProps<T, F> {
  title: string;
  description: string;
  addLabel: string;
  list: UseQueryResult<T[]>;
  create: UseMutationResult<T, Error, F>;
  update: UseMutationResult<T, Error, { id: string; data: F }>;
  remove: UseMutationResult<void, Error, string>;
  idOf: (item: T) => string;
  toForm: (item: T) => F;
  emptyForm: F;
  fields: FieldDef<F>[];
  renderRow: (item: T) => { primary: string; secondary?: string; badges?: React.ReactNode; inactive?: boolean };
  usage?: (item: T) => number;
  usageLabel?: string;
  protect?: (item: T) => string | null;
  canWrite: boolean;
}

function CatalogFormModal<T, F extends object>({ p, item, onClose }: { p: CatalogProps<T, F>; item: T | null; onClose: () => void }) {
  const [form, setForm] = useState<F>(() => (item ? p.toForm(item) : p.emptyForm));
  const saving = p.create.isPending || p.update.isPending;
  const setVal = (k: keyof F, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (item) {
        await p.update.mutateAsync({ id: p.idOf(item), data: form });
        toast.success('Actualizado');
      } else {
        await p.create.mutateAsync(form);
        toast.success('Creado. Ya está disponible en formularios y filtros.');
      }
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal open title={item ? `Editar · ${p.title}` : `Nuevo · ${p.title}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          {p.fields.map((f) => {
            const value = form[f.key];
            const disabled = !!item && !!f.disabledWhenEditing;
            const cls = f.span2 ? 'sm:col-span-2' : '';
            if (f.type === 'toggle') {
              return (
                <div key={String(f.key)} className={`${cls} pt-1`}>
                  <Toggle checked={!!value} onChange={(v) => setVal(f.key, v)} label={f.label} description={f.hint} />
                </div>
              );
            }
            return (
              <Field key={String(f.key)} label={f.label} required={f.required} hint={f.hint} className={cls}>
                {f.type === 'select' ? (
                  <select value={String(value ?? '')} onChange={(e) => setVal(f.key, e.target.value)} className={selectClass} disabled={disabled} required={f.required}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea value={String(value ?? '')} onChange={(e) => setVal(f.key, e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder={f.placeholder} />
                ) : f.type === 'number' ? (
                  <input
                    type="number"
                    step={f.step ?? 'any'}
                    value={value === 0 || value ? String(value) : ''}
                    onChange={(e) => setVal(f.key, parseFloat(e.target.value) || 0)}
                    className={inputClass}
                    required={f.required}
                    disabled={disabled}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(value ?? '')}
                    onChange={(e) => setVal(f.key, e.target.value)}
                    className={inputClass}
                    required={f.required}
                    disabled={disabled}
                    placeholder={f.placeholder}
                  />
                )}
              </Field>
            );
          })}
        </div>
        <ModalActions saving={saving} isEditing={!!item} onCancel={onClose} />
      </form>
    </Modal>
  );
}

function CatalogTab<T, F extends object>(p: CatalogProps<T, F>) {
  const [modal, setModal] = useState<{ open: boolean; item: T | null }>({ open: false, item: null });
  const [deleting, setDeleting] = useState<T | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await p.remove.mutateAsync(p.idOf(deleting));
      toast.success('Eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-nx-muted text-sm max-w-2xl">{p.description}</p>
        {p.canWrite && (
          <button onClick={() => setModal({ open: true, item: null })} className={btnPrimary}>
            <Plus size={15} /> {p.addLabel}
          </button>
        )}
      </div>

      {p.list.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {(p.list.data ?? []).map((item) => {
            const r = p.renderRow(item);
            const protectedMsg = p.protect?.(item) ?? null;
            const n = p.usage?.(item);
            return (
              <div key={p.idOf(item)} className={`bg-nx-card border border-nx-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 ${r.inactive ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-[10rem]">
                  <p className="text-nx-heading font-medium truncate">{r.primary}</p>
                  {r.secondary && <p className="text-nx-muted text-xs truncate">{r.secondary}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.badges}
                  {r.inactive && <Badge label="Inactivo" color={SEM.gray} />}
                  {n !== undefined && (
                    <span className="text-nx-muted text-xs hidden sm:inline">
                      {n} {p.usageLabel ?? 'mov.'}
                    </span>
                  )}
                </div>
                {p.canWrite && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal({ open: true, item })} className="p-2 rounded-lg text-nx-muted hover:text-nx-blue-light hover:bg-nx-surface" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => (protectedMsg ? toast.error(protectedMsg) : setDeleting(item))}
                      className={`p-2 rounded-lg text-nx-muted hover:bg-nx-surface ${protectedMsg ? 'opacity-40 cursor-not-allowed' : 'hover:text-nx-red'}`}
                      title={protectedMsg ?? 'Eliminar'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {(p.list.data ?? []).length === 0 && <p className="text-nx-muted text-sm text-center py-8">Aún no hay registros.</p>}
        </div>
      )}

      {modal.open && (
        <CatalogFormModal key={modal.item ? p.idOf(modal.item) : 'new'} p={p} item={modal.item} onClose={() => setModal({ open: false, item: null })} />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Eliminar ${p.title.toLowerCase()}`}
        message={
          deleting
            ? `¿Eliminar "${p.renderRow(deleting).primary}"?${
                p.usage && p.usage(deleting) > 0
                  ? `\n\n${p.usage(deleting)} registro(s) lo referencian: se conservarán pero quedarán sin este dato. Si solo dejó de usarse, márcalo como inactivo en lugar de eliminarlo.`
                  : ''
              }`
            : ''
        }
        loading={p.remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pestañas concretas
// ─────────────────────────────────────────────────────────────
interface TabProps {
  canWrite: boolean;
  transactions: Transaction[];
}

const countBy = (tx: Transaction[], pred: (t: Transaction) => boolean) => tx.filter(pred).length;

export function CategoriesTab({ canWrite, transactions }: TabProps) {
  return (
    <CatalogTab<Category, CategoryFormData>
      title="Categoría"
      description="Las categorías se ofrecen en el formulario de movimientos según su tipo. Puedes agregar, renombrar o desactivar sin tocar el código."
      addLabel="Agregar categoría"
      list={useCategories()}
      create={useCreateCategory()}
      update={useUpdateCategory()}
      remove={useDeleteCategory()}
      idOf={(c) => c.id}
      toForm={(c) => ({ name: c.name, type: c.type, active: c.active, sort_order: c.sort_order })}
      emptyForm={{ name: '', type: 'expense', active: true, sort_order: 0 }}
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true, span2: true, placeholder: 'p. ej. Pauta' },
        { key: 'type', label: 'Aplica a', type: 'select', options: [{ value: 'expense', label: 'Gastos' }, { value: 'income', label: 'Ingresos' }, { value: 'both', label: 'Ambos' }] },
        { key: 'sort_order', label: 'Orden', type: 'number', step: '1', hint: 'Menor número aparece primero' },
        { key: 'active', label: 'Activa', type: 'toggle', hint: 'Las inactivas no se ofrecen en formularios nuevos', span2: true },
      ]}
      renderRow={(c) => ({
        primary: c.name,
        badges: <Badge label={categoryTypeLabels[c.type]} color={c.type === 'income' ? SEM.green : c.type === 'expense' ? SEM.red : SEM.blue} />,
        inactive: !c.active,
      })}
      usage={(c) => countBy(transactions, (t) => t.category_id === c.id)}
      canWrite={canWrite}
    />
  );
}

export function CurrenciesTab({ canWrite, transactions }: TabProps) {
  const base = getBaseCurrency();
  return (
    <CatalogTab<Currency, CurrencyFormData>
      title="Moneda"
      description={`La moneda base es ${base}: todos los indicadores se muestran en ella. La tasa indica cuántos ${base} vale 1 unidad de la moneda y se propone por defecto al registrar movimientos (editable en cada uno).`}
      addLabel="Agregar moneda"
      list={useCurrencies()}
      create={useCreateCurrency()}
      update={useUpdateCurrency()}
      remove={useDeleteCurrency()}
      idOf={(c) => c.code}
      toForm={(c) => ({ code: c.code, name: c.name, symbol: c.symbol, rate_to_base: c.rate_to_base, decimals: c.decimals, active: c.active, sort_order: c.sort_order })}
      emptyForm={{ code: '', name: '', symbol: '', rate_to_base: 1, decimals: 2, active: true, sort_order: 10 }}
      fields={[
        { key: 'code', label: 'Código ISO', type: 'text', required: true, placeholder: 'USD', disabledWhenEditing: true },
        { key: 'symbol', label: 'Símbolo', type: 'text', required: true, placeholder: 'US$' },
        { key: 'name', label: 'Nombre', type: 'text', required: true, span2: true, placeholder: 'Dólar estadounidense' },
        { key: 'rate_to_base', label: `Tasa a ${base}`, type: 'number', required: true, hint: `1 unidad = ? ${base}` },
        { key: 'decimals', label: 'Decimales', type: 'number', step: '1' },
        { key: 'sort_order', label: 'Orden', type: 'number', step: '1' },
        { key: 'active', label: 'Activa', type: 'toggle', span2: true },
      ]}
      renderRow={(c) => ({
        primary: `${c.code} · ${c.name}`,
        secondary: c.is_base ? 'Moneda base' : `1 ${c.code} = ${formatMoney(c.rate_to_base)}`,
        badges: c.is_base ? <Badge label="Base" color={SEM.blue} /> : undefined,
        inactive: !c.active,
      })}
      usage={(c) => countBy(transactions, (t) => t.currency === c.code)}
      protect={(c) => (c.is_base ? 'La moneda base no se puede eliminar.' : null)}
      canWrite={canWrite}
    />
  );
}

export function AccountsTab({ canWrite, transactions }: TabProps) {
  const { data: currencies } = useCurrencies();
  return (
    <CatalogTab<Account, AccountFormData>
      title="Cuenta"
      description="Cuentas bancarias, caja menor y billeteras. El saldo disponible del resumen se calcula por cuenta a partir del saldo inicial y los movimientos."
      addLabel="Agregar cuenta"
      list={useAccounts()}
      create={useCreateAccount()}
      update={useUpdateAccount()}
      remove={useDeleteAccount()}
      idOf={(a) => a.id}
      toForm={(a) => ({ name: a.name, type: a.type, currency: a.currency, initial_balance: a.initial_balance, active: a.active })}
      emptyForm={{ name: '', type: 'bank', currency: getBaseCurrency(), initial_balance: 0, active: true }}
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true, span2: true, placeholder: 'p. ej. Bancolombia ahorros' },
        { key: 'type', label: 'Tipo', type: 'select', options: Object.entries(accountTypeLabels).map(([value, label]) => ({ value, label })) },
        { key: 'currency', label: 'Moneda', type: 'select', options: (currencies ?? []).map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })) },
        { key: 'initial_balance', label: 'Saldo inicial', type: 'number', hint: 'Saldo al momento de empezar a usar el sistema', span2: true },
        { key: 'active', label: 'Activa', type: 'toggle', span2: true },
      ]}
      renderRow={(a) => ({
        primary: a.name,
        secondary: `${accountTypeLabels[a.type]} · ${a.currency} · inicial ${formatMoney(a.initial_balance, a.currency)}`,
        inactive: !a.active,
      })}
      usage={(a) => countBy(transactions, (t) => t.account_id === a.id || t.to_account_id === a.id)}
      canWrite={canWrite}
    />
  );
}

export function PaymentMethodsTab({ canWrite, transactions }: TabProps) {
  return (
    <CatalogTab<PaymentMethod, PaymentMethodFormData>
      title="Método de pago"
      description="Medios por los que entra o sale el dinero (transferencia, Nequi, efectivo…)."
      addLabel="Agregar método"
      list={usePaymentMethods()}
      create={useCreatePaymentMethod()}
      update={useUpdatePaymentMethod()}
      remove={useDeletePaymentMethod()}
      idOf={(m) => m.id}
      toForm={(m) => ({ name: m.name, active: m.active, sort_order: m.sort_order })}
      emptyForm={{ name: '', active: true, sort_order: 10 }}
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true, span2: true },
        { key: 'sort_order', label: 'Orden', type: 'number', step: '1' },
        { key: 'active', label: 'Activo', type: 'toggle' },
      ]}
      renderRow={(m) => ({ primary: m.name, inactive: !m.active })}
      usage={(m) => countBy(transactions, (t) => t.payment_method_id === m.id)}
      canWrite={canWrite}
    />
  );
}

export function ClientsTab({ canWrite, transactions }: TabProps) {
  return (
    <CatalogTab<Client, ClientFormData>
      title="Cliente"
      description="Clientes a los que se factura. Se asocian a proyectos y a los ingresos."
      addLabel="Agregar cliente"
      list={useClients()}
      create={useCreateClient()}
      update={useUpdateClient()}
      remove={useDeleteClient()}
      idOf={(c) => c.id}
      toForm={(c) => ({ name: c.name, contact_name: c.contact_name ?? '', email: c.email ?? '', phone: c.phone ?? '', tax_id: c.tax_id ?? '', notes: c.notes ?? '', active: c.active })}
      emptyForm={{ name: '', contact_name: '', email: '', phone: '', tax_id: '', notes: '', active: true }}
      fields={[
        { key: 'name', label: 'Nombre / razón social', type: 'text', required: true, span2: true },
        { key: 'tax_id', label: 'NIT / identificación', type: 'text' },
        { key: 'contact_name', label: 'Persona de contacto', type: 'text' },
        { key: 'email', label: 'Correo', type: 'text' },
        { key: 'phone', label: 'Teléfono', type: 'text' },
        { key: 'notes', label: 'Notas', type: 'textarea', span2: true },
        { key: 'active', label: 'Activo', type: 'toggle', span2: true },
      ]}
      renderRow={(c) => ({
        primary: c.name,
        secondary: [c.contact_name, c.email, c.phone].filter(Boolean).join(' · ') || undefined,
        inactive: !c.active,
      })}
      usage={(c) => countBy(transactions, (t) => t.client_id === c.id)}
      canWrite={canWrite}
    />
  );
}

export function PeopleTab({ canWrite, transactions }: TabProps) {
  return (
    <CatalogTab<Person, PersonFormData>
      title="Persona"
      description="Socios, empleados, contratistas, proveedores, colaboradores e inversionistas. Aparecen en movimientos, equipos de proyecto y en la página Equipo."
      addLabel="Agregar persona"
      list={usePeople()}
      create={useCreatePerson()}
      update={useUpdatePerson()}
      remove={useDeletePerson()}
      idOf={(p) => p.id}
      toForm={(p) => ({ name: p.name, type: p.type, email: p.email ?? '', phone: p.phone ?? '', notes: p.notes ?? '', active: p.active })}
      emptyForm={{ name: '', type: 'collaborator', email: '', phone: '', notes: '', active: true }}
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true, span2: true },
        { key: 'type', label: 'Tipo', type: 'select', options: Object.entries(personTypeLabels).map(([value, label]) => ({ value, label })) },
        { key: 'phone', label: 'Teléfono', type: 'text' },
        { key: 'email', label: 'Correo', type: 'text', span2: true },
        { key: 'notes', label: 'Notas', type: 'textarea', span2: true },
        { key: 'active', label: 'Activa', type: 'toggle', span2: true },
      ]}
      renderRow={(p) => ({
        primary: p.name,
        secondary: [p.email, p.phone].filter(Boolean).join(' · ') || undefined,
        badges: <Badge label={personTypeLabels[p.type]} color={personTypeColors[p.type]} />,
        inactive: !p.active,
      })}
      usage={(p) => countBy(transactions, (t) => t.person_id === p.id || t.paid_by_person_id === p.id)}
      canWrite={canWrite}
    />
  );
}
