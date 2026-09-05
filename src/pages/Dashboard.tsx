import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Landmark,
  FileText,
  BadgeDollarSign,
  Clock,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Percent,
  Wallet,
  PiggyBank,
  ArrowRight,
} from 'lucide-react';
import { useFinanceData } from '../hooks/useFinanceData';
import { applyMilestoneFilters, applyTransactionFilters, emptyDashboardFilters, type DashboardFilters as DF } from '../lib/filters';
import { computeKpis, computeProjectStats, monthlySeries } from '../lib/finance';
import { formatDate, formatMoney, formatPercent } from '../lib/formatters';
import { SEM, transactionTypeColors, transactionTypeShort } from '../lib/constants';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import KpiCard from '../components/ui/KpiCard';
import IncomeExpenseChart from '../components/dashboard/IncomeExpenseChart';
import CashflowChart from '../components/dashboard/CashflowChart';
import ProfitTrendChart from '../components/dashboard/ProfitTrendChart';
import ProjectProfitChart from '../components/dashboard/ProjectProfitChart';
import IncomeDistributionChart from '../components/dashboard/IncomeDistributionChart';
import CategoryChart from '../components/dashboard/CategoryChart';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { cashEffect } from '../lib/finance';

export default function Dashboard() {
  const [filters, setFilters] = useState<DF>({ ...emptyDashboardFilters });
  const data = useFinanceData();
  const { profile } = useAuth();

  const filteredTx = useMemo(() => applyTransactionFilters(data.transactions, filters), [data.transactions, filters]);
  const filteredMv = useMemo(() => applyMilestoneFilters(data.milestoneViews, filters), [data.milestoneViews, filters]);
  const kpis = useMemo(() => computeKpis(filteredTx, filteredMv), [filteredTx, filteredMv]);
  const points = useMemo(() => monthlySeries(filteredTx, filteredMv), [filteredTx, filteredMv]);
  const stats = useMemo(
    () =>
      data.projects
        .filter((p) => !filters.project_id || p.id === filters.project_id)
        .map((p) => computeProjectStats(p, filteredTx, filteredMv, data.settings)),
    [data.projects, filteredTx, filteredMv, data.settings, filters.project_id]
  );

  // Caja inicial antes del primer mes mostrado (para la línea acumulada)
  const { rateOf } = data;
  const startingCash = useMemo(() => {
    if (points.length === 0) return data.cash.total;
    const first = points[0].month;
    const initial = data.accounts.reduce((s, a) => s + a.initial_balance * rateOf(a.currency), 0);
    const before = data.transactions
      .filter((t) => t.date.slice(0, 7) < first)
      .flatMap(cashEffect)
      .reduce((s, d) => s + d.delta, 0);
    return initial + before;
  }, [points, data.accounts, data.transactions, rateOf, data.cash.total]);

  if (data.loading) return <PageLoader />;

  const cash = data.cash;
  const firstName = (profile?.full_name || '').split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola${firstName ? `, ${firstName}` : ''}`}
        subtitle="Situación financiera consolidada de Nexus Solutions Agency"
      />

      <DashboardFilters filters={filters} onChange={setFilters} />

      {/* Saldo disponible: siempre acumulado, no depende de los filtros */}
      <div className={`bg-nx-card rounded-xl border p-5 sm:p-6 ${cash.total >= 0 ? 'border-nx-blue/40' : 'border-nx-red/40'} shadow-glow`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-nx-muted text-xs font-medium uppercase tracking-wide mb-1">Saldo disponible</p>
            <p className={`text-3xl sm:text-4xl font-bold font-heading ${cash.total >= 0 ? 'text-nx-heading' : 'text-nx-red'}`}>
              {formatMoney(cash.total)}
            </p>
            <p className="text-nx-muted text-xs mt-1">Caja real acumulada en todas las cuentas · no depende de los filtros</p>
          </div>
          <div className={`p-3 rounded-xl ${cash.total >= 0 ? 'bg-nx-blue/15' : 'bg-nx-red/15'}`}>
            <Landmark size={28} className={cash.total >= 0 ? 'text-nx-blue-light' : 'text-nx-red'} />
          </div>
        </div>
        {cash.byAccount.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {cash.byAccount.map(({ account, balance }) => (
              <span key={account?.id ?? 'none'} className="px-3 py-1.5 rounded-lg bg-nx-surface border border-nx-border text-xs">
                <span className="text-nx-muted">{account?.name ?? 'Sin cuenta asignada'}: </span>
                <span className={`font-semibold ${balance >= 0 ? 'text-nx-heading' : 'text-nx-red'}`}>{formatMoney(balance)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard label="Facturado" value={formatMoney(kpis.invoiced)} icon={FileText} color={SEM.blue} hint="Hitos facturados + ingresos directos" small />
        <KpiCard label="Cobrado" value={formatMoney(kpis.collected)} icon={BadgeDollarSign} color={SEM.green} hint={`${formatPercent(kpis.collectedPct, 0)} de lo facturado`} small />
        <KpiCard label="Por cobrar" value={formatMoney(kpis.receivable)} icon={Clock} color={SEM.yellow} hint="Cartera pendiente" small />
        <KpiCard label="Vencido" value={formatMoney(kpis.overdue)} icon={AlertOctagon} color={SEM.red} hint="Facturas con vencimiento superado" small />
        <KpiCard label="Gastos pagados" value={formatMoney(kpis.expensesPaid)} icon={TrendingDown} color={SEM.red} hint={`Registrados: ${formatMoney(kpis.expensesRegistered)}`} small />
        <KpiCard
          label="Utilidad neta"
          value={formatMoney(kpis.profitActual, undefined, { sign: true })}
          icon={TrendingUp}
          color={kpis.profitActual >= 0 ? SEM.green : SEM.red}
          hint="Cobrado − gastos pagados"
          small
        />
        <KpiCard
          label="Margen actual"
          value={formatPercent(kpis.marginActual)}
          icon={Percent}
          color={kpis.marginActual === null ? SEM.gray : kpis.marginActual >= data.settings.min_margin ? SEM.green : SEM.yellow}
          hint={`Objetivo mínimo ${data.settings.min_margin.toFixed(0)} %`}
          small
        />
        <KpiCard label="Utilidad contable" value={formatMoney(kpis.profitAccounting, undefined, { sign: true })} icon={FileText} color={SEM.cyan} hint="Facturado − gastos registrados" small />
        <KpiCard label="Retiros de socios" value={formatMoney(kpis.withdrawals)} icon={Wallet} color={SEM.gold} small />
        <KpiCard label="Aportes de socios" value={formatMoney(kpis.contributions)} icon={PiggyBank} color={SEM.purple} small />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IncomeExpenseChart points={points} />
        <CashflowChart points={points} startingCash={startingCash} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProfitTrendChart points={points} />
        <ProjectProfitChart stats={stats} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IncomeDistributionChart stats={stats} />
        <CategoryChart transactions={filteredTx} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <AlertsPanel alerts={data.alerts} />
        </div>
        <div className="xl:col-span-3 bg-nx-card rounded-xl border border-nx-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-nx-heading font-semibold font-heading">Movimientos recientes</h3>
            <Link to="/movimientos" className="text-nx-blue-light text-xs flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nx-border text-nx-muted text-xs uppercase tracking-wide">
                  <th className="text-left font-medium px-2 py-2">Fecha</th>
                  <th className="text-left font-medium px-2 py-2">Tipo</th>
                  <th className="text-left font-medium px-2 py-2">Descripción</th>
                  <th className="text-left font-medium px-2 py-2 hidden sm:table-cell">Proyecto</th>
                  <th className="text-right font-medium px-2 py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.slice(0, 10).map((t) => {
                  const positive = t.type === 'income' || t.type === 'contribution' || (t.type === 'adjustment' && t.direction === 'in');
                  const neutral = t.type === 'transfer';
                  return (
                    <tr key={t.id} className="border-b border-nx-border/50">
                      <td className="px-2 py-2 text-nx-text text-xs whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-2 py-2">
                        <Badge label={transactionTypeShort[t.type]} color={transactionTypeColors[t.type]} />
                      </td>
                      <td className="px-2 py-2 text-nx-text text-xs max-w-[220px] truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="px-2 py-2 text-nx-muted text-xs hidden sm:table-cell truncate max-w-[160px]">{t.project?.name ?? '—'}</td>
                      <td className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap" style={{ color: neutral ? SEM.muted : positive ? SEM.green : SEM.red }}>
                        {neutral ? '' : positive ? '+' : '−'}
                        {formatMoney(t.base_amount)}
                      </td>
                    </tr>
                  );
                })}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-nx-muted text-sm">
                      No hay movimientos con los filtros actuales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
