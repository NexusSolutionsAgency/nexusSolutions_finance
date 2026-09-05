import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { axisTick, chartTooltipStyle, gridStroke, moneyFormatter, moneyTick } from '../../lib/charts';
import type { MonthPoint } from '../../lib/finance';
import { formatMonth } from '../../lib/formatters';
import { SEM } from '../../lib/constants';

export default function ProfitTrendChart({ points }: { points: MonthPoint[] }) {
  const data = points.map((p) => ({ month: formatMonth(p.month), 'Utilidad del mes': Math.round(p.net) }));
  return (
    <ChartCard title="Utilidad mensual" subtitle="Ingresos cobrados menos gastos pagados" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} />
          <YAxis tick={axisTick} tickFormatter={moneyTick} width={70} />
          <ReferenceLine y={0} stroke={SEM.gray} strokeDasharray="4 4" />
          <Tooltip contentStyle={chartTooltipStyle} formatter={moneyFormatter} />
          <Line type="monotone" dataKey="Utilidad del mes" stroke={SEM.blue} strokeWidth={2.5} dot={{ r: 3, fill: SEM.blue }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
