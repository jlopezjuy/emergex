import { describe, expect, it } from 'vitest';
import { formatFecha, formatMoneda, leyendaSaldo } from './formato';

const NBSP = /\u00a0/g;
const plano = (s: string) => s.replace(NBSP, ' ');

describe('formatMoneda', () => {
  it('always shows two decimals and the es-AR thousands separator', () => {
    expect(plano(formatMoneda(30500))).toBe('$ 30.500,00');
    expect(plano(formatMoneda(71293.38))).toBe('$ 71.293,38');
    expect(plano(formatMoneda(0))).toBe('$ 0,00');
  });

  it('accepts numeric strings as sent by BigDecimal fields', () => {
    expect(plano(formatMoneda('25000'))).toBe('$ 25.000,00');
  });

  it('shows negatives with a leading minus sign', () => {
    expect(plano(formatMoneda(-30500))).toBe('-$ 30.500,00');
  });

  it('shows a dash when there is no value, never "$ NaN" or "$ undefined"', () => {
    expect(formatMoneda(null)).toBe('—');
    expect(formatMoneda(undefined)).toBe('—');
    expect(formatMoneda('abc')).toBe('—');
  });
});

describe('formatFecha', () => {
  it('turns ISO dates and timestamps into dd/mm/aaaa', () => {
    expect(formatFecha('2026-11-08')).toBe('08/11/2026');
    expect(formatFecha('2026-08-20T13:45:00Z')).toBe('20/08/2026');
  });

  it('shows a dash when there is no date and leaves unknown text untouched', () => {
    expect(formatFecha(null)).toBe('—');
    expect(formatFecha('')).toBe('—');
    expect(formatFecha('sin fecha')).toBe('sin fecha');
  });
});

describe('leyendaSaldo', () => {
  it('reads a positive receivable balance as money owed to us', () => {
    expect(leyendaSaldo('CXC', 1500)).toBe('Nos debe');
  });

  it('reads a negative receivable balance as a customer credit, not as a debt', () => {
    expect(leyendaSaldo('CXC', -30500)).toBe('Saldo a favor del cliente (anticipo)');
  });

  it('reads payables with the ledger convention (balance = debe - haber): negative means we owe', () => {
    expect(leyendaSaldo('CXP', -2000)).toBe('Le debemos al proveedor');
    expect(leyendaSaldo('CXP', 2000)).toBe('Saldo a nuestro favor con el proveedor (anticipo)');
  });

  it('says there is no balance when it is zero', () => {
    expect(leyendaSaldo('CXC', 0)).toBe('Sin saldo');
    expect(leyendaSaldo('CXP', 0)).toBe('Sin saldo');
  });
});
