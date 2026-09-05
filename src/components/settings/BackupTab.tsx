import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceData } from '../../hooks/useFinanceData';
import { useCategories, useClients, usePaymentMethods, usePeople } from '../../hooks/useCatalogs';
import { exportToExcel } from '../../lib/export';
import { todayISO } from '../../lib/formatters';
import { btnPrimary, btnSecondary, errorMessage } from '../../lib/ui';
import { transactionsToRows } from '../../lib/transactions';
import { milestoneStatusLabels } from '../../lib/constants';

export default function BackupTab() {
  const data = useFinanceData();
  const { data: categories } = useCategories();
  const { data: clients } = useClients();
  const { data: people } = usePeople();
  const { data: paymentMethods } = usePaymentMethods();
  const [busy, setBusy] = useState(false);

  const strip = <T extends object>(list: T[]) =>
    list.map((row) => {
      const out: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (v === null || typeof v !== 'object') out[k] = v;
      });
      return out;
    });

  const excel = async () => {
    setBusy(true);
    try {
      await exportToExcel(
        [
          { name: 'Movimientos', rows: transactionsToRows(data.transactions) },
          {
            name: 'Plan de cobros',
            rows: data.milestoneViews.map((v) => ({
              Proyecto: v.milestone.project?.name ?? '',
              Concepto: v.milestone.concept,
              Tipo: v.milestone.kind,
              Valor: v.milestone.base_amount,
              Cobrado: v.collected,
              Pendiente: v.remaining,
              Estado: milestoneStatusLabels[v.status],
              Programado: v.milestone.scheduled_date ?? '',
              Vencimiento: v.milestone.due_date ?? '',
              Factura: v.milestone.invoice_number ?? '',
              Responsable: v.milestone.responsible?.name ?? '',
            })),
          },
          { name: 'Proyectos', rows: strip(data.projects) },
          { name: 'Personas', rows: strip(people ?? []) },
          { name: 'Clientes', rows: strip(clients ?? []) },
          { name: 'Categorías', rows: strip(categories ?? []) },
          { name: 'Monedas', rows: strip(data.currencies) },
          { name: 'Cuentas', rows: strip(data.accounts) },
          { name: 'Métodos de pago', rows: strip(paymentMethods ?? []) },
          { name: 'Configuración', rows: [strip([data.settings])[0]] },
        ],
        'nexus-finance-backup'
      );
      toast.success('Copia en Excel descargada');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const json = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      settings: data.settings,
      currencies: data.currencies,
      categories,
      accounts: data.accounts,
      payment_methods: paymentMethods,
      clients,
      people,
      projects: data.projects,
      milestones: data.milestones,
      transactions: data.transactions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-finance-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Copia JSON descargada');
  };

  return (
    <div className="space-y-4">
      <div className="bg-nx-card rounded-xl border border-nx-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-nx-green" size={18} />
          <h3 className="text-nx-heading font-semibold font-heading">Copia de seguridad</h3>
        </div>
        <p className="text-nx-muted text-sm">
          Los datos viven en Supabase, que hace copias automáticas diarias. Además puedes descargar una copia completa cuando quieras: Excel para revisar o compartir, JSON como respaldo íntegro.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={excel} disabled={busy || data.loading} className={btnPrimary}>
            <FileSpreadsheet size={15} /> Descargar Excel completo
          </button>
          <button onClick={json} disabled={data.loading} className={btnSecondary}>
            <FileJson size={15} /> Descargar JSON
          </button>
        </div>
      </div>
      <div className="bg-nx-card rounded-xl border border-nx-border p-5">
        <div className="flex items-center gap-2 mb-2">
          <Download className="text-nx-blue-light" size={16} />
          <h3 className="text-nx-heading font-semibold font-heading text-sm">Contenido de la copia</h3>
        </div>
        <ul className="text-nx-muted text-xs grid grid-cols-2 sm:grid-cols-3 gap-1">
          <li>{data.transactions.length} movimientos</li>
          <li>{data.milestones.length} hitos de cobro</li>
          <li>{data.projects.length} proyectos</li>
          <li>{people?.length ?? 0} personas</li>
          <li>{clients?.length ?? 0} clientes</li>
          <li>{categories?.length ?? 0} categorías</li>
          <li>{data.currencies.length} monedas</li>
          <li>{data.accounts.length} cuentas</li>
          <li>{paymentMethods?.length ?? 0} métodos de pago</li>
        </ul>
      </div>
    </div>
  );
}
