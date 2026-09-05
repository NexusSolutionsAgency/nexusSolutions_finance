import { useMemo, useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceData } from '../hooks/useFinanceData';
import { usePeople } from '../hooks/useCatalogs';
import { applyMilestoneFilters, applyTransactionFilters } from '../lib/filters';
import { computeKpis, computePersonSummary, computeProjectStats, isExpenseRegistered, monthlySeries, balanceLabel } from '../lib/finance';
import { formatDate, formatMoney, formatMonthLong, formatPercent, todayISO } from '../lib/formatters';
import { milestoneStatusLabels, transactionTypeLabels } from '../lib/constants';
import { exportToExcel, exportToPdf, type PdfKpi } from '../lib/export';
import { btnPrimary, btnSecondary, errorMessage, inputClass, selectClass, tableCell, tableHead } from '../lib/ui';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import Field from '../components/ui/Field';
import { transactionsToRows } from '../lib/transactions';

type ReportKey = 'financial' | 'invoiced_vs_collected' | 'receivables' | 'expenses_by_category' | 'cashflow' | 'people' | 'budget_vs_actual' | 'transactions';

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  { key: 'financial', label: 'Estado financiero por proyecto', description: 'Contratado, facturado, cobrado, cartera, gastos, utilidad y margen, consolidado y por proyecto.' },
  { key: 'invoiced_vs_collected', label: 'Facturado frente a cobrado', description: 'Comparación mensual entre lo facturado y lo efectivamente cobrado.' },
  { key: 'receivables', label: 'Cartera pendiente y vencida', description: 'Hitos facturados sin cobro completo, con días de atraso.' },
  { key: 'expenses_by_category', label: 'Gastos por categoría', description: 'Gastos registrados agrupados por categoría y proyecto.' },
  { key: 'cashflow', label: 'Rentabilidad y flujo de caja', description: 'Entradas, salidas, utilidad y caja acumulada por mes.' },
  { key: 'people', label: 'Movimientos por persona', description: 'Reembolsos, aportes, retiros y saldos por socio o colaborador.' },
  { key: 'budget_vs_actual', label: 'Presupuesto frente a resultado real', description: 'Presupuesto de costos y valor contratado frente a lo ejecutado.' },
  { key: 'transactions', label: 'Listado de movimientos', description: 'Todos los movimientos con los filtros activos.' },
];

interface Built {
  columns: string[];
  rows: (string | number)[][];
  excel: Record<string, unknown>[];
  kpis?: PdfKpi[];
  rightAlign: number[];
}

