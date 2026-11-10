import { describe, it, expect } from 'vitest';
import { convertToParamMap } from '@angular/router';
import { leerIdDeFoco, leerTabDeFoco } from './deep-link';

describe('leerIdDeFoco', () => {
  it('devuelve el id cuando el parámetro es un entero positivo', () => {
    expect(leerIdDeFoco(convertToParamMap({ facturaId: '42' }), 'facturaId')).toBe(42);
  });

  it('devuelve null cuando el parámetro falta', () => {
    expect(leerIdDeFoco(convertToParamMap({}), 'facturaId')).toBeNull();
  });

  it('descarta valores no numéricos, cero o negativos', () => {
    expect(leerIdDeFoco(convertToParamMap({ id: 'abc' }), 'id')).toBeNull();
    expect(leerIdDeFoco(convertToParamMap({ id: '0' }), 'id')).toBeNull();
    expect(leerIdDeFoco(convertToParamMap({ id: '-3' }), 'id')).toBeNull();
    expect(leerIdDeFoco(convertToParamMap({ id: '1.5' }), 'id')).toBeNull();
  });
});

describe('leerTabDeFoco', () => {
  const permitidos = ['lotes', 'pendientes'] as const;

  it('devuelve la solapa pedida cuando la pantalla la tiene', () => {
    expect(leerTabDeFoco(convertToParamMap({ tab: 'pendientes' }), permitidos)).toBe('pendientes');
  });

  it('devuelve null cuando la solapa pedida no existe', () => {
    expect(leerTabDeFoco(convertToParamMap({ tab: 'inventada' }), permitidos)).toBeNull();
  });

  it('devuelve null cuando no se pidió ninguna solapa', () => {
    expect(leerTabDeFoco(convertToParamMap({}), permitidos)).toBeNull();
  });
});
