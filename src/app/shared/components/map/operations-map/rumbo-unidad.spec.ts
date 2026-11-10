import { describe, it, expect } from 'vitest';
import { RUMBO_POR_DEFECTO, normalizarRumbo, resolverRumbo, rumboEntre } from './rumbo-unidad';

describe('rumbo de la unidad en el mapa', () => {
  describe('normalizarRumbo', () => {
    it('deja pasar un rumbo válido', () => expect(normalizarRumbo(90)).toBe(90));
    it('lleva los negativos y los mayores a 360 al rango 0-360', () => {
      expect(normalizarRumbo(-90)).toBe(270);
      expect(normalizarRumbo(450)).toBe(90);
      expect(normalizarRumbo(360)).toBe(0);
    });
    it('descarta lo que no es un número finito', () => {
      expect(normalizarRumbo(undefined)).toBeNull();
      expect(normalizarRumbo(null)).toBeNull();
      expect(normalizarRumbo(Number.NaN)).toBeNull();
      expect(normalizarRumbo(Number.POSITIVE_INFINITY)).toBeNull();
    });
  });

  describe('rumboEntre', () => {
    const origen: [number, number] = [-65.3, -24.18];
    it('hacia el norte es 0', () => expect(rumboEntre(origen, [-65.3, -24.17])).toBeCloseTo(0, 0));
    it('hacia el este es 90', () => expect(rumboEntre(origen, [-65.29, -24.18])).toBeCloseTo(90, 0));
    it('hacia el sur es 180', () => expect(rumboEntre(origen, [-65.3, -24.19])).toBeCloseTo(180, 0));
    it('hacia el oeste es 270', () => expect(rumboEntre(origen, [-65.31, -24.18])).toBeCloseTo(270, 0));
  });

  describe('resolverRumbo', () => {
    const a: [number, number] = [-65.3, -24.18];
    const alEste: [number, number] = [-65.299, -24.18];

    it('prefiere el rumbo que informa la unidad (GPS)', () => {
      expect(resolverRumbo({ direccion: 135, previa: a, actual: alEste, ultimo: 10 })).toBe(135);
    });
    it('sin rumbo informado lo deduce del desplazamiento', () => {
      expect(resolverRumbo({ previa: a, actual: alEste })).toBeCloseTo(90, 0);
    });
    it('si no se movió conserva el último rumbo conocido, así no vuelve a mirar al norte al frenar', () => {
      expect(resolverRumbo({ previa: a, actual: a, ultimo: 200 })).toBe(200);
    });
    it('un salto ínfimo de GPS (ruido) no cambia el rumbo', () => {
      expect(resolverRumbo({ previa: a, actual: [-65.3 + 0.000001, -24.18], ultimo: 45 })).toBe(45);
    });
    it('sin ningún dato muestra una vista 3/4 del frente, no la trasera', () => {
      expect(resolverRumbo({ actual: a })).toBe(RUMBO_POR_DEFECTO);
      expect(RUMBO_POR_DEFECTO).toBe(135);
    });
  });
});
