import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Building2, User, CalendarClock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFinanceData } from '../hooks/useFinanceData';
import { useCreateProject } from '../hooks/useProjects';
import type { ProjectFormData, ProjectStatus } from '../types';
import type { ProjectStats } from '../lib/finance';
import { formatDate, formatMoney, formatPercent } from '../lib/formatters';
import { billingModelLabels, projectStatusColors, projectStatusLabels, SEM } from '../lib/constants';
import { btnPrimary, errorMessage, pill } from '../lib/ui';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ProjectModal from '../components/projects/ProjectModal';

function Metric({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-nx-surface/70 rounded-lg px-3 py-2">
      <p className="text-nx-muted text-[10px] uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-sm truncate" style={{ color: color ?? '#f8fafc' }} title={value}>
        {value}
      </p>
      {sub && <p className="text-nx-muted text-[10px] truncate">{sub}</p>}
    </div>
  );
}

export function ProjectCard({ s }: { s: ProjectStats }) {
  const p = s.project;
  const isGeneral = p.is_general;
  return (
    <Link
      to={`/proyectos/${p.id}`}
      className={`block bg-nx-card rounded-xl border p-5 hover:border-nx-blue/50 hover:bg-nx-card-hover/40 transition-colors ${
        isGeneral ? 'border-dashed border-nx-border-light' : 'border-nx-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-lg shrink-0 ${isGeneral ? 'bg-nx-surface' : 'bg-nx-blue/15'}`}>
            {isGeneral ? <Building2 className="text-nx-muted" size={20} /> : <FolderKanban className="text-nx-blue-light" size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-nx-heading font-semibold text-base font-heading truncate">{p.name}</h3>
            <p className="text-nx-muted text-xs truncate">
              {isGeneral ? 'Movimientos sin proyecto específico' : [p.client?.name, billingModelLabels[p.billing_model]].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge label={projectStatusLabels[p.status]} color={projectStatusColors[p.status]} dot />
          {(s.budgetExceeded || s.lowMargin) && (
            <span className="text-[10px] text-nx-red flex items-center gap-1">
              <AlertTriangle size={10} /> {s.budgetExceeded ? 'Presupuesto' : 'Margen'}
            </span>
          )}
        </div>
      </div>

      {isGeneral ? (
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Ingresos" value={formatMoney(s.collected)} color={SEM.green} />
          <Metric label="Gastos" value={formatMoney(s.expensesPaid)} color={SEM.red} />
          <Metric label="Movimientos" value={String(s.transactionCount)} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Metric label="Contratado" value={formatMoney(s.contractValue)} />
            <Metric label="Facturado" value={formatMoney(s.invoiced)} color={SEM.blue} />
            <Metric label="Cobrado" value={formatMoney(s.collected)} color={SEM.green} sub={`${formatPercent(s.collectedPct, 0)} de lo facturado`} />
            <Metric label="Por cobrar" value={formatMoney(s.receivable)} color={SEM.yellow} sub={s.overdue > 0 ? `Vencido ${formatMoney(s.overdue)}` : 'Sin vencidos'} />
            <Metric label="Gastos" value={formatMoney(s.expensesPaid)} color={SEM.red} sub={s.budget > 0 ? `Presupuesto ${formatMoney(s.budget)}` : undefined} />
            <Metric
              label="Utilidad actual"
              value={formatMoney(s.profitActual, undefined, { sign: true })}
              color={s.profitActual >= 0 ? SEM.green : SEM.red}
              sub={`Margen ${formatPercent(s.marginActual, 0)}`}
            />
            <Metric
              label="Utilidad proyectada"
              value={s.profitProjected === null ? 'No disponible' : formatMoney(s.profitProjected, undefined, { sign: true })}
              color={s.profitProjected === null ? SEM.muted : s.profitProjected >= 0 ? SEM.green : SEM.red}
              sub={`Margen ${formatPercent(s.marginProjected, 0)}`}
            />
            <Metric
              label="Próximo cobro"
              value={s.nextMilestone ? formatMoney(s.nextMilestone.remaining) : '—'}
              color={s.nextMilestone?.status === 'overdue' ? SEM.red : undefined}
              sub={s.nextMilestone ? `${s.nextMilestone.milestone.concept} · ${formatDate(s.nextMilestone.milestone.due_date ?? s.nextMilestone.milestone.scheduled_date)}` : 'Sin cobros pendientes'}
            />
            <Metric label="Movimientos" value={String(s.transactionCount)} sub={`${s.milestoneViews.length} hito${s.milestoneViews.length === 1 ? '' : 's'}`} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-nx-muted">
            {p.lead && (
              <span className="flex items-center gap-1">
                <User size={11} /> {p.lead.name}
              </span>
            )}
            {(p.start_date || p.end_date) && (
              <span className="flex items-center gap-1">
                <CalendarClock size={11} /> {formatDate(p.start_date)} → {formatDate(p.end_date)}
              </span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}

type StatusFilter = 'active' | 'all' | 'archived';

export default function Projects() {
  const { can } = useAuth();
  const data = useFinanceData();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const createMutation = useCreateProject();

  const visible = useMemo(() => {
    const list = data.projectStats;
    const keep = (st: ProjectStatus) =>
      statusFilter === 'all' ? true : statusFilter === 'archived' ? st === 'archived' : st === 'active' || st === 'paused';
    return list.filter((s) => keep(s.project.status));
  }, [data.projectStats, statusFilter]);

  const handleCreate = async (form: ProjectFormData) => {
    try {
      await createMutation.mutateAsync(form);
      toast.success('Proyecto creado. Ya está disponible en movimientos, filtros y reportes.');
      setModalOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (data.loading) return <PageLoader />;

  const totals = visible.filter((s) => !s.project.is_general);
  const sum = (k: keyof ProjectStats) => totals.reduce((acc, s) => acc + (Number(s[k]) || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Proyectos"
        subtitle="Control financiero independiente por iniciativa"
        actions={
          can.canManageProjects && (
            <button onClick={() => setModalOpen(true)} className={btnPrimary}>
              <Plus size={15} /> Agregar proyecto
            </button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStatusFilter('active')} className={pill(statusFilter === 'active')}>
          Activos
        </button>
        <button onClick={() => setStatusFilter('all')} className={pill(statusFilter === 'all')}>
          Todos
        </button>
        <button onClick={() => setStatusFilter('archived')} className={pill(statusFilter === 'archived')}>
          Archivados
        </button>
        <span className="text-nx-muted text-xs ml-auto">
          Total contratado {formatMoney(sum('contractValue'))} · cobrado {formatMoney(sum('collected'))} · por cobrar {formatMoney(sum('receivable'))}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No hay proyectos en esta vista" description="Crea un proyecto o cambia el filtro de estado." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {visible.map((s) => (
            <ProjectCard key={s.project.id} s={s} />
          ))}
        </div>
      )}

      <ProjectModal open={modalOpen} saving={createMutation.isPending} onSubmit={handleCreate} onClose={() => setModalOpen(false)} />
    </div>
  );
}
