import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../ui/ChartCard';
import { axisTick, chartTooltipStyle, gridStroke, moneyFormatter, moneyTick } from '../../lib/charts';
import type { ProjectionPoint } from '../../lib/finance';
import { formatMonth, formatMonthLong, formatMoney } from '../../lib/formatters';
import { SEM } from '../../lib/constants';

export default function ProjectionChart({ points }: { points: ProjectionPoint[] }) {
  const data = points.map((p) => ({
    month: `${formatMonth(p.month)}${p.isProjection ? ' *' : ''}`,
    Entradas: Math.round(p.inflow),
    Salidas: Math.round(-p.outflow),
    Saldo: Math.round(p.balance),
    'Real del mes': p.actualNet !== null ? Math.round(p.actualNet) : null,
    isProjection: p.isProjection,
  }));

  const negativeMonths = points.filter((p) => p.isProjection && p.balance < 0);
  const breakEven = (() => {
    let prevNeg = false;
    for (const p of points.filter((x) => x.isProjection)) {
      if (prevNeg && p.balance >= 0) return p.month;
      prevNeg = p.balance < 0;
    }
    return null;
  })();
  const minBalance = points.filter((p) => p.isProjection).reduce((m, p) => Math.min(m, p.balance), Infinity);

  return (
    <ChartCard
      title="Flujo de caja proyectado"
      subtitle="Meses con * son proyección: cobros pendientes por probabilidad y gastos programados"
      empty={data.length === 0}
      height="h-80"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={moneyTick} width={70} />
              <ReferenceLine y={0} stroke={SEM.gray} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => moneyFormatter(Math.abs(Number(v)))} cursor={{ fill: '#ffffff08' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="Entradas" stackId="flow" fill={SEM.green} radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Salidas" stackId="flow" fill={SEM.red} radius={[0, 0, 3, 3]} opacity={0.85} />
              <Line type="monotone" dataKey="Real del mes" stroke={SEM.gold} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: SEM.gold }} connectNulls={false} />
              <Line type="monotone" dataKey="Saldo" stroke={SEM.blue} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Bar dataKey="Saldo" hide>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.Saldo < 0 ? SEM.red : SEM.blue} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-nx-muted pt-2 border-t border-nx-border mt-2">
          <span>
            Saldo mínimo proyectado:{' '}
            <span className={minBalance < 0 ? 'text-nx-red font-semibold' : 'text-nx-green font-semibold'}>{Number.isFinite(minBalance) ? formatMoney(minBalance) : '—'}</span>
          </span>
          <span>
            Meses en negativo:{' '}
            <span className={negativeMonths.length ? 'text-nx-red font-semibold' : 'text-nx-green font-semibold'}>
              {negativeMonths.length ? negativeMonths.map((p) => formatMonth(p.month)).join(', ') : 'ninguno'}
            </span>
          </span>
          {breakEven && (
            <span>
              Punto de equilibrio: <span className="text-nx-blue-light font-semibold">{formatMonthLong(breakEven)}</span>
            </span>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
