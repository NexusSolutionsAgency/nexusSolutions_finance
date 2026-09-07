import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays, Layers, TrendingUp, FileText, BadgeDollarSign, Clock, AlertOctagon, Percent, Receipt, Wallet, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFinanceData } from '../hooks/useFinanceData';
import { useCreateMilestone, useDeleteMilestone, usePatchMilestone, useUpdateMilestone } from '../hooks/useMilestones';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useNextInvoiceNumber } from '../hooks/useSettings';
import { computeKpis, projectedCashflow, type MilestoneView } from '../lib/finance';
import type { Milestone, MilestoneFormData, TransactionFormData } from '../types';
import { addDays, formatMoney, formatMonthLong, formatPercent, todayISO } from '../lib/formatters';
import { paymentInitialFor } from '../lib/forms';
import { SEM } from '../lib/constants';
import { btnPrimary, errorMessage, pill, tableCell, tableHead } from '../lib/ui';
import FilterSelect from '../components/ui/FilterSelect';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import KpiCard from '../components/ui/KpiCard';
import Tabs from '../components/ui/Tabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import MilestoneTable from '../components/collections/MilestoneTable';
import MilestoneModal from '../components/collections/MilestoneModal';
import ProjectionChart from '../components/collections/ProjectionChart';
import TransactionModal from '../components/transactions/TransactionModal';
import { useClients } from '../hooks/useCatalogs';

type Tab = 'plan' | 'costs' | 'projection';
type Quick = 'all' | 'week' | 'month' | 'overdue' | 'upcoming' | 'partial' | 'open';

