import { useCallback, useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useMilestones } from './useMilestones';
import { useProjects } from './useProjects';
import { useAccounts, useCurrencies } from './useCatalogs';
import { defaultSettings, useSettings } from './useSettings';
import { buildMilestoneViews, computeAlerts, computeCash, computeProjectStats } from '../lib/finance';
import { formatMoney } from '../lib/formatters';

/**
 * Carga todo lo necesario para KPIs, caja, proyectos y alertas
 * y calcula las vistas derivadas una sola vez.
 */
export function useFinanceData() {
  const tx = useTransactions();
  const ms = useMilestones();
  const pr = useProjects();
  const ac = useAccounts();
  const cu = useCurrencies();
  const st = useSettings();

  const transactions = useMemo(() => tx.data ?? [], [tx.data]);
  const milestones = useMemo(() => ms.data ?? [], [ms.data]);
  const projects = useMemo(() => pr.data ?? [], [pr.data]);
  const accounts = useMemo(() => ac.data ?? [], [ac.data]);
  const currencies = useMemo(() => cu.data ?? [], [cu.data]);
  const settings = st.data ?? defaultSettings;

  const rateOf = useCallback(
    (code: string) => currencies.find((c) => c.code === code)?.rate_to_base ?? 1,
    [currencies]
  );

  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? '—',
    [projects]
  );

  const milestoneViews = useMemo(() => buildMilestoneViews(milestones, transactions), [milestones, transactions]);
  const cash = useMemo(() => computeCash(transactions, accounts, rateOf), [transactions, accounts, rateOf]);
  const projectStats = useMemo(
    () => projects.map((p) => computeProjectStats(p, transactions, milestoneViews, settings)),
    [projects, transactions, milestoneViews, settings]
  );
  const alerts = useMemo(
    () =>
      computeAlerts(
        projectStats.filter((p) => p.project.status !== 'archived'),
        milestoneViews.filter((v) => v.milestone.project?.status !== 'archived'),
        transactions,
        cash.total,
        settings,
        projectName,
        (n) => formatMoney(n)
      ),
    [projectStats, milestoneViews, transactions, cash.total, settings, projectName]
  );

  return {
    transactions,
    milestones,
    milestoneViews,
    projects,
    accounts,
    currencies,
    settings,
    cash,
    projectStats,
    alerts,
    rateOf,
    projectName,
    loading: tx.isLoading || ms.isLoading || pr.isLoading || ac.isLoading || cu.isLoading || st.isLoading,
    error: tx.error || ms.error || pr.error || ac.error || cu.error || st.error,
  };
}
