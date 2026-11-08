import { describe, it, expect } from 'vitest';
import { PASOS_RUMBO, carasVisiblesDe, nombreIcono, rumboDeBucket, rumboABucket } from './ambulance-icon';

describe('ícono de ambulancia en 3D', () => {
  describe('rumboABucket', () => {
    it('reparte la circunferencia en 16 direcciones', () => {
      expect(PASOS_RUMBO).toBe(16);
      expect(rumboABucket(0)).toBe(0);
      expect(rumboABucket(90)).toBe(4);
      expect(rumboABucket(180)).toBe(8);
      expect(rumboABucket(270)).toBe(12);
    });
    it('redondea al paso más cercano', () => {
      expect(rumboABucket(10)).toBe(0);
      expect(rumboABucket(12)).toBe(1);
      expect(rumboABucket(100)).toBe(4);
    });
    it('cierra el círculo: 350° y 359° son el mismo sprite que 0°', () => {
      expect(rumboABucket(350)).toBe(0);
      expect(rumboABucket(359)).toBe(0);
      expect(rumboABucket(360)).toBe(0);
    });
    it('acepta rumbos negativos', () => {
      expect(rumboABucket(-90)).toBe(12);
    });
  });

  it('rumboDeBucket es la inversa: el centro de cada franja', () => {
    expect(rumboDeBucket(0)).toBe(0);
    expect(rumboDeBucket(4)).toBe(90);
    expect(rumboDeBucket(8)).toBe(180);
  });

  it('el nombre del ícono distingue color, movimiento y dirección', () => {
    expect(nombreIcono('#10B981', false, 3)).toBe('amb3d-10B981-3');
    expect(nombreIcono('#10B981', true, 3)).toBe('amb3d-10B981-MOVING-3');
    expect(nombreIcono('#3b82f6', false, 0)).toBe('amb3d-3B82F6-0');
  });

  describe('qué caras ve la cámara (fija, al sur y elevada)', () => {
    it('yendo al norte se ve la parte trasera y el techo, no el frente', () => {
      const vistas = carasVisiblesDe(0);
      expect(vistas).toContain('techo');
      expect(vistas).toContain('trasera');
      expect(vistas).not.toContain('frente');
      expect(vistas).not.toContain('parabrisas');
    });
    it('yendo al sur se ve el frente con el parabrisas', () => {
      const vistas = carasVisiblesDe(180);
      expect(vistas).toContain('parabrisas');
      expect(vistas).toContain('frente');
      expect(vistas).not.toContain('trasera');
    });
    it('yendo al este se ve el costado derecho, el que da al sur', () => {
      const vistas = carasVisiblesDe(90);
      expect(vistas).toContain('lado-derecho');
      expect(vistas).not.toContain('lado-izquierdo');
    });
    it('yendo al oeste se ve el costado izquierdo', () => {
      const vistas = carasVisiblesDe(270);
      expect(vistas).toContain('lado-izquierdo');
      expect(vistas).not.toContain('lado-derecho');
    });
    it('en diagonal se ve una esquina: un costado y una punta a la vez', () => {
      const vistas = carasVisiblesDe(135);
      expect(vistas).toContain('lado-derecho');
      expect(vistas).toContain('frente');
    });
  });
});
