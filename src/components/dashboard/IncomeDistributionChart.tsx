import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { chartTooltipStyle, moneyFormatter } from '../../lib/charts';
import type { ProjectStats } from '../../lib/finance';
import { CHART_COLORS } from '../../lib/constants';

export default function IncomeDistributionChart({ stats }: { stats: ProjectStats[] }) {
  const data = stats
    .filter((s) => s.collected > 0)
    .map((s) => ({ name: s.project.name, value: Math.round(s.collected) }))
    .sort((a, b) => b.value - a.value);

  return (
    <ChartCard title="Distribución de ingresos" subtitle="Ingresos cobrados por proyecto" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={92} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} formatter={moneyFormatter} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
