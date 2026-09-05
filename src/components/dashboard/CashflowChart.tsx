import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { axisTick, chartTooltipStyle, gridStroke, moneyFormatter, moneyTick } from '../../lib/charts';
import type { MonthPoint } from '../../lib/finance';
import { formatMonth } from '../../lib/formatters';
import { SEM } from '../../lib/constants';

export default function CashflowChart({ points, startingCash = 0 }: { points: MonthPoint[]; startingCash?: number }) {
  const data = points.map((p) => ({
    month: formatMonth(p.month),
    'Flujo neto': Math.round(p.cashNet),
    'Caja acumulada': Math.round(startingCash + p.cumulativeCash),
  }));
  return (
    <ChartCard title="Flujo de caja" subtitle="Entradas menos salidas reales por mes y saldo acumulado" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" tick={axisTick} />
          <YAxis tick={axisTick} tickFormatter={moneyTick} width={70} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={moneyFormatter} cursor={{ fill: '#ffffff08' }} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          <Bar dataKey="Flujo neto" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d['Flujo neto'] >= 0 ? SEM.green : SEM.red} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="Caja acumulada" stroke={SEM.blue} strokeWidth={2} dot={{ r: 3, fill: SEM.blue }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
