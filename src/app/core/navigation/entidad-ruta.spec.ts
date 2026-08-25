import { describe, it, expect } from 'vitest';
import { rutaParaEntidad } from './entidad-ruta';

describe('rutaParaEntidad', () => {
  it('mapea AFILIADO a /patients/{id}', () => {
    expect(rutaParaEntidad('AFILIADO', 123)).toBe('/patients/123');
  });

  it('mapea TERCERO a /administracion/proveedores/{id}', () => {
    expect(rutaParaEntidad('TERCERO', 456)).toBe('/administracion/proveedores/456');
  });

  it('mapea ORDEN_PAGO a /administracion/proveedores', () => {
    expect(rutaParaEntidad('ORDEN_PAGO', 789)).toBe('/administracion/proveedores');
  });

  it('mapea CONTRATO a /administracion/contratos/{id}', () => {
    expect(rutaParaEntidad('CONTRATO', 10)).toBe('/administracion/contratos/10');
  });

  it('mapea TICKET a /asistencias/{id}', () => {
    expect(rutaParaEntidad('TICKET', 1)).toBe('/asistencias/1');
  });

  it('mapea DEBITO a /administracion/debitos/{id}', () => {
    expect(rutaParaEntidad('DEBITO', 2)).toBe('/administracion/debitos/2');
  });

  it('mapea DOCUMENTO_COMERCIAL a /facturas/{id}', () => {
    expect(rutaParaEntidad('DOCUMENTO_COMERCIAL', 3)).toBe('/facturas/3');
  });

  it('mapea ORDEN_COMPRA a /compras/ordenes/{id}', () => {
    expect(rutaParaEntidad('ORDEN_COMPRA', 4)).toBe('/compras/ordenes/4');
  });

  it('mapea LOTE a /prefacturacion/lotes/{id}', () => {
    expect(rutaParaEntidad('LOTE', 5)).toBe('/prefacturacion/lotes/5');
  });

  it('devuelve null para tipo desconocido o vacio', () => {
    expect(rutaParaEntidad('DESCONOCIDO', 99)).toBeNull();
    expect(rutaParaEntidad(null, 99)).toBeNull();
    expect(rutaParaEntidad(undefined, 99)).toBeNull();
  });
});
