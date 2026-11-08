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

/** "30-66778899-4" from an 11-digit CUIT with or without separators; anything else is returned as is. */
export function formatCuit(valor: string | null | undefined): string {
  if (!valor) return SIN_DATO;
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== 11) return valor;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  PENDIENTE_AFIP: 'Pendiente ARCA',
  CREDITO_COBRANZA: 'Cobro',
  DEBITO_DOCUMENTO: 'Factura',
  CREDITO_DOCUMENTO: 'Factura de proveedor',
  DEBITO_RECHAZO_PRESTACION: 'Débito por prestación rechazada',
  BLOQUEADO_DIFERENCIA: 'Bloqueado por diferencia',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  EN_TRAMITE: 'En trámite',
};

/**
 * Plain-Spanish label for a technical state or movement type. Known values use the table above;
 * unknown ones are humanized ("ALGO_RARO" -> "Algo raro") so a raw enum never reaches the screen.
 */
export function etiquetaEstado(valor: string | null | undefined): string {
  if (!valor) return SIN_DATO;
  const conocida = ETIQUETAS_ESTADO[valor];
  if (conocida) return conocida;
  const texto = valor.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
