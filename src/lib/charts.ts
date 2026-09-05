import { formatMoney } from './formatters';

export const chartTooltipStyle = {
  backgroundColor: '#0f1d32',
  border: '1px solid #26375a',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: 12,
};

export const axisTick = { fill: '#94a3b8', fontSize: 11 };
export const gridStroke = '#1b2a45';

export const moneyTick = (v: number) => formatMoney(v, undefined, { compact: true });
export const moneyFormatter = (value: unknown) => formatMoney(Number(value));
