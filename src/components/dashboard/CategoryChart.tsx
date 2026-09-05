import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { chartTooltipStyle, moneyFormatter } from '../../lib/charts';
import type { Transaction } from '../../types';
import { CHART_COLORS } from '../../lib/constants';
import { isExpenseRegistered } from '../../lib/finance';

export default function CategoryChart({ transactions }: { transactions: Transaction[] }) {
  const map = new Map<string, number>();
  transactions.filter(isExpenseRegistered).forEach((t) => {
    const name = t.category?.name ?? 'Sin categoría';
    map.set(name, (map.get(name) ?? 0) + t.base_gross_amount);
  });
  const data = Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 9);

  return (
    <ChartCard title="Gastos por categoría" subtitle="Gastos registrados (pagados y pendientes)" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={92} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} formatter={moneyFormatter} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
