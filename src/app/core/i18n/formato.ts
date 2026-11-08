import { LOCALE_AR } from './locale';

/**
 * Single money and date format for the whole app.
 *
 * In an accounting screen, "$71.293,38", "$13.500" and "$ 30500.00" side by side make the
 * reader doubt every figure. Every amount goes through formatMoneda (or the `moneda` pipe)
 * and every date through formatFecha (or the `fecha` pipe).
 */

const SIN_DATO = '—';

const MONEDA = new Intl.NumberFormat(LOCALE_AR, {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$ 30.500,00"; negatives as "-$ 30.500,00"; "—" when there is no numeric value. */
export function formatMoneda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return SIN_DATO;
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n)) return SIN_DATO;
  return MONEDA.format(n);
}

/** "dd/mm/aaaa" from an ISO date or timestamp; "—" when empty; unknown text is returned as is. */
export function formatFecha(valor: string | null | undefined): string {
  if (!valor) return SIN_DATO;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!m) return valor;
  const [, y, mes, d] = m;
  return `${d}/${mes}/${y}`;
}

export type TipoCuentaCorriente = 'CXC' | 'CXP';

/**
 * Plain-language reading of a ledger balance. The backend computes balance = debe - haber
 * for both books, so the sign means opposite things in receivables and payables.
 */
export function leyendaSaldo(tipo: TipoCuentaCorriente, saldo: number): string {
  if (!saldo) return 'Sin saldo';
  if (tipo === 'CXC') {
    return saldo > 0 ? 'Nos debe' : 'Saldo a favor del cliente (anticipo)';
  }
  return saldo < 0 ? 'Le debemos al proveedor' : 'Saldo a nuestro favor con el proveedor (anticipo)';
}
