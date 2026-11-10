import { describe, expect, it } from 'vitest';
import { calcularKpisFacturacion } from './kpis-facturacion';

type F = { estado: string; importeTotal: number; saldoPendiente?: number };

describe('calcularKpisFacturacion', () => {
  it('counts invoices waiting for ARCA as pending, because they are still owed', () => {
    const k = calcularKpisFacturacion([
      { estado: 'PENDIENTE_AFIP', importeTotal: 5250, saldoPendiente: 5250 },
      { estado: 'EMITIDA', importeTotal: 4500, saldoPendiente: 4500 },
      { estado: 'PAGADA', importeTotal: 9000, saldoPendiente: 0 },
    ] as F[]);

    expect(k.pendiente).toBe(9750);
    expect(k.cobrado).toBe(9000);
  });

  it('counts the collected part of a partially paid invoice as collected', () => {
    const k = calcularKpisFacturacion([{ estado: 'EMITIDA', importeTotal: 1000, saldoPendiente: 400 }] as F[]);

    expect(k.cobrado).toBe(600);
    expect(k.pendiente).toBe(400);
  });

  it('keeps cancelled invoices out of collected and pending, and reports them apart', () => {
    const k = calcularKpisFacturacion([
      { estado: 'ANULADA', importeTotal: 2000, saldoPendiente: 2000 },
      { estado: 'PAGADA', importeTotal: 1000, saldoPendiente: 0 },
    ] as F[]);

    expect(k.anulado).toBe(2000);
    expect(k.pendiente).toBe(0);
    expect(k.cobrado).toBe(1000);
  });

  it('falls back to the invoice state when the balance is not sent', () => {
    const k = calcularKpisFacturacion([
      { estado: 'PAGADA', importeTotal: 700 },
      { estado: 'EMITIDA', importeTotal: 300 },
    ] as F[]);

    expect(k.cobrado).toBe(700);
    expect(k.pendiente).toBe(300);
  });

  it('always reconciles: invoiced = collected + pending + cancelled', () => {
    const k = calcularKpisFacturacion([
      { estado: 'PENDIENTE_AFIP', importeTotal: 5250, saldoPendiente: 5250 },
      { estado: 'EMITIDA', importeTotal: 1000, saldoPendiente: 400 },
      { estado: 'PAGADA', importeTotal: 9000, saldoPendiente: 0 },
      { estado: 'ANULADA', importeTotal: 2000.38, saldoPendiente: 2000.38 },
      { estado: 'VENCIDA', importeTotal: 4500, saldoPendiente: 4500 },
    ] as F[]);

    expect(k.totalFacturado).toBeCloseTo(k.cobrado + k.pendiente + k.anulado, 2);
    expect(k.vencidas).toBe(1);
  });
});
