import type { Currency } from '../types';

// ─────────────────────────────────────────────────────────────
// Configuración global de moneda (se llena al cargar la app)
// ─────────────────────────────────────────────────────────────
let baseCurrency = 'COP';
let currencyMap: Record<string, Currency> = {
  COP: { code: 'COP', name: 'Peso colombiano', symbol: '$', rate_to_base: 1, decimals: 0, is_base: true, active: true, sort_order: 1 },
};

export function configureFormatters(base: string, currencies: Currency[]) {
  baseCurrency = base;
  currencyMap = Object.fromEntries(currencies.map((c) => [c.code, c]));
}

export function getBaseCurrency() {
  return baseCurrency;
}

export function getCurrency(code: string): Currency | undefined {
  return currencyMap[code];
}

/** Formatea un valor monetario. Sin moneda → moneda base. */
export function formatMoney(amount: number, currency?: string, opts?: { compact?: boolean; sign?: boolean }): string {
  const code = currency || baseCurrency;
  const cur = currencyMap[code];
  const symbol = cur?.symbol ?? code;
  const decimals = cur?.decimals ?? 2;
  const abs = Math.abs(amount);

  let body: string;
  if (opts?.compact && abs >= 1_000_000) {
    body = `${(abs / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  } else if (opts?.compact && abs >= 10_000) {
    body = `${(abs / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} K`;
  } else {
    body = abs.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  const negative = amount < 0;
  const prefix = negative ? '-' : opts?.sign && amount > 0 ? '+' : '';
  return `${prefix}${symbol} ${body}`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'No disponible';
  return `${value.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ─────────────────────────────────────────────────────────────
// Fechas (siempre en formato ISO YYYY-MM-DD en la base de datos)
// ─────────────────────────────────────────────────────────────
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00').getTime();
  const b = new Date(toISO + 'T00:00:00').getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** 'YYYY-MM' */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatMonth(key: string): string {
  const d = new Date(key + '-01T00:00:00');
  return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }).replace('.', '');
}

export function formatMonthLong(key: string): string {
  const d = new Date(key + '-01T00:00:00');
  const s = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
