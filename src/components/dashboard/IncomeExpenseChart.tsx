import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { axisTick, chartTooltipStyle, gridStroke, moneyFormatter, moneyTick } from '../../lib/charts';
import type { MonthPoint } from '../../lib/finance';
import { formatMonth } from '../../lib/formatters';
import { SEM } from '../../lib/constants';

export default function IncomeExpenseChart({ points }: { points: MonthPoint[] }) {
  const data = points.map((p) => ({
    month: formatMonth(p.month),
    'Ingresos cobrados': Math.round(p.income),
    'Gastos pagados': Math.round(p.expenses),
    Facturado: Math.round(p.invoiced),
  }));
  return (
    <ChartCard title="Ingresos frente a gastos" subtitle="Cobrado y facturado por mes frente a gastos pagados" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} />
          <YAxis tick={axisTick} tickFormatter={moneyTick} width={70} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={moneyFormatter} cursor={{ fill: '#ffffff08' }} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          <Bar dataKey="Facturado" fill={SEM.blue} radius={[4, 4, 0, 0]} opacity={0.55} />
          <Bar dataKey="Ingresos cobrados" fill={SEM.green} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Gastos pagados" fill={SEM.red} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
