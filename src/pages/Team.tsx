import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, RefreshCw, PiggyBank, Wallet, HandCoins, Clock, ArrowUpRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFinanceData } from '../hooks/useFinanceData';
import { usePeople } from '../hooks/useCatalogs';
import { useCreateTransaction } from '../hooks/useTransactions';
import { balanceLabel, computePersonSummary, type PersonSummary } from '../lib/finance';
import type { PersonType, TransactionFormData } from '../types';
import { formatMoney } from '../lib/formatters';
import { personTypeColors, personTypeLabels, SEM } from '../lib/constants';
import { btnPrimary, btnSecondary, errorMessage, pill } from '../lib/ui';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionModal from '../components/transactions/TransactionModal';

const toneColor = { green: SEM.green, yellow: SEM.yellow, gray: SEM.muted };

function Row({ icon: Icon, label, value, color }: { icon: typeof User; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-nx-muted">
        <Icon size={13} style={{ color }} /> {label}
      </span>
      <span className="font-medium" style={{ color }}>
        {formatMoney(value)}
      </span>
    </div>
  );
}

export default function Team() {
  const { can } = useAuth();
  const data = useFinanceData();
  const { data: people, isLoading } = usePeople();
  const [typeFilter, setTypeFilter] = useState<PersonType | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [detail, setDetail] = useState<PersonSummary | null>(null);
  const [reimbursing, setReimbursing] = useState<PersonSummary | null>(null);
  const createTx = useCreateTransaction();

  const summaries = useMemo(
    () =>
      (people ?? [])
        .filter((p) => showInactive || p.active)
        .filter((p) => !typeFilter || p.type === typeFilter)
        .map((p) => computePersonSummary(p, data.transactions))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.person.name.localeCompare(b.person.name)),
    [people, showInactive, typeFilter, data.transactions]
  );

  const totals = useMemo(() => {
    const all = (people ?? []).map((p) => computePersonSummary(p, data.transactions));
    return {
      owedByNexus: all.filter((s) => s.balance > 0).reduce((s, x) => s + x.balance, 0),
      owedToNexus: all.filter((s) => s.balance < 0).reduce((s, x) => s + -x.balance, 0),
      contributions: all.reduce((s, x) => s + x.contributions, 0),
      withdrawals: all.reduce((s, x) => s + x.withdrawals, 0),
    };
  }, [people, data.transactions]);

  const handleReimburse = async (form: TransactionFormData) => {
    try {
      await createTx.mutateAsync(form);
      toast.success('Reembolso registrado');
      setReimbursing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (data.loading || isLoading) return <PageLoader />;

  const reimburseInitial = (s: PersonSummary): Partial<TransactionFormData> => ({
    type: 'reimbursement',
    status: 'done',
    person_id: s.person.id,
    amount: s.pendingReimbursement > 0 ? s.pendingReimbursement : 0,
    description: `Reembolso a ${s.person.name}`,
    mark_reimbursed: true,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipo, socios y terceros"
        subtitle="Quién pagó, quién debe recibir y a qué proyecto pertenece cada saldo"
        actions={
          can.canManageCatalogs && (
            <Link to="/configuracion?tab=people" className={btnSecondary}>
              <Plus size={14} /> Gestionar personas
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-nx-card rounded-xl border border-nx-border p-4">
          <p className="text-nx-muted text-xs uppercase tracking-wide">Nexus debe a personas</p>
          <p className="text-xl font-bold font-heading" style={{ color: totals.owedByNexus > 0 ? SEM.yellow : SEM.muted }}>
            {formatMoney(totals.owedByNexus)}
          </p>
        </div>
        <div className="bg-nx-card rounded-xl border border-nx-border p-4">
          <p className="text-nx-muted text-xs uppercase tracking-wide">Personas deben a Nexus</p>
          <p className="text-xl font-bold font-heading" style={{ color: totals.owedToNexus > 0 ? SEM.green : SEM.muted }}>
            {formatMoney(totals.owedToNexus)}
          </p>
        </div>
        <div className="bg-nx-card rounded-xl border border-nx-border p-4">
          <p className="text-nx-muted text-xs uppercase tracking-wide">Aportes de socios</p>
          <p className="text-xl font-bold font-heading" style={{ color: SEM.purple }}>
            {formatMoney(totals.contributions)}
          </p>
        </div>
        <div className="bg-nx-card rounded-xl border border-nx-border p-4">
          <p className="text-nx-muted text-xs uppercase tracking-wide">Retiros de socios</p>
          <p className="text-xl font-bold font-heading" style={{ color: SEM.gold }}>
            {formatMoney(totals.withdrawals)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTypeFilter('')} className={pill(typeFilter === '')}>
          Todos
        </button>
        {(Object.keys(personTypeLabels) as PersonType[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={pill(typeFilter === t)}>
            {personTypeLabels[t]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-nx-muted cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-nx-blue" />
          Mostrar inactivos
        </label>
      </div>

      {summaries.length === 0 ? (
        <EmptyState icon={User} title="No hay personas en esta vista" description="Agrega socios, empleados, contratistas y proveedores desde Configuración → Personas." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {summaries.map((s) => {
            const bl = balanceLabel(s.balance);
            return (
              <div key={s.person.id} className={`bg-nx-card rounded-xl border border-nx-border p-5 ${!s.person.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-full bg-nx-blue/15 shrink-0">
                      <User className="text-nx-blue-light" size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-nx-heading font-semibold truncate">{s.person.name}</h3>
                      <Badge label={personTypeLabels[s.person.type]} color={personTypeColors[s.person.type]} />
                    </div>
                  </div>
                  <button onClick={() => setDetail(s)} className="text-nx-muted hover:text-nx-blue-light text-xs flex items-center gap-1 shrink-0">
                    {s.transactionCount} mov. <ArrowUpRight size={12} />
                  </button>
                </div>

                <div className="space-y-2">
                  <Row icon={HandCoins} label="Pagó de su bolsillo" value={s.expensesPaidByPerson} color={SEM.red} />
                  <Row icon={Clock} label="Pendiente de reembolso" value={s.pendingReimbursement} color={s.pendingReimbursement > 0 ? SEM.yellow : SEM.muted} />
                  <Row icon={RefreshCw} label="Reembolsos recibidos" value={s.reimbursementsReceived} color={SEM.cyan} />
                  {s.pendingPayments > 0 && <Row icon={Clock} label="Pagos / comisiones pendientes" value={s.pendingPayments} color={SEM.yellow} />}
                  {(s.contributions > 0 || s.person.type === 'partner' || s.person.type === 'investor') && (
                    <Row icon={PiggyBank} label="Aportes" value={s.contributions} color={SEM.purple} />
                  )}
                  {(s.withdrawals > 0 || s.person.type === 'partner') && <Row icon={Wallet} label="Retiros" value={s.withdrawals} color={SEM.gold} />}
                </div>

                <div className="border-t border-nx-border mt-4 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: toneColor[bl.tone] }}>
                      {bl.text}
                    </span>
                    <span className="font-bold font-heading" style={{ color: toneColor[bl.tone] }}>
                      {formatMoney(Math.abs(s.balance))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-nx-muted text-[11px]">
                      {s.projectIds.length} proyecto{s.projectIds.length === 1 ? '' : 's'} relacionado{s.projectIds.length === 1 ? '' : 's'}
                    </p>
                    {can.isStaff && s.balance > 0 && s.pendingReimbursement > 0 && (
                      <button onClick={() => setReimbursing(s)} className="text-nx-blue-light text-xs hover:underline">
                        Registrar reembolso
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!detail} title={detail?.person.name ?? ''} subtitle="Movimientos relacionados con esta persona" onClose={() => setDetail(null)} size="xl">
        <div className="p-5 space-y-4">
          {detail && (
            <>
              <div className="flex flex-wrap gap-2">
                {detail.projectIds.map((pid) => (
                  <Link key={pid} to={`/proyectos/${pid}`} className="px-2.5 py-1 rounded-lg bg-nx-surface border border-nx-border text-xs text-nx-text hover:border-nx-blue/50">
                    {data.projectName(pid)}
                  </Link>
                ))}
              </div>
              <TransactionTable
                transactions={data.transactions.filter((t) => t.person_id === detail.person.id || t.paid_by_person_id === detail.person.id)}
                compact
                canEdit={() => false}
                onEdit={() => undefined}
                onDelete={() => undefined}
                pageSize={10}
              />
            </>
          )}
        </div>
      </Modal>

      <TransactionModal
        open={!!reimbursing}
        initial={reimbursing ? reimburseInitial(reimbursing) : undefined}
        saving={createTx.isPending}
        onSubmit={handleReimburse}
        onClose={() => setReimbursing(null)}
      />

      {can.isStaff && (
        <div className="text-right">
          <button onClick={() => setReimbursing(summaries[0] ?? null)} className={`${btnPrimary} ${summaries.length === 0 ? 'hidden' : ''}`}>
            <RefreshCw size={14} /> Registrar reembolso
          </button>
        </div>
      )}
    </div>
  );
}
