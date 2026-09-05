import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  Wand2,
  LayoutDashboard,
  HandCoins,
  ArrowLeftRight,
  Layers,
  Users,
  FileText,
  BadgeDollarSign,
  Clock,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Percent,
  Target,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFinanceData } from '../hooks/useFinanceData';
import { useDeleteProject, useSetProjectStatus, useUpdateProject } from '../hooks/useProjects';
import { useCreateMilestone, useCreateMilestones, useDeleteMilestone, usePatchMilestone, useUpdateMilestone } from '../hooks/useMilestones';
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from '../hooks/useTransactions';
import { useNextInvoiceNumber } from '../hooks/useSettings';
import { computePersonSummary, monthlySeries, type MilestoneView } from '../lib/finance';
import type { Milestone, ProjectFormData, Transaction } from '../types';
import { formatDate, formatMoney, formatPercent, todayISO } from '../lib/formatters';
import { billingModelLabels, projectStatusColors, projectStatusLabels, SEM, transactionStatusLabels } from '../lib/constants';
import { btnPrimary, btnSecondary, errorMessage, tableCell, tableHead } from '../lib/ui';
import { PageLoader } from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import KpiCard from '../components/ui/KpiCard';
import Tabs from '../components/ui/Tabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ProjectModal from '../components/projects/ProjectModal';
import MilestoneTable from '../components/collections/MilestoneTable';
import MilestoneModal from '../components/collections/MilestoneModal';
import PlanGeneratorModal from '../components/collections/PlanGeneratorModal';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionModal from '../components/transactions/TransactionModal';
import IncomeExpenseChart from '../components/dashboard/IncomeExpenseChart';
import CategoryChart from '../components/dashboard/CategoryChart';
import { paymentInitialFor } from '../lib/forms';

