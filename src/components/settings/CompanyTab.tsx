import { useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings, useUpdateSettings, type SettingsFormData } from '../../hooks/useSettings';
import { useCurrencies } from '../../hooks/useCatalogs';
import type { AppSettings } from '../../types';
import { btnPrimary, errorMessage, inputClass, selectClass } from '../../lib/ui';
import Field from '../ui/Field';
import Spinner from '../ui/Spinner';

export default function CompanyTab({ canWrite }: { canWrite: boolean }) {
  const { data: settings, isLoading } = useSettings();
  if (isLoading || !settings) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  // La clave reinicia el formulario cuando llegan datos nuevos del servidor
  return <CompanyForm key={settings.updated_at} settings={settings} canWrite={canWrite} />;
}

function toForm(s: AppSettings): SettingsFormData {
  return {
    company_name: s.company_name,
    tax_id: s.tax_id,
    address: s.address,
    email: s.email,
    phone: s.phone,
    base_currency: s.base_currency,
    invoice_prefix: s.invoice_prefix,
    next_invoice_number: s.next_invoice_number,
    default_tax_rate: s.default_tax_rate,
    min_margin: s.min_margin,
    due_soon_days: s.due_soon_days,
    cash_horizon_days: s.cash_horizon_days,
  };
}

function CompanyForm({ settings, canWrite }: { settings: AppSettings; canWrite: boolean }) {
  const { data: currencies } = useCurrencies();
  const update = useUpdateSettings();
  const [form, setForm] = useState<SettingsFormData>(() => toForm(settings));

  const upd = <K extends keyof SettingsFormData>(k: K, v: SettingsFormData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync(form);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const section = 'bg-nx-card rounded-xl border border-nx-border p-5 space-y-3';
  const title = 'text-nx-heading font-semibold font-heading';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={section}>
        <h3 className={title}>Datos de la empresa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre" required className="sm:col-span-2">
            <input required value={form.company_name} onChange={(e) => upd('company_name', e.target.value)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="NIT">
            <input value={form.tax_id ?? ''} onChange={(e) => upd('tax_id', e.target.value || null)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone ?? ''} onChange={(e) => upd('phone', e.target.value || null)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="Correo">
            <input value={form.email ?? ''} onChange={(e) => upd('email', e.target.value || null)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="Dirección">
            <input value={form.address ?? ''} onChange={(e) => upd('address', e.target.value || null)} className={inputClass} disabled={!canWrite} />
          </Field>
        </div>
      </div>

      <div className={section}>
        <h3 className={title}>Facturación y moneda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Moneda base" hint="Cambiarla no reconvierte los valores históricos. Defínela al inicio.">
            <select value={form.base_currency} onChange={(e) => upd('base_currency', e.target.value)} className={selectClass} disabled={!canWrite}>
              {currencies?.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prefijo de factura">
            <input value={form.invoice_prefix} onChange={(e) => upd('invoice_prefix', e.target.value)} className={inputClass} disabled={!canWrite} placeholder="NX-" />
          </Field>
          <Field label="Siguiente consecutivo">
            <input type="number" min="1" step="1" value={form.next_invoice_number} onChange={(e) => upd('next_invoice_number', parseInt(e.target.value) || 1)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="Impuesto por defecto (%)" hint="Solo informativo por ahora.">
            <input type="number" min="0" step="0.01" value={form.default_tax_rate} onChange={(e) => upd('default_tax_rate', parseFloat(e.target.value) || 0)} className={inputClass} disabled={!canWrite} />
          </Field>
        </div>
      </div>

      <div className={section}>
        <h3 className={title}>Alertas y reglas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Margen mínimo (%)" hint="Debajo de este margen se marca alerta si el proyecto no tiene margen objetivo propio.">
            <input type="number" min="0" max="100" step="0.1" value={form.min_margin} onChange={(e) => upd('min_margin', parseFloat(e.target.value) || 0)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="Aviso de vencimiento (días)" hint="Facturas que vencen dentro de este plazo aparecen como alerta.">
            <input type="number" min="0" step="1" value={form.due_soon_days} onChange={(e) => upd('due_soon_days', parseInt(e.target.value) || 0)} className={inputClass} disabled={!canWrite} />
          </Field>
          <Field label="Horizonte de caja (días)" hint="Compromisos dentro de este plazo se comparan con el saldo disponible.">
            <input type="number" min="0" step="1" value={form.cash_horizon_days} onChange={(e) => upd('cash_horizon_days', parseInt(e.target.value) || 0)} className={inputClass} disabled={!canWrite} />
          </Field>
        </div>
      </div>

      {canWrite && (
        <div className="flex justify-end">
          <button type="submit" disabled={update.isPending} className={btnPrimary}>
            <Save size={15} /> {update.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </form>
  );
}