export default function Collections() {
  const { can } = useAuth();
  const data = useFinanceData();
  const { data: clients } = useClients();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('plan');
  const [quick, setQuick] = useState<Quick>('open');
  const [projectFilter, setProjectFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; milestone: Milestone | null }>(() => ({ open: params.get('nuevo') === '1' && can.canWrite, milestone: null }));
  const [paying, setPaying] = useState<MilestoneView | null>(null);
  const [deleting, setDeleting] = useState<MilestoneView | null>(null);

  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const patchMilestone = usePatchMilestone();
  const deleteMilestone = useDeleteMilestone();
  const createTransaction = useCreateTransaction();
  const nextInvoice = useNextInvoiceNumber();

  useEffect(() => {
    if (params.get('nuevo') === '1') setParams({}, { replace: true });
  }, [params, setParams]);

  const today = todayISO();
  const active = useMemo(() => data.milestoneViews.filter((v) => v.milestone.project?.status !== 'archived'), [data.milestoneViews]);
  const kpis = useMemo(() => computeKpis(data.transactions.filter((t) => t.project?.status !== 'archived'), active), [data.transactions, active]);
  const projectTotals = useMemo(() => {
    const list = data.projectStats.filter((s) => !s.project.is_general && s.project.status !== 'archived');
    return {
      pendingToInvoice: list.reduce((s, p) => s + p.pendingToInvoice, 0),
      contract: list.reduce((s, p) => s + p.contractValue, 0),
      projectedCosts: list.reduce((s, p) => s + p.expensesProjected, 0),
    };
  }, [data.projectStats]);
  const profitProjected = projectTotals.contract > 0 ? projectTotals.contract - projectTotals.projectedCosts : null;
  const marginProjected = projectTotals.contract > 0 && profitProjected !== null ? (profitProjected / projectTotals.contract) * 100 : null;

  const filtered = useMemo(() => {
    const weekEnd = addDays(today, 7);
    const monthEnd = `${today.slice(0, 7)}-31`;
    return active
      .filter((v) => !projectFilter || v.milestone.project_id === projectFilter)
      .filter((v) => !clientFilter || v.milestone.project?.client_id === clientFilter)
      .filter((v) => {
        const ref = v.milestone.due_date ?? v.milestone.scheduled_date ?? '';
        const open = v.status !== 'paid' && v.status !== 'cancelled';
        switch (quick) {
          case 'all':
            return true;
          case 'open':
            return open;
          case 'week':
            return open && ref >= today && ref <= weekEnd;
          case 'month':
            return open && ref.slice(0, 7) === today.slice(0, 7) && ref <= monthEnd;
          case 'overdue':
            return v.status === 'overdue';
          case 'upcoming':
            return open && v.status !== 'overdue' && ref >= today;
          case 'partial':
            return v.status === 'partial';
        }
      })
      .sort((a, b) => {
        const order = { overdue: 0, partial: 1, invoiced: 2, scheduled: 3, paid: 4, cancelled: 5 };
        const da = a.milestone.due_date ?? a.milestone.scheduled_date ?? '9999';
        const db = b.milestone.due_date ?? b.milestone.scheduled_date ?? '9999';
        return order[a.status] - order[b.status] || da.localeCompare(db);
      });
  }, [active, projectFilter, clientFilter, quick, today]);

  const projection = useMemo(() => projectedCashflow(data.transactions, active, data.cash.total), [data.transactions, active, data.cash.total]);

  const myProjectIds = can.isStaff ? null : data.projects.filter((p) => can.canEditProject(p)).map((p) => p.id);
  const canEditView = (v: MilestoneView) => can.canEditProject(v.milestone.project ?? data.projects.find((p) => p.id === v.milestone.project_id));

  const handleMilestoneSubmit = async (form: MilestoneFormData) => {
    try {
      if (milestoneModal.milestone) {
        await updateMilestone.mutateAsync({ id: milestoneModal.milestone.id, data: form });
        toast.success('Hito actualizado');
      } else {
        await createMilestone.mutateAsync(form);
        toast.success('Hito de cobro creado');
      }
      setMilestoneModal({ open: false, milestone: null });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const markInvoiced = async (v: MilestoneView) => {
    try {
      let invoice = v.milestone.invoice_number;
      if (!invoice) invoice = await nextInvoice.mutateAsync();
      await patchMilestone.mutateAsync({ id: v.milestone.id, data: { status: 'invoiced', invoiced_at: today, invoice_number: invoice } });
      toast.success(`Marcado como facturado (${invoice})`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const cancelMilestone = async (v: MilestoneView) => {
    try {
      await patchMilestone.mutateAsync({ id: v.milestone.id, data: { status: 'cancelled' } });
      toast.success('Hito cancelado');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handlePayment = async (form: TransactionFormData) => {
    try {
      await createTransaction.mutateAsync(form);
      toast.success('Cobro registrado');
      setPaying(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMilestone.mutateAsync(deleting.milestone.id);
      toast.success('Hito eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (data.loading) return <PageLoader />;

  const costRows = data.projectStats
    .filter((s) => s.project.status !== 'archived')
    .map((s) => {
      const tx = data.transactions.filter((t) => t.project_id === s.project.id && t.type === 'expense' && t.status !== 'cancelled');
      const sum = (pred: (t: (typeof tx)[number]) => boolean) => tx.filter(pred).reduce((a, t) => a + t.base_gross_amount, 0);
      return {
        s,
        budgeted: sum((t) => t.status === 'budgeted'),
        committed: sum((t) => t.status === 'pending'),
        paid: sum((t) => t.status === 'paid'),
        reimbursable: sum((t) => t.status === 'reimbursable' || t.status === 'reimbursed'),
        shared: sum((t) => !!t.split_group_id),
        total: sum(() => true),
      };
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobranzas y rentabilidad"
        subtitle="Contratos, plan de cobros, cartera, costos y flujo proyectado"
        actions={
          can.canWrite &&
          can.role !== 'collaborator' && (
            <button onClick={() => setMilestoneModal({ open: true, milestone: null })} className={btnPrimary}>
              <Plus size={15} /> Nuevo hito de cobro
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Contratado" value={formatMoney(projectTotals.contract)} icon={FileText} color={SEM.muted} small />
        <KpiCard label="Facturado" value={formatMoney(kpis.invoiced)} icon={Receipt} color={SEM.blue} small />
        <KpiCard label="Cobrado" value={formatMoney(kpis.collected)} icon={BadgeDollarSign} color={SEM.green} hint={`${formatPercent(kpis.collectedPct, 0)} de lo facturado`} small />
        <KpiCard label="Pendiente por facturar" value={formatMoney(projectTotals.pendingToInvoice)} icon={Clock} color={SEM.cyan} small />
        <KpiCard label="Cuentas por cobrar" value={formatMoney(kpis.receivable)} icon={Wallet} color={SEM.yellow} small />
        <KpiCard label="Vencido" value={formatMoney(kpis.overdue)} icon={AlertOctagon} color={SEM.red} small />
        <KpiCard label="Costos ejecutados" value={formatMoney(kpis.expensesPaid)} icon={TrendingUp} color={SEM.red} small />
        <KpiCard label="Costos pendientes" value={formatMoney(kpis.expensesProjected - kpis.expensesPaid)} icon={Clock} color={SEM.gold} hint="Comprometidos y presupuestados" small />
        <KpiCard label="Utilidad actual" value={formatMoney(kpis.profitActual, undefined, { sign: true })} icon={TrendingUp} color={kpis.profitActual >= 0 ? SEM.green : SEM.red} small />
        <KpiCard label="Margen actual" value={formatPercent(kpis.marginActual)} icon={Percent} color={kpis.marginActual === null ? SEM.gray : kpis.marginActual >= data.settings.min_margin ? SEM.green : SEM.yellow} small />
        <KpiCard label="Utilidad proyectada" value={profitProjected === null ? 'No disponible' : formatMoney(profitProjected, undefined, { sign: true })} icon={Target} color={profitProjected === null ? SEM.gray : profitProjected >= 0 ? SEM.green : SEM.red} hint="Contratado − costos proyectados" small />
        <KpiCard label="Margen proyectado" value={formatPercent(marginProjected)} icon={Percent} color={marginProjected === null ? SEM.gray : marginProjected >= data.settings.min_margin ? SEM.green : SEM.yellow} small />
      </div>

      <Tabs
        tabs={[
          { key: 'plan', label: 'Calendario de cobros', icon: CalendarDays, count: active.filter((v) => v.status !== 'paid' && v.status !== 'cancelled').length },
          { key: 'costs', label: 'Costos por proyecto', icon: Layers },
          { key: 'projection', label: 'Flujo de caja proyectado', icon: TrendingUp },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'plan' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['open', 'Pendientes'],
                ['week', 'Esta semana'],
                ['month', 'Este mes'],
                ['overdue', 'Vencidos'],
                ['upcoming', 'Próximos'],
                ['partial', 'Parciales'],
                ['all', 'Todos'],
              ] as [Quick, string][]
            ).map(([k, label]) => (
              <button key={k} onClick={() => setQuick(k)} className={pill(quick === k)}>
                {label}
              </button>
            ))}
            <div className="flex gap-2 ml-auto">
              <FilterSelect
                label="Proyecto"
                allLabel="Todos los proyectos"
                value={projectFilter}
                onChange={setProjectFilter}
                options={data.projects.filter((p) => !p.is_general).map((p) => ({ value: p.id, label: p.name }))}
                className="w-auto"
              />
              <FilterSelect
                label="Cliente"
                allLabel="Todos los clientes"
                value={clientFilter}
                onChange={setClientFilter}
                options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
                className="w-auto"
              />
            </div>
          </div>
          <MilestoneTable
            views={filtered}
            showProject
            canEdit={canEditView}
            onEdit={(v) => setMilestoneModal({ open: true, milestone: v.milestone })}
            onDelete={setDeleting}
            onRegisterPayment={setPaying}
            onMarkInvoiced={markInvoiced}
            onCancel={cancelMilestone}
          />
          <p className="text-nx-muted text-xs">
            Total pendiente en la vista: <span className="text-nx-heading font-semibold">{formatMoney(filtered.reduce((s, v) => s + v.remaining, 0))}</span>
          </p>
        </div>
      )}

      {tab === 'costs' && (
        <div className="bg-nx-card rounded-xl border border-nx-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nx-border">
                  <th className={tableHead}>Proyecto</th>
                  <th className={`${tableHead} text-right`}>Presupuesto</th>
                  <th className={`${tableHead} text-right`}>Presupuestado</th>
                  <th className={`${tableHead} text-right`}>Comprometido</th>
                  <th className={`${tableHead} text-right`}>Pagado</th>
                  <th className={`${tableHead} text-right`}>Reembolsable</th>
                  <th className={`${tableHead} text-right`}>Compartido</th>
                  <th className={`${tableHead} text-right`}>Total</th>
                  <th className={`${tableHead} text-right`}>Ejecución</th>
                </tr>
              </thead>
              <tbody>
                {costRows.map(({ s, budgeted, committed, paid, reimbursable, shared, total }) => {
                  const pct = s.budget > 0 ? (total / s.budget) * 100 : null;
                  return (
                    <tr key={s.project.id} className="border-b border-nx-border/50">
                      <td className={`${tableCell} text-nx-heading font-medium`}>{s.project.name}</td>
                      <td className={`${tableCell} text-right text-nx-muted`}>{s.budget > 0 ? formatMoney(s.budget) : '—'}</td>
                      <td className={`${tableCell} text-right`} style={{ color: SEM.blue }}>{formatMoney(budgeted)}</td>
                      <td className={`${tableCell} text-right`} style={{ color: SEM.yellow }}>{formatMoney(committed)}</td>
                      <td className={`${tableCell} text-right`} style={{ color: SEM.red }}>{formatMoney(paid)}</td>
                      <td className={`${tableCell} text-right`} style={{ color: SEM.cyan }}>{formatMoney(reimbursable)}</td>
                      <td className={`${tableCell} text-right text-nx-muted`}>{formatMoney(shared)}</td>
                      <td className={`${tableCell} text-right text-nx-heading font-semibold`}>{formatMoney(total)}</td>
                      <td className={`${tableCell} text-right`}>
                        {pct === null ? (
                          <span className="text-nx-muted">—</span>
                        ) : (
                          <span className={pct > 100 ? 'text-nx-red font-semibold' : pct > 85 ? 'text-nx-yellow' : 'text-nx-green'}>{pct.toFixed(0)} %</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-nx-muted text-[11px] px-4 py-3 border-t border-nx-border">
            Presupuestado = estimado aún no comprometido · Comprometido = pendiente de pago · Reembolsable = pagado por una persona · Compartido = repartido entre proyectos.
          </p>
        </div>
      )}

      {tab === 'projection' && (
        <div className="space-y-4">
          <ProjectionChart points={projection} />
          <div className="bg-nx-card rounded-xl border border-nx-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nx-border">
                    <th className={tableHead}>Mes</th>
                    <th className={tableHead}>Tipo</th>
                    <th className={`${tableHead} text-right`}>Entradas</th>
                    <th className={`${tableHead} text-right`}>Salidas</th>
                    <th className={`${tableHead} text-right`}>Neto</th>
                    <th className={`${tableHead} text-right`}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.map((p) => (
                    <tr key={p.month} className="border-b border-nx-border/50">
                      <td className={`${tableCell} text-nx-heading`}>{formatMonthLong(p.month)}</td>
                      <td className={`${tableCell} text-nx-muted`}>{p.isProjection ? 'Proyección' : 'Real'}</td>
                      <td className={`${tableCell} text-right`} style={{ color: SEM.green }}>{formatMoney(p.inflow)}</td>
                      <td className={`${tableCell} text-right`} style={{ color: SEM.red }}>{formatMoney(p.outflow)}</td>
                      <td className={`${tableCell} text-right font-medium`} style={{ color: p.net >= 0 ? SEM.green : SEM.red }}>{formatMoney(p.net, undefined, { sign: true })}</td>
                      <td className={`${tableCell} text-right font-semibold`} style={{ color: p.balance >= 0 ? '#f8fafc' : SEM.red }}>{formatMoney(p.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-nx-muted text-[11px] px-4 py-3 border-t border-nx-border">
              La proyección parte del saldo disponible de hoy, suma los cobros pendientes según su probabilidad y resta los gastos comprometidos, presupuestados y reembolsos pendientes.
            </p>
          </div>
        </div>
      )}

      <MilestoneModal
        open={milestoneModal.open}
        milestone={milestoneModal.milestone}
        saving={createMilestone.isPending || updateMilestone.isPending}
        onSubmit={handleMilestoneSubmit}
        onClose={() => setMilestoneModal({ open: false, milestone: null })}
        allowedProjectIds={myProjectIds}
      />

      <TransactionModal
        open={!!paying}
        initial={paying ? paymentInitialFor(paying) : undefined}
        milestoneViews={data.milestoneViews}
        saving={createTransaction.isPending}
        onSubmit={handlePayment}
        onClose={() => setPaying(null)}
        allowedProjectIds={myProjectIds}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Eliminar hito de cobro"
        message={`¿Eliminar "${deleting?.milestone.concept}"? Los cobros ya registrados se conservan como ingresos sin hito.`}
        loading={deleteMilestone.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