type Tab = 'summary' | 'milestones' | 'transactions' | 'costs' | 'team';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, profile } = useAuth();
  const data = useFinanceData();
  const [tab, setTab] = useState<Tab>('summary');

  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<'archive' | 'restore' | 'delete' | null>(null);
  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; milestone: Milestone | null }>({ open: false, milestone: null });
  const [planOpen, setPlanOpen] = useState(false);
  const [paying, setPaying] = useState<MilestoneView | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<MilestoneView | null>(null);
  const [txModal, setTxModal] = useState<{ open: boolean; tx: Transaction | null }>({ open: false, tx: null });
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const updateProject = useUpdateProject();
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();
  const createMilestone = useCreateMilestone();
  const createMilestones = useCreateMilestones();
  const updateMilestone = useUpdateMilestone();
  const patchMilestone = usePatchMilestone();
  const deleteMilestone = useDeleteMilestone();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();
  const nextInvoice = useNextInvoiceNumber();

  const stats = data.projectStats.find((s) => s.project.id === id);
  const project = stats?.project;
  const tx = useMemo(() => data.transactions.filter((t) => t.project_id === id), [data.transactions, id]);
  const points = monthlySeries(tx, stats?.milestoneViews ?? []);

  if (data.loading) return <PageLoader />;
  if (!stats || !project) {
    return <EmptyState title="Proyecto no encontrado" action={<Link to="/proyectos" className={btnSecondary}>Volver a proyectos</Link>} />;
  }

  const editable = can.canEditProject(project);
  const canExpense = can.canAddExpense(project);
  const isGeneral = project.is_general;

  const run = async (fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    try {
      await fn();
      toast.success(ok);
      after?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleEdit = (form: ProjectFormData) =>
    run(() => updateProject.mutateAsync({ id: project.id, data: form, isGeneral }), 'Proyecto actualizado', () => setEditOpen(false));

  const handleConfirm = async () => {
    if (confirm === 'archive') await run(() => setStatus.mutateAsync({ id: project.id, status: 'archived' }), 'Proyecto archivado. Sigue apareciendo en reportes históricos.');
    if (confirm === 'restore') await run(() => setStatus.mutateAsync({ id: project.id, status: 'active' }), 'Proyecto reactivado');
    if (confirm === 'delete') await run(() => deleteProject.mutateAsync(project.id), 'Proyecto eliminado', () => navigate('/proyectos'));
    setConfirm(null);
  };

  const markInvoiced = async (v: MilestoneView) => {
    await run(async () => {
      const invoice = v.milestone.invoice_number || (await nextInvoice.mutateAsync());
      await patchMilestone.mutateAsync({ id: v.milestone.id, data: { status: 'invoiced', invoiced_at: todayISO(), invoice_number: invoice } });
    }, 'Hito marcado como facturado');
  };

  const costByCategory = (() => {
    const map = new Map<string, { budgeted: number; pending: number; paid: number; reimbursable: number }>();
    tx.filter((t) => t.type === 'expense' && t.status !== 'cancelled').forEach((t) => {
      const k = t.category?.name ?? 'Sin categoría';
      const row = map.get(k) ?? { budgeted: 0, pending: 0, paid: 0, reimbursable: 0 };
      if (t.status === 'budgeted') row.budgeted += t.base_gross_amount;
      else if (t.status === 'pending') row.pending += t.base_gross_amount;
      else if (t.status === 'paid') row.paid += t.base_gross_amount;
      else row.reimbursable += t.base_gross_amount;
      map.set(k, row);
    });
    return Array.from(map.entries())
      .map(([name, r]) => ({ name, ...r, total: r.budgeted + r.pending + r.paid + r.reimbursable }))
      .sort((a, b) => b.total - a.total);
  })();

  const teamPeople = [
    ...(project.lead ? [{ person: project.lead, role: 'Líder' }] : []),
    ...(project.members ?? []).filter((m) => m.person && m.person_id !== project.lead_person_id).map((m) => ({ person: m.person!, role: 'Miembro' })),
  ];
  const teamSummaries = teamPeople.map(({ person, role }) => ({ role, ...computePersonSummary(person, tx) }));

  const budgetPct = stats.budget > 0 ? Math.min(150, (stats.expensesRegistered / stats.budget) * 100) : null;

  return (
    <div className="space-y-5">
      <Link to="/proyectos" className="inline-flex items-center gap-1 text-nx-muted hover:text-nx-heading text-sm">
        <ArrowLeft size={14} /> Proyectos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-nx-heading font-heading">{project.name}</h1>
            <Badge label={projectStatusLabels[project.status]} color={projectStatusColors[project.status]} dot size="sm" />
            {stats.budgetExceeded && <Badge label="Presupuesto excedido" color={SEM.red} size="sm" />}
            {stats.lowMargin && <Badge label="Margen bajo" color={SEM.yellow} size="sm" />}
          </div>
          <p className="text-nx-muted text-sm mt-1">
            {isGeneral
              ? 'Movimientos que no pertenecen a un proyecto específico.'
              : [
                  project.client?.name ? `Cliente: ${project.client.name}` : 'Sin cliente',
                  project.lead ? `Líder: ${project.lead.name}` : null,
                  billingModelLabels[project.billing_model],
                  project.start_date || project.end_date ? `${formatDate(project.start_date)} → ${formatDate(project.end_date)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditOpen(true)} className={btnSecondary}>
              <Pencil size={14} /> Editar
            </button>
            {!isGeneral && can.isStaff && (
              <>
                {project.status === 'archived' ? (
                  <button onClick={() => setConfirm('restore')} className={btnSecondary}>
                    <ArchiveRestore size={14} /> Reactivar
                  </button>
                ) : (
                  <button onClick={() => setConfirm('archive')} className={btnSecondary}>
                    <Archive size={14} /> Archivar
                  </button>
                )}
                {tx.length === 0 && stats.milestoneViews.length === 0 && (
                  <button onClick={() => setConfirm('delete')} className={`${btnSecondary} text-nx-red hover:text-nx-red`}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {isGeneral ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Ingresos" value={formatMoney(stats.collected)} icon={BadgeDollarSign} color={SEM.green} small />
          <KpiCard label="Gastos pagados" value={formatMoney(stats.expensesPaid)} icon={TrendingDown} color={SEM.red} small />
          <KpiCard label="Resultado" value={formatMoney(stats.profitActual, undefined, { sign: true })} icon={TrendingUp} color={stats.profitActual >= 0 ? SEM.green : SEM.red} small />
          <KpiCard label="Movimientos" value={String(stats.transactionCount)} icon={ArrowLeftRight} color={SEM.blue} small />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard label="Contratado" value={formatMoney(stats.contractValue)} icon={FileText} color={SEM.muted} small />
          <KpiCard label="Facturado" value={formatMoney(stats.invoiced)} icon={Receipt} color={SEM.blue} hint={`Pendiente por facturar ${formatMoney(stats.pendingToInvoice)}`} small />
          <KpiCard label="Cobrado" value={formatMoney(stats.collected)} icon={BadgeDollarSign} color={SEM.green} hint={`${formatPercent(stats.collectedPct, 0)} de lo facturado`} small />
          <KpiCard label="Por cobrar" value={formatMoney(stats.receivable)} icon={Clock} color={SEM.yellow} small />
          <KpiCard label="Vencido" value={formatMoney(stats.overdue)} icon={AlertOctagon} color={SEM.red} small />
          <KpiCard label="Gastos pagados" value={formatMoney(stats.expensesPaid)} icon={TrendingDown} color={SEM.red} hint={`Registrados ${formatMoney(stats.expensesRegistered)} · proyectados ${formatMoney(stats.expensesProjected)}`} small />
          <KpiCard label="Utilidad actual" value={formatMoney(stats.profitActual, undefined, { sign: true })} icon={TrendingUp} color={stats.profitActual >= 0 ? SEM.green : SEM.red} hint="Cobrado − gastos pagados" small />
          <KpiCard label="Margen actual" value={formatPercent(stats.marginActual)} icon={Percent} color={stats.marginActual === null ? SEM.gray : stats.lowMargin ? SEM.yellow : SEM.green} hint={`Objetivo ${project.target_margin.toFixed(0)} %`} small />
          <KpiCard label="Utilidad proyectada" value={stats.profitProjected === null ? 'No disponible' : formatMoney(stats.profitProjected, undefined, { sign: true })} icon={Target} color={stats.profitProjected === null ? SEM.gray : stats.profitProjected >= 0 ? SEM.green : SEM.red} hint="Contratado − costos proyectados" small />
          <KpiCard label="Margen proyectado" value={formatPercent(stats.marginProjected)} icon={Percent} color={stats.marginProjected === null ? SEM.gray : stats.marginProjected >= project.target_margin ? SEM.green : SEM.yellow} small />
        </div>
      )}

      <Tabs
        tabs={[
          { key: 'summary', label: 'Resumen', icon: LayoutDashboard },
          ...(isGeneral ? [] : [{ key: 'milestones' as Tab, label: 'Plan de cobros', icon: HandCoins, count: stats.milestoneViews.length }]),
          { key: 'transactions', label: 'Movimientos', icon: ArrowLeftRight, count: tx.length },
          { key: 'costs', label: 'Costos', icon: Layers },
          ...(isGeneral ? [] : [{ key: 'team' as Tab, label: 'Equipo', icon: Users, count: teamPeople.length }]),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'summary' && (
        <div className="space-y-5">
          {stats.budget > 0 && (
            <div className="bg-nx-card rounded-xl border border-nx-border p-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-nx-heading font-medium">Presupuesto de costos</span>
                <span className="text-nx-muted">
                  {formatMoney(stats.expensesRegistered)} de {formatMoney(stats.budget)} ({budgetPct?.toFixed(0)} %)
                </span>
              </div>
              <div className="h-2.5 bg-nx-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, budgetPct ?? 0)}%`, backgroundColor: stats.budgetExceeded ? SEM.red : (budgetPct ?? 0) > 85 ? SEM.yellow : SEM.green }} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <IncomeExpenseChart points={points} />
            <CategoryChart transactions={tx} />
          </div>
          {project.notes && (
            <div className="bg-nx-card rounded-xl border border-nx-border p-5">
              <h3 className="text-nx-heading font-semibold font-heading mb-2">Notas</h3>
              <p className="text-nx-muted text-sm whitespace-pre-line">{project.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'milestones' && (
        <div className="space-y-3">
          {editable && (
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => setPlanOpen(true)} className={btnSecondary}>
                <Wand2 size={14} /> Generar plan de cobros
              </button>
              <button onClick={() => setMilestoneModal({ open: true, milestone: null })} className={btnPrimary}>
                <Plus size={14} /> Nuevo hito
              </button>
            </div>
          )}
          <MilestoneTable
            views={stats.milestoneViews}
            canEdit={() => editable}
            onEdit={(v) => setMilestoneModal({ open: true, milestone: v.milestone })}
            onDelete={setDeletingMilestone}
            onRegisterPayment={setPaying}
            onMarkInvoiced={markInvoiced}
            onCancel={(v) => run(() => patchMilestone.mutateAsync({ id: v.milestone.id, data: { status: 'cancelled' } }), 'Hito cancelado')}
          />
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-3">
          {canExpense && (
            <div className="flex justify-end">
              <button onClick={() => setTxModal({ open: true, tx: null })} className={btnPrimary}>
                <Plus size={14} /> Nuevo movimiento
              </button>
            </div>
          )}
          <TransactionTable
            transactions={tx}
            compact
            canEdit={(t) => editable || (can.role === 'collaborator' && t.created_by === profile?.id)}
            onEdit={(t) => setTxModal({ open: true, tx: t })}
            onDelete={setDeletingTx}
          />
        </div>
      )}

      {tab === 'costs' && (
        <div className="bg-nx-card rounded-xl border border-nx-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nx-border">
                  <th className={tableHead}>Categoría</th>
                  <th className={`${tableHead} text-right`}>{transactionStatusLabels.budgeted}</th>
                  <th className={`${tableHead} text-right`}>Comprometido</th>
                  <th className={`${tableHead} text-right`}>{transactionStatusLabels.paid}</th>
                  <th className={`${tableHead} text-right`}>{transactionStatusLabels.reimbursable}</th>
                  <th className={`${tableHead} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {costByCategory.map((r) => (
                  <tr key={r.name} className="border-b border-nx-border/50">
                    <td className={`${tableCell} text-nx-heading`}>{r.name}</td>
                    <td className={`${tableCell} text-right`} style={{ color: SEM.blue }}>{formatMoney(r.budgeted)}</td>
                    <td className={`${tableCell} text-right`} style={{ color: SEM.yellow }}>{formatMoney(r.pending)}</td>
                    <td className={`${tableCell} text-right`} style={{ color: SEM.red }}>{formatMoney(r.paid)}</td>
                    <td className={`${tableCell} text-right`} style={{ color: SEM.cyan }}>{formatMoney(r.reimbursable)}</td>
                    <td className={`${tableCell} text-right text-nx-heading font-semibold`}>{formatMoney(r.total)}</td>
                  </tr>
                ))}
                {costByCategory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-nx-muted">
                      Sin costos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamSummaries.map((s) => (
            <div key={s.person.id} className="bg-nx-card rounded-xl border border-nx-border p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-nx-heading font-semibold">{s.person.name}</p>
                  <p className="text-nx-muted text-xs">{s.role}</p>
                </div>
                <Link to="/equipo" className="text-nx-blue-light text-xs hover:underline">
                  Ver saldo global
                </Link>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-nx-muted">Gastos pagados de su bolsillo</dt>
                <dd className="text-right text-nx-heading">{formatMoney(s.expensesPaidByPerson)}</dd>
                <dt className="text-nx-muted">Pendiente de reembolso</dt>
                <dd className="text-right" style={{ color: s.pendingReimbursement > 0 ? SEM.yellow : SEM.muted }}>{formatMoney(s.pendingReimbursement)}</dd>
                <dt className="text-nx-muted">Pagos recibidos de Nexus</dt>
                <dd className="text-right text-nx-heading">{formatMoney(s.paymentsReceived)}</dd>
                <dt className="text-nx-muted">Pagos pendientes</dt>
                <dd className="text-right" style={{ color: s.pendingPayments > 0 ? SEM.yellow : SEM.muted }}>{formatMoney(s.pendingPayments)}</dd>
              </dl>
            </div>
          ))}
          {teamSummaries.length === 0 && <EmptyState icon={Users} title="Sin equipo asignado" description="Edita el proyecto para asignar líder y miembros." />}
        </div>
      )}

      {/* Modales */}
      <ProjectModal open={editOpen} project={project} saving={updateProject.isPending} onSubmit={handleEdit} onClose={() => setEditOpen(false)} />
      <MilestoneModal
        open={milestoneModal.open}
        milestone={milestoneModal.milestone}
        projectId={project.id}
        saving={createMilestone.isPending || updateMilestone.isPending}
        onSubmit={(form) =>
          run(
            () => (milestoneModal.milestone ? updateMilestone.mutateAsync({ id: milestoneModal.milestone.id, data: form }) : createMilestone.mutateAsync(form)),
            milestoneModal.milestone ? 'Hito actualizado' : 'Hito creado',
            () => setMilestoneModal({ open: false, milestone: null })
          )
        }
        onClose={() => setMilestoneModal({ open: false, milestone: null })}
      />
      <PlanGeneratorModal
        open={planOpen}
        project={project}
        saving={createMilestones.isPending}
        onGenerate={(forms) => run(() => createMilestones.mutateAsync(forms), `${forms.length} hitos creados`, () => setPlanOpen(false))}
        onClose={() => setPlanOpen(false)}
      />
      <TransactionModal
        open={!!paying}
        initial={paying ? paymentInitialFor(paying) : undefined}
        milestoneViews={data.milestoneViews}
        saving={createTx.isPending}
        onSubmit={(form) => run(() => createTx.mutateAsync(form), 'Cobro registrado', () => setPaying(null))}
        onClose={() => setPaying(null)}
      />
      <TransactionModal
        open={txModal.open}
        transaction={txModal.tx}
        initial={txModal.tx ? undefined : { project_id: project.id, project_ids: [project.id] }}
        milestoneViews={data.milestoneViews}
        saving={createTx.isPending || updateTx.isPending}
        onSubmit={(form) =>
          run(
            () => (txModal.tx ? updateTx.mutateAsync({ id: txModal.tx.id, data: form }) : createTx.mutateAsync(form)),
            txModal.tx ? 'Movimiento actualizado' : 'Movimiento registrado',
            () => setTxModal({ open: false, tx: null })
          )
        }
        onClose={() => setTxModal({ open: false, tx: null })}
        allowedProjectIds={editable ? null : [project.id]}
        expenseOnly={can.role === 'collaborator'}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'delete' ? 'Eliminar proyecto' : confirm === 'archive' ? 'Archivar proyecto' : 'Reactivar proyecto'}
        message={
          confirm === 'delete'
            ? `¿Eliminar "${project.name}"? Esta acción no se puede deshacer.`
            : confirm === 'archive'
              ? `"${project.name}" dejará de aparecer en formularios y listas activas, pero conservará su historial en reportes.`
              : `"${project.name}" volverá a estar disponible para registrar movimientos.`
        }
        confirmLabel={confirm === 'delete' ? 'Eliminar' : confirm === 'archive' ? 'Archivar' : 'Reactivar'}
        tone={confirm === 'delete' ? 'danger' : 'primary'}
        loading={setStatus.isPending || deleteProject.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!deletingMilestone}
        title="Eliminar hito de cobro"
        message={`¿Eliminar "${deletingMilestone?.milestone.concept}"? Los cobros ya registrados se conservan como ingresos sin hito.`}
        loading={deleteMilestone.isPending}
        onConfirm={() => deletingMilestone && run(() => deleteMilestone.mutateAsync(deletingMilestone.milestone.id), 'Hito eliminado', () => setDeletingMilestone(null))}
        onCancel={() => setDeletingMilestone(null)}
      />
      <ConfirmDialog
        open={!!deletingTx}
        title="Eliminar movimiento"
        message={`¿Eliminar "${deletingTx?.description}"? Quedará registrado en el historial.`}
        loading={deleteTx.isPending}
        onConfirm={() => deletingTx && run(() => deleteTx.mutateAsync(deletingTx.id), 'Movimiento eliminado', () => setDeletingTx(null))}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
}
