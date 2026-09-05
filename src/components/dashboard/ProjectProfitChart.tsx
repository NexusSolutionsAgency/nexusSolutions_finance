import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { axisTick, chartTooltipStyle, gridStroke, moneyFormatter, moneyTick } from '../../lib/charts';
import type { ProjectStats } from '../../lib/finance';
import { SEM } from '../../lib/constants';

export default function ProjectProfitChart({ stats }: { stats: ProjectStats[] }) {
  const data = stats
    .filter((s) => s.collected > 0 || s.expensesPaid > 0)
    .map((s) => ({
      name: s.project.name,
      Utilidad: Math.round(s.profitActual),
      Cobrado: Math.round(s.collected),
      Gastos: Math.round(s.expensesPaid),
      margin: s.marginActual,
    }))
    .sort((a, b) => b.Utilidad - a.Utilidad);

  return (
    <ChartCard title="Rentabilidad por proyecto" subtitle="Utilidad actual (cobrado − gastos pagados)" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={axisTick} tickFormatter={moneyTick} />
          <YAxis type="category" dataKey="name" tick={axisTick} width={120} />
          <ReferenceLine x={0} stroke={SEM.gray} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [moneyFormatter(value), String(name)]}
            labelFormatter={(label, payload) => {
              const m = payload?.[0]?.payload?.margin as number | null | undefined;
              return `${label}${m !== null && m !== undefined ? ` · margen ${m.toFixed(1)} %` : ''}`;
            }}
            cursor={{ fill: '#ffffff08' }}
          />
          <Bar dataKey="Utilidad" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.Utilidad >= 0 ? SEM.green : SEM.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
