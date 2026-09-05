import { useMemo, useState } from 'react';
import { Check, Info } from 'lucide-react';
import type { Transaction, TransactionFormData, TransactionType } from '../../types';
import { useProjects } from '../../hooks/useProjects';
import { useAccounts, useCategories, useClients, useCurrencies, usePaymentMethods, usePeople } from '../../hooks/useCatalogs';
import { useTransactions } from '../../hooks/useTransactions';
import { allowedStatuses, transactionStatusLabels, transactionTypeHelp, transactionTypeLabels, milestoneStatusLabels } from '../../lib/constants';
import { formatMoney, getBaseCurrency, round2 } from '../../lib/formatters';
import { computePersonSummary, type MilestoneView } from '../../lib/finance';
import { emptyTransactionForm } from '../../lib/forms';
import { inputClass, selectClass } from '../../lib/ui';
import Modal, { ModalActions } from '../ui/Modal';
import Field, { Toggle } from '../ui/Field';
import AttachmentField from '../ui/AttachmentField';

interface Props {
  open: boolean;
  transaction?: Transaction | null;
  initial?: Partial<TransactionFormData>;
  milestoneViews?: MilestoneView[];
  saving?: boolean;
  onSubmit: (data: TransactionFormData) => void;
  onClose: () => void;
  /** Restringe los proyectos seleccionables (líderes y colaboradores) */
  allowedProjectIds?: string[] | null;
  /** Solo puede registrar gastos (colaboradores) */
  expenseOnly?: boolean;
}

function equalSplit(ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};
  const pct = round2(100 / ids.length);
  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    out[id] = i === ids.length - 1 ? round2(100 - pct * (ids.length - 1)) : pct;
  });
  return out;
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-nx-muted/80 sm:col-span-2 pt-1';

export default function TransactionModal(props: Props) {
  if (!props.open) return null;
  // La clave reinicia el formulario cada vez que se abre con otro movimiento o prellenado
  const key = props.transaction?.id ?? (props.initial ? JSON.stringify(props.initial) : 'new');
  return <TransactionModalForm key={key} {...props} />;
}

