import { describe, it, expect } from 'vitest';
import { RetencionForm, montoNeto, totalRetenciones, validarRetenciones } from './retenciones-cobro';

const retencion = (parcial: Partial<RetencionForm> = {}): RetencionForm => ({
  tipo: 'GANANCIAS',
  monto: 100,
  numeroCertificado: 'CERT-1',
  jurisdiccion: '',
  ...parcial,
});

describe('retenciones del cobro (QA-ROL-019)', () => {
  it('suma las retenciones e ignora los montos vacíos', () => {
    expect(totalRetenciones([retencion({ monto: 300 }), retencion({ monto: 200 }), retencion({ monto: null })])).toBe(500);
  });

  it('el neto es lo cobrado menos lo retenido, porque las retenciones cancelan deuda pero no son plata recibida', () => {
    expect(montoNeto(10000, [retencion({ monto: 300 }), retencion({ monto: 200 })])).toBe(9500);
  });

  it('sin retenciones el neto es el monto cobrado', () => {
    expect(montoNeto(10000, [])).toBe(10000);
  });

  it('sin retenciones no hay error', () => {
    expect(validarRetenciones(1000, [])).toBeNull();
  });

  it('exige el número de certificado', () => {
    expect(validarRetenciones(1000, [retencion({ numeroCertificado: '  ' })])).toContain('certificado');
  });

  it('exige un monto positivo', () => {
    expect(validarRetenciones(1000, [retencion({ monto: 0 })])).toContain('monto');
    expect(validarRetenciones(1000, [retencion({ monto: null })])).toContain('monto');
  });

  it('exige la jurisdicción sólo en IIBB', () => {
    expect(validarRetenciones(1000, [retencion({ tipo: 'IIBB', jurisdiccion: '' })])).toContain('jurisdicción');
    expect(validarRetenciones(1000, [retencion({ tipo: 'IIBB', jurisdiccion: 'Buenos Aires' })])).toBeNull();
    expect(validarRetenciones(1000, [retencion({ tipo: 'IVA', jurisdiccion: '' })])).toBeNull();
  });

  it('no deja que las retenciones igualen ni superen lo cobrado', () => {
    expect(validarRetenciones(1000, [retencion({ monto: 1000 })])).toContain('superar');
    expect(validarRetenciones(1000, [retencion({ monto: 999.99 })])).toBeNull();
  });
});