export default function Reports() {
  const data = useFinanceData();
  const { data: people } = usePeople();
  const [report, setReport] = useState<ReportKey>('financial');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(() => ({ project_id: projectId, date_from: dateFrom, date_to: dateTo }), [projectId, dateFrom, dateTo]);
  const tx = useMemo(() => applyTransactionFilters(data.transactions, filters), [data.transactions, filters]);
  const mv = useMemo(() => applyMilestoneFilters(data.milestoneViews, filters), [data.milestoneViews, filters]);
  const projects = useMemo(() => data.projects.filter((p) => !projectId || p.id === projectId), [data.projects, projectId]);

  const built = useMemo<Built>(() => {
    const m = (n: number) => formatMoney(n);
    switch (report) {
      case 'financial': {
        const stats = projects.map((p) => computeProjectStats(p, tx, mv, data.settings));
        const total = computeKpis(tx, mv);
        const rows = stats.map((s) => [
          s.project.name,
          m(s.contractValue),
          m(s.invoiced),
          m(s.collected),
          m(s.receivable),
          m(s.overdue),
          m(s.expensesPaid),
          m(s.profitActual),
          formatPercent(s.marginActual),
          s.profitProjected === null ? 'No disponible' : m(s.profitProjected),
          formatPercent(s.marginProjected),
        ]);
        rows.push(['TOTAL', m(stats.reduce((a, s) => a + s.contractValue, 0)), m(total.invoiced), m(total.collected), m(total.receivable), m(total.overdue), m(total.expensesPaid), m(total.profitActual), formatPercent(total.marginActual), '', '']);
        return {
          columns: ['Proyecto', 'Contratado', 'Facturado', 'Cobrado', 'Por cobrar', 'Vencido', 'Gastos pagados', 'Utilidad actual', 'Margen', 'Utilidad proyectada', 'Margen proy.'],
          rows,
          rightAlign: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          excel: stats.map((s) => ({
            Proyecto: s.project.name,
            Estado: s.project.status,
            Contratado: s.contractValue,
            Facturado: s.invoiced,
            Cobrado: s.collected,
            'Por cobrar': s.receivable,
            Vencido: s.overdue,
            'Gastos pagados': s.expensesPaid,
            'Gastos registrados': s.expensesRegistered,
            'Costos proyectados': s.expensesProjected,
            'Utilidad actual': s.profitActual,
            'Utilidad contable': s.profitAccounting,
            'Margen actual %': s.marginActual,
            'Utilidad proyectada': s.profitProjected,
            'Margen proyectado %': s.marginProjected,
            '% cobrado': s.collectedPct,
          })),
          kpis: [
            { label: 'Facturado', value: m(total.invoiced) },
            { label: 'Cobrado', value: m(total.collected) },
            { label: 'Por cobrar', value: m(total.receivable) },
            { label: 'Gastos pagados', value: m(total.expensesPaid) },
            { label: 'Utilidad', value: m(total.profitActual) },
          ],
        };
      }
      case 'invoiced_vs_collected': {
        const pts = monthlySeries(tx, mv);
        return {
          columns: ['Mes', 'Facturado', 'Cobrado', 'Diferencia', '% cobrado'],
          rows: pts.map((p) => [formatMonthLong(p.month), m(p.invoiced), m(p.income), m(p.income - p.invoiced), p.invoiced > 0 ? formatPercent((p.income / p.invoiced) * 100, 0) : '—']),
          rightAlign: [1, 2, 3, 4],
          excel: pts.map((p) => ({ Mes: p.month, Facturado: p.invoiced, Cobrado: p.income, Diferencia: p.income - p.invoiced })),
        };
      }
      case 'receivables': {
        const open = mv.filter((v) => v.milestone.status === 'invoiced' && v.status !== 'paid' && v.status !== 'cancelled');
        const total = open.reduce((s, v) => s + v.remaining, 0);
        const overdue = open.filter((v) => v.status === 'overdue').reduce((s, v) => s + v.remaining, 0);
        return {
          columns: ['Proyecto', 'Cliente', 'Concepto', 'Factura', 'Vencimiento', 'Días atraso', 'Valor', 'Cobrado', 'Pendiente', 'Estado', 'Responsable'],
          rows: open.map((v) => [
            v.milestone.project?.name ?? '',
            v.milestone.project?.client?.name ?? '',
            v.milestone.concept,
            v.milestone.invoice_number ?? '',
            formatDate(v.milestone.due_date),
            v.daysOverdue,
            m(v.milestone.base_amount),
            m(v.collected),
            m(v.remaining),
            milestoneStatusLabels[v.status],
            v.milestone.responsible?.name ?? '',
          ]),
          rightAlign: [5, 6, 7, 8],
          excel: open.map((v) => ({
            Proyecto: v.milestone.project?.name ?? '',
            Cliente: v.milestone.project?.client?.name ?? '',
            Concepto: v.milestone.concept,
            Factura: v.milestone.invoice_number ?? '',
            Vencimiento: v.milestone.due_date ?? '',
            'Días de atraso': v.daysOverdue,
            Valor: v.milestone.base_amount,
            Cobrado: v.collected,
            Pendiente: v.remaining,
            Estado: milestoneStatusLabels[v.status],
            Responsable: v.milestone.responsible?.name ?? '',
            'Próxima acción': v.milestone.next_action ?? '',
          })),
          kpis: [
            { label: 'Cartera pendiente', value: m(total) },
            { label: 'Cartera vencida', value: m(overdue) },
            { label: 'Facturas abiertas', value: String(open.length) },
          ],
        };
      }
      case 'expenses_by_category': {
        const map = new Map<string, { category: string; project: string; paid: number; pending: number; total: number }>();
        tx.filter(isExpenseRegistered).forEach((t) => {
          const k = `${t.category?.name ?? 'Sin categoría'}|${t.project?.name ?? ''}`;
          const r = map.get(k) ?? { category: t.category?.name ?? 'Sin categoría', project: t.project?.name ?? '', paid: 0, pending: 0, total: 0 };
          if (t.status === 'pending') r.pending += t.base_gross_amount;
          else r.paid += t.base_gross_amount;
          r.total += t.base_gross_amount;
          map.set(k, r);
        });
        const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
        const total = rows.reduce((s, r) => s + r.total, 0);
        return {
          columns: ['Categoría', 'Proyecto', 'Pagado', 'Pendiente', 'Total', '% del total'],
          rows: rows.map((r) => [r.category, r.project, m(r.paid), m(r.pending), m(r.total), total > 0 ? formatPercent((r.total / total) * 100, 1) : '—']),
          rightAlign: [2, 3, 4, 5],
          excel: rows.map((r) => ({ Categoría: r.category, Proyecto: r.project, Pagado: r.paid, Pendiente: r.pending, Total: r.total })),
          kpis: [{ label: 'Gastos registrados', value: m(total) }],
        };
      }
      case 'cashflow': {
        const pts = monthlySeries(tx, mv);
        return {
          columns: ['Mes', 'Ingresos cobrados', 'Gastos pagados', 'Utilidad', 'Entradas de caja', 'Salidas de caja', 'Flujo neto', 'Caja acumulada'],
          rows: pts.map((p) => [formatMonthLong(p.month), m(p.income), m(p.expenses), m(p.net), m(p.cashIn), m(p.cashOut), m(p.cashNet), m(p.cumulativeCash)]),
          rightAlign: [1, 2, 3, 4, 5, 6, 7],
          excel: pts.map((p) => ({
            Mes: p.month,
            'Ingresos cobrados': p.income,
            'Gastos pagados': p.expenses,
            Utilidad: p.net,
            'Entradas de caja': p.cashIn,
            'Salidas de caja': p.cashOut,
            'Flujo neto': p.cashNet,
            'Caja acumulada (periodo)': p.cumulativeCash,
          })),
          kpis: [
            { label: 'Ingresos', value: m(pts.reduce((s, p) => s + p.income, 0)) },
            { label: 'Gastos', value: m(pts.reduce((s, p) => s + p.expenses, 0)) },
            { label: 'Utilidad', value: m(pts.reduce((s, p) => s + p.net, 0)) },
            { label: 'Saldo disponible hoy', value: m(data.cash.total) },
          ],
        };
      }
      case 'people': {
        const list = (people ?? []).map((p) => computePersonSummary(p, tx)).filter((s) => s.transactionCount > 0 || s.balance !== 0);
        return {
          columns: ['Persona', 'Tipo', 'Pagó de su bolsillo', 'Pendiente reembolso', 'Reembolsos', 'Aportes', 'Retiros', 'Pagos pendientes', 'Saldo', 'Situación'],
          rows: list.map((s) => [
            s.person.name,
            s.person.type,
            m(s.expensesPaidByPerson),
            m(s.pendingReimbursement),
            m(s.reimbursementsReceived),
            m(s.contributions),
            m(s.withdrawals),
            m(s.pendingPayments),
            m(s.balance),
            balanceLabel(s.balance).text,
          ]),
          rightAlign: [2, 3, 4, 5, 6, 7, 8],
          excel: list.map((s) => ({
            Persona: s.person.name,
            Tipo: s.person.type,
            'Pagó de su bolsillo': s.expensesPaidByPerson,
            'Pendiente de reembolso': s.pendingReimbursement,
            'Reembolsos recibidos': s.reimbursementsReceived,
            Aportes: s.contributions,
            Retiros: s.withdrawals,
            'Pagos pendientes': s.pendingPayments,
            Saldo: s.balance,
            Situación: balanceLabel(s.balance).text,
          })),
        };
      }
      case 'budget_vs_actual': {
        const stats = projects.filter((p) => !p.is_general).map((p) => computeProjectStats(p, tx, mv, data.settings));
        return {
          columns: ['Proyecto', 'Presupuesto costos', 'Costos registrados', 'Diferencia', 'Ejecución', 'Valor contratado', 'Cobrado', 'Diferencia', '% cobrado'],
          rows: stats.map((s) => [
            s.project.name,
            m(s.budget),
            m(s.expensesRegistered),
            m(s.budget - s.expensesRegistered),
            s.budget > 0 ? formatPercent((s.expensesRegistered / s.budget) * 100, 0) : '—',
            m(s.contractValue),
            m(s.collected),
            m(s.contractValue - s.collected),
            s.contractValue > 0 ? formatPercent((s.collected / s.contractValue) * 100, 0) : '—',
          ]),
          rightAlign: [1, 2, 3, 4, 5, 6, 7, 8],
          excel: stats.map((s) => ({
            Proyecto: s.project.name,
            'Presupuesto costos': s.budget,
            'Costos registrados': s.expensesRegistered,
            'Diferencia costos': s.budget - s.expensesRegistered,
            'Valor contratado': s.contractValue,
            Cobrado: s.collected,
            'Diferencia ingresos': s.contractValue - s.collected,
          })),
        };
      }
      case 'transactions':
      default:
        return {
          columns: ['Fecha', 'Tipo', 'Estado', 'Descripción', 'Proyecto', 'Categoría', 'Tercero', 'Cuenta', 'Valor neto', 'Bruto'],
          rows: tx.map((t) => [
            formatDate(t.date),
            transactionTypeLabels[t.type],
            t.status,
            t.description,
            t.project?.name ?? '',
            t.category?.name ?? '',
            t.person?.name ?? t.client?.name ?? '',
            t.account?.name ?? '',
            m(t.base_amount),
            m(t.base_gross_amount),
          ]),
          rightAlign: [8, 9],
          excel: transactionsToRows(tx),
        };
    }
  }, [report, projects, tx, mv, data.settings, data.cash.total, people]);

  const current = REPORTS.find((r) => r.key === report)!;
  const filtersText = [
    projectId ? `Proyecto: ${data.projectName(projectId)}` : 'Todos los proyectos',
    dateFrom || dateTo ? `Periodo: ${dateFrom ? formatDate(dateFrom) : 'inicio'} → ${dateTo ? formatDate(dateTo) : todayISO() && 'hoy'}` : 'Todo el historial',
  ].join(' · ');

  const doExport = async (kind: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      const slug = `nexus-${report.replace(/_/g, '-')}`;
      if (kind === 'excel') {
        exportToExcel([{ name: current.label.slice(0, 31), rows: built.excel }], slug);
      } else {
        await exportToPdf(
          {
            title: current.label,
            subtitle: current.description,
            filtersText,
            kpis: built.kpis,
            sections: [{ title: current.label, columns: built.columns, rows: built.rows, rightAlign: built.rightAlign }],
            companyName: data.settings.company_name,
          },
          slug
        );
      }
      toast.success(kind === 'pdf' ? 'PDF generado' : 'Excel generado');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (data.loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        subtitle="Exportaciones y análisis con los filtros activos"
        actions={
          <>
            <button onClick={() => doExport('excel')} disabled={exporting} className={btnSecondary}>
              <FileDown size={15} /> Excel
            </button>
            <button onClick={() => doExport('pdf')} disabled={exporting} className={btnPrimary}>
              <FileText size={15} /> {exporting ? 'Generando…' : 'PDF'}
            </button>
          </>
        }
      />

      <div className="bg-nx-card rounded-xl border border-nx-border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Reporte" className="md:col-span-2">
          <select value={report} onChange={(e) => setReport(e.target.value as ReportKey)} className={selectClass}>
            {REPORTS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="text-nx-muted text-[11px] mt-1">{current.description}</p>
        </Field>
        <Field label="Proyecto">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Periodo">
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
        </Field>
      </div>

      {built.kpis && (
        <div className="flex flex-wrap gap-3">
          {built.kpis.map((k) => (
            <div key={k.label} className="bg-nx-card rounded-lg border border-nx-border px-4 py-2.5">
              <p className="text-nx-muted text-[10px] uppercase tracking-wide">{k.label}</p>
              <p className="text-nx-heading font-semibold">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-nx-card rounded-xl border border-nx-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nx-border">
                {built.columns.map((c, i) => (
                  <th key={c} className={`${tableHead} ${built.rightAlign.includes(i) ? 'text-right' : ''}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {built.rows.map((r, ri) => (
                <tr key={ri} className={`border-b border-nx-border/50 ${String(r[0]) === 'TOTAL' ? 'bg-nx-surface/60 font-semibold' : ''}`}>
                  {r.map((c, ci) => (
                    <td key={ci} className={`${tableCell} ${built.rightAlign.includes(ci) ? 'text-right text-nx-heading whitespace-nowrap' : 'text-nx-text'}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
              {built.rows.length === 0 && (
                <tr>
                  <td colSpan={built.columns.length} className="px-4 py-10 text-center text-nx-muted">
                    Sin datos para los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-nx-muted text-[11px] px-4 py-3 border-t border-nx-border">{filtersText}</p>
      </div>
    </div>
  );
}