function TransactionModalForm({
  open,
  transaction,
  initial,
  milestoneViews = [],
  saving,
  onSubmit,
  onClose,
  allowedProjectIds,
  expenseOnly,
}: Props) {
  const base = getBaseCurrency();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: people } = usePeople();
  const { data: clients } = useClients();
  const { data: accounts } = useAccounts();
  const { data: currencies } = useCurrencies();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: allTransactions } = useTransactions();

  const isEditing = !!transaction;
  const generalProject = projects?.find((p) => p.is_general);

  const [form, setForm] = useState<TransactionFormData>(() => {
    if (transaction) {
      return {
        date: transaction.date,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        notes: transaction.notes ?? '',
        project_id: transaction.project_id,
        project_ids: [transaction.project_id],
        project_percentages: {},
        category_id: transaction.category_id ?? '',
        client_id: transaction.client_id ?? '',
        person_id: transaction.person_id ?? '',
        paid_by_person_id: transaction.paid_by_person_id ?? '',
        payer_kind: transaction.paid_by_person_id ? 'person' : 'company',
        account_id: transaction.account_id ?? '',
        to_account_id: transaction.to_account_id ?? '',
        payment_method_id: transaction.payment_method_id ?? '',
        milestone_id: transaction.milestone_id ?? '',
        currency: transaction.currency,
        amount: transaction.amount,
        tax_amount: transaction.tax_amount,
        exchange_rate: transaction.exchange_rate,
        direction: transaction.direction ?? 'in',
        invoice_number: transaction.invoice_number ?? '',
        attachment_path: transaction.attachment_path ?? '',
        mark_reimbursed: false,
      };
    }
    const defaultProject = initial?.project_id || (allowedProjectIds?.[0] ?? generalProject?.id ?? '');
    const firstAccount = accounts?.find((a) => a.active)?.id ?? '';
    const type: TransactionType = initial?.type ?? 'expense';
    const f: TransactionFormData = {
      ...emptyTransactionForm(base),
      project_id: defaultProject,
      project_ids: defaultProject ? [defaultProject] : [],
      account_id: firstAccount,
      ...initial,
      type,
      status: initial?.status ?? allowedStatuses(type, 'company')[0],
    };
    if (f.currency !== base) {
      f.exchange_rate = initial?.exchange_rate ?? currencies?.find((c) => c.code === f.currency)?.rate_to_base ?? 1;
    }
    return f;
  });

  const update = <K extends keyof TransactionFormData>(key: K, value: TransactionFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setType = (type: TransactionType) => {
    setForm((f) => {
      const payer = type === 'expense' ? f.payer_kind : 'company';
      const statuses = allowedStatuses(type, payer);
      return {
        ...f,
        type,
        status: statuses.includes(f.status) ? f.status : statuses[0],
        project_ids: type === 'expense' ? f.project_ids : f.project_id ? [f.project_id] : [],
        milestone_id: type === 'income' ? f.milestone_id : '',
      };
    });
  };

  const setPayerKind = (kind: 'company' | 'person') => {
    setForm((f) => {
      const statuses = allowedStatuses(f.type, kind);
      return { ...f, payer_kind: kind, status: statuses.includes(f.status) ? f.status : statuses[0] };
    });
  };

  const setCurrency = (code: string) => {
    const rate = code === base ? 1 : currencies?.find((c) => c.code === code)?.rate_to_base ?? 1;
    setForm((f) => ({ ...f, currency: code, exchange_rate: rate }));
  };

  const toggleProject = (id: string) => {
    setForm((f) => {
      const ids = f.project_ids.includes(id) ? f.project_ids.filter((x) => x !== id) : [...f.project_ids, id];
      return { ...f, project_ids: ids, project_id: ids[0] ?? '', project_percentages: equalSplit(ids) };
    });
  };

  const setSingleProject = (id: string) => {
    setForm((f) => ({ ...f, project_id: id, project_ids: id ? [id] : [], project_percentages: {}, milestone_id: '' }));
  };

  const selectMilestone = (id: string) => {
    const mv = milestoneViews.find((v) => v.milestone.id === id);
    setForm((f) => {
      if (!mv) return { ...f, milestone_id: '' };
      const rate = f.exchange_rate || 1;
      const remainingInCurrency = round2(mv.remaining / rate);
      const project = projects?.find((p) => p.id === mv.milestone.project_id);
      return {
        ...f,
        milestone_id: id,
        amount: f.amount > 0 ? f.amount : remainingInCurrency,
        client_id: f.client_id || project?.client_id || '',
        invoice_number: f.invoice_number || mv.milestone.invoice_number || '',
        description: f.description || `Cobro: ${mv.milestone.concept}`,
      };
    });
  };

  // ── Derivados ──
  const t = form.type;
  const isExpense = t === 'expense';
  const isIncome = t === 'income';
  const needsPerson = t === 'reimbursement' || t === 'contribution' || t === 'withdrawal';
  const needsAccount = !(isExpense && form.payer_kind === 'person');
  const projectList = (projects ?? []).filter(
    (p) => (p.status === 'active' || p.status === 'paused' || p.id === form.project_id) && (!allowedProjectIds || allowedProjectIds.includes(p.id))
  );
  const activePeople = (people ?? []).filter((p) => p.active || p.id === form.person_id || p.id === form.paid_by_person_id);
  const activeAccounts = (accounts ?? []).filter((a) => a.active || a.id === form.account_id || a.id === form.to_account_id);
  const filteredCategories = (categories ?? []).filter(
    (c) => (c.active || c.id === form.category_id) && (c.type === 'both' || (isIncome ? c.type === 'income' : c.type === 'expense'))
  );
  const projectMilestones = milestoneViews.filter(
    (v) =>
      v.milestone.project_id === form.project_id &&
      ((v.status !== 'paid' && v.status !== 'cancelled') || v.milestone.id === form.milestone_id)
  );
  const net = round2(form.amount + form.tax_amount);
  const baseNet = round2(net * (form.exchange_rate || 1));
  const splitActive = !isEditing && isExpense && form.project_ids.length > 1;
  const pctTotal = Object.values(form.project_percentages).reduce((s, v) => s + v, 0);
  const pctOk = !splitActive || Math.abs(pctTotal - 100) <= 0.05;

  const personPending = useMemo(() => {
    if (t !== 'reimbursement' || !form.person_id || !allTransactions) return 0;
    const person = people?.find((p) => p.id === form.person_id);
    if (!person) return 0;
    return computePersonSummary(person, allTransactions).pendingReimbursement;
  }, [t, form.person_id, allTransactions, people]);

  const validation = (() => {
    if (!form.description.trim()) return 'Escribe una descripción.';
    if (!(form.amount > 0)) return 'El valor debe ser mayor a cero.';
    if (!form.project_id) return 'Selecciona un proyecto.';
    if (!pctOk) return `Los porcentajes suman ${pctTotal.toFixed(2)} % y deben sumar 100 %.`;
    if (isExpense && form.payer_kind === 'person' && !form.paid_by_person_id) return 'Indica quién pagó el gasto.';
    if (needsPerson && !form.person_id) return 'Selecciona la persona.';
    if (t === 'transfer') {
      if (!form.account_id || !form.to_account_id) return 'Selecciona cuenta de origen y destino.';
      if (form.account_id === form.to_account_id) return 'Las cuentas de origen y destino deben ser distintas.';
    }
    if (t === 'adjustment' && !form.account_id) return 'Selecciona la cuenta a ajustar.';
    return null;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation) return;
    onSubmit(form);
  };

  const personLabel = isIncome
    ? 'Responsable'
    : isExpense
      ? 'Proveedor / beneficiario'
      : t === 'reimbursement'
        ? 'Persona a reembolsar'
        : t === 'contribution'
          ? 'Socio que aporta'
          : 'Socio que retira';

  const typeOptions = (Object.keys(transactionTypeLabels) as TransactionType[]).filter((k) => !expenseOnly || k === 'expense');

  return (
    <Modal open={open} title={isEditing ? 'Editar movimiento' : 'Nuevo movimiento'} subtitle={transactionTypeHelp[t]} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <p className={sectionTitle}>Identificación</p>

          <Field label="Tipo" required>
            <select value={t} onChange={(e) => setType(e.target.value as TransactionType)} className={selectClass} disabled={isEditing && t === 'transfer'}>
              {typeOptions.map((k) => (
                <option key={k} value={k}>
                  {transactionTypeLabels[k]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha" required>
            <input type="date" required value={form.date} onChange={(e) => update('date', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Descripción" required className="sm:col-span-2">
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className={inputClass}
              placeholder={isIncome ? 'p. ej. Anticipo campaña de lanzamiento' : 'p. ej. Pauta Meta Ads septiembre'}
            />
          </Field>

          {/* Proyecto: selección múltiple para gastos nuevos */}
          {!isEditing && isExpense ? (
            <div className="sm:col-span-2">
              <Field label="Proyecto(s)" required hint="Selecciona varios para repartir un gasto compartido.">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {projectList.map((p) => {
                    const sel = form.project_ids.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProject(p.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                          sel ? 'border-nx-blue bg-nx-blue/10 text-nx-blue-light' : 'border-nx-border-light bg-nx-surface text-nx-text hover:border-nx-muted'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-nx-blue border-nx-blue' : 'border-nx-muted'}`}>
                          {sel && <Check size={12} className="text-white" />}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              {splitActive && (
                <div className="mt-2 bg-nx-surface/60 border border-nx-border rounded-lg p-3">
                  <p className="text-nx-muted text-xs mb-2 font-medium">Reparto del gasto entre proyectos</p>
                  <div className="space-y-1.5">
                    {form.project_ids.map((id) => {
                      const p = projects?.find((x) => x.id === id);
                      const pct = form.project_percentages[id] ?? 0;
                      return (
                        <div key={id} className="flex items-center gap-2 text-sm">
                          <span className="text-nx-text flex-1 truncate">{p?.name}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={pct}
                            onChange={(e) =>
                              update('project_percentages', { ...form.project_percentages, [id]: parseFloat(e.target.value) || 0 })
                            }
                            className={`${inputClass} w-24 text-right`}
                          />
                          <span className="text-nx-muted text-xs w-4">%</span>
                          <span className="text-nx-blue-light text-xs w-28 text-right">{formatMoney(round2((baseNet * pct) / 100))}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className={`text-xs mt-2 ${pctOk ? 'text-nx-green' : 'text-nx-red'}`}>
                    Total {pctTotal.toFixed(2)} % {pctOk ? '✓' : '— debe sumar 100 %'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Field label="Proyecto" required className={isIncome ? '' : 'sm:col-span-2'}>
              <select required value={form.project_id} onChange={(e) => setSingleProject(e.target.value)} className={selectClass}>
                <option value="">Selecciona…</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isIncome && (
            <Field label="Hito / factura del plan de cobros" hint="Vincula el cobro a un hito para actualizar la cartera.">
              <select value={form.milestone_id} onChange={(e) => selectMilestone(e.target.value)} className={selectClass}>
                <option value="">Sin hito (ingreso directo)</option>
                {projectMilestones.map((v) => (
                  <option key={v.milestone.id} value={v.milestone.id}>
                    {v.milestone.concept} · {formatMoney(v.remaining)} pendiente · {milestoneStatusLabels[v.status]}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Tercero */}
          {t !== 'transfer' && t !== 'adjustment' && (
            <>
              <p className={sectionTitle}>Tercero</p>
              {isIncome && (
                <Field label="Cliente">
                  <select value={form.client_id} onChange={(e) => update('client_id', e.target.value)} className={selectClass}>
                    <option value="">Sin cliente</option>
                    {clients?.filter((c) => c.active || c.id === form.client_id).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={personLabel} required={needsPerson}>
                <select value={form.person_id} onChange={(e) => update('person_id', e.target.value)} className={selectClass} required={needsPerson}>
                  <option value="">{needsPerson ? 'Selecciona…' : 'No aplica'}</option>
                  {activePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              {t === 'reimbursement' && form.person_id && (
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3 bg-nx-surface/60 border border-nx-border rounded-lg p-3 text-xs">
                  <Info size={14} className="text-nx-blue-light shrink-0" />
                  <span className="text-nx-muted">
                    Pendiente de reembolso a esta persona: <span className="text-nx-heading font-semibold">{formatMoney(personPending)}</span>
                  </span>
                  {personPending > 0 && form.currency === base && (
                    <button type="button" onClick={() => update('amount', personPending)} className="text-nx-blue-light hover:underline">
                      Usar este valor
                    </button>
                  )}
                  <div className="w-full">
                    <Toggle
                      checked={form.mark_reimbursed}
                      onChange={(v) => update('mark_reimbursed', v)}
                      label="Marcar sus gastos reembolsables como reembolsados"
                      description="Evita duplicar el gasto: el proyecto ya lo tiene registrado."
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Dinero */}
          <p className={sectionTitle}>Dinero</p>
          <Field label="Valor bruto" required>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount || ''}
              onChange={(e) => update('amount', parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="0"
            />
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
          {form.currency !== base && (
            <Field label={`Tasa (1 ${form.currency} = ? ${base})`} required>
              <input
                type="number"
                required
                min="0.000001"
                step="0.000001"
                value={form.exchange_rate || ''}
                onChange={(e) => update('exchange_rate', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </Field>
          )}
          {(isIncome || isExpense) && (
            <Field label="Impuestos / retenciones" hint="IVA en positivo, retenciones en negativo. El neto es lo que realmente entra o sale de caja.">
              <input
                type="number"
                step="0.01"
                value={form.tax_amount || ''}
                onChange={(e) => update('tax_amount', parseFloat(e.target.value) || 0)}
                className={inputClass}
                placeholder="0"
              />
            </Field>
          )}
          <div className={`sm:col-span-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-nx-muted bg-nx-surface/60 border border-nx-border rounded-lg px-3 py-2`}>
            <span>
              Neto: <span className="text-nx-heading font-semibold">{formatMoney(net, form.currency)}</span>
            </span>
            {form.currency !== base && (
              <span>
                Equivale a <span className="text-nx-blue-light font-semibold">{formatMoney(baseNet)}</span>
              </span>
            )}
            {form.tax_amount !== 0 && (
              <span>
                Bruto (utilidad): <span className="text-nx-heading font-semibold">{formatMoney(round2(form.amount * (form.exchange_rate || 1)))}</span>
              </span>
            )}
          </div>

          {/* Trazabilidad */}
          <p className={sectionTitle}>Trazabilidad</p>

          {isExpense && (
            <Field label="¿Quién pagó?" className="sm:col-span-2">
              <div className="flex gap-2">
                {(['company', 'person'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPayerKind(k)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      form.payer_kind === k ? 'border-nx-blue bg-nx-blue/10 text-nx-blue-light' : 'border-nx-border-light bg-nx-surface text-nx-muted hover:text-nx-heading'
                    }`}
                  >
                    {k === 'company' ? 'Nexus (desde una cuenta)' : 'Una persona (de su bolsillo)'}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {isExpense && form.payer_kind === 'person' && (
            <Field label="Pagado por" required hint="Queda como saldo pendiente de reembolso con la persona.">
              <select required value={form.paid_by_person_id} onChange={(e) => update('paid_by_person_id', e.target.value)} className={selectClass}>
                <option value="">Selecciona…</option>
                {activePeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {needsAccount && (
            <Field label={t === 'transfer' ? 'Cuenta origen' : 'Cuenta'} required={t === 'transfer' || t === 'adjustment'}>
              <select value={form.account_id} onChange={(e) => update('account_id', e.target.value)} className={selectClass}>
                <option value="">Sin cuenta</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </Field>
          )}

          {t === 'transfer' && (
            <Field label="Cuenta destino" required>
              <select required value={form.to_account_id} onChange={(e) => update('to_account_id', e.target.value)} className={selectClass}>
                <option value="">Selecciona…</option>
                {activeAccounts
                  .filter((a) => a.id !== form.account_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
              </select>
            </Field>
          )}

          {t === 'adjustment' && (
            <Field label="Dirección del ajuste" required>
              <select value={form.direction} onChange={(e) => update('direction', e.target.value as 'in' | 'out')} className={selectClass}>
                <option value="in">Suma a la cuenta (+)</option>
                <option value="out">Resta de la cuenta (−)</option>
              </select>
            </Field>
          )}

          <Field label="Estado" required>
            <select value={form.status} onChange={(e) => update('status', e.target.value as TransactionFormData['status'])} className={selectClass}>
              {allowedStatuses(t, form.payer_kind).map((s) => (
                <option key={s} value={s}>
                  {transactionStatusLabels[s]}
                </option>
              ))}
            </select>
          </Field>

          {(isIncome || isExpense) && (
            <Field label="Categoría">
              <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className={selectClass}>
                <option value="">Sin categoría</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Medio de pago">
            <select value={form.payment_method_id} onChange={(e) => update('payment_method_id', e.target.value)} className={selectClass}>
              <option value="">No aplica</option>
              {paymentMethods?.filter((m) => m.active || m.id === form.payment_method_id).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>

          {(isIncome || isExpense) && (
            <Field label="Número de factura">
              <input type="text" value={form.invoice_number} onChange={(e) => update('invoice_number', e.target.value)} className={inputClass} placeholder="p. ej. NX-0012" />
            </Field>
          )}

          {/* Soporte */}
          <p className={sectionTitle}>Soporte</p>
          <div className="sm:col-span-2">
            <AttachmentField value={form.attachment_path} onChange={(p) => update('attachment_path', p)} folder="movimientos" />
          </div>
          <Field label="Notas" className="sm:col-span-2">
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Detalles adicionales…" />
          </Field>
        </div>

        <ModalActions
          saving={!!saving}
          isEditing={isEditing}
          onCancel={onClose}
          disabled={!!validation}
          submitLabel={!isEditing && splitActive ? `Crear ${form.project_ids.length} movimientos` : undefined}
          extra={validation ? <span className="text-nx-yellow text-xs">{validation}</span> : null}
        />
      </form>
    </Modal>
  );
}
