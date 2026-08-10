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

  it('mapea CONTRATO a null por carecer de ficha 360 directa por contratoId', () => {
    expect(rutaParaEntidad('CONTRATO', 10)).toBeNull();
  });

  it('mapea TICKET a null', () => {
    expect(rutaParaEntidad('TICKET', 1)).toBeNull();
  });

  it('mapea DEBITO a /facturacion', () => {
    expect(rutaParaEntidad('DEBITO', 2)).toBe('/facturacion');
  });

  it('mapea DOCUMENTO_COMERCIAL a null', () => {
    expect(rutaParaEntidad('DOCUMENTO_COMERCIAL', 3)).toBeNull();
  });

  it('mapea ORDEN_COMPRA a null', () => {
    expect(rutaParaEntidad('ORDEN_COMPRA', 4)).toBeNull();
  });

  it('devuelve null para tipo desconocido o vacio', () => {
    expect(rutaParaEntidad('DESCONOCIDO', 99)).toBeNull();
    expect(rutaParaEntidad(null, 99)).toBeNull();
    expect(rutaParaEntidad(undefined, 99)).toBeNull();
  });
});
