import { describe, expect, it } from 'vitest';
import { deriveVisualPhase, visualStatusSteps } from './status-step.model';

describe('deriveVisualPhase', () => {
  it('maps every domain state explicitly without treating cancellation or audit as closed', () => {
    const expected = {
      RECIBIDO: 'RECIBIDO', DESPACHADO: 'DESPACHADO', EN_CAMINO: 'EN_CAMINO',
      EN_SITIO: 'EN_SITIO', HOSPITALIZACION_PENDIENTE: 'HOSPITALIZACION_PENDIENTE',
      COMPLETADO: 'CERRADO', CANCELADO: 'CANCELADO', MEDICO_NO_DISPONIBLE: 'MEDICO_NO_DISPONIBLE',
      PENDIENTE_AUDITORIA_MEDICA: 'PENDIENTE_AUDITORIA_MEDICA', AUDITADO_OK: 'AUDITADO_OK', OBSERVADO: 'OBSERVADO',
    } as const;

    for (const [estado, phase] of Object.entries(expected)) {
      expect(deriveVisualPhase({ estado })).toBe(phase);
    }
  });

  it('derives no transport, active transport, arrival, accepted handover and closed delivery from persisted facts', () => {
    expect(deriveVisualPhase({ estado: 'EN_SITIO' })).toBe('EN_SITIO');
    expect(deriveVisualPhase({ estado: 'EN_SITIO', horaInicioTraslado: '2026-08-12T10:00:00Z' })).toBe('TRASLADO');
    expect(deriveVisualPhase({ estado: 'EN_SITIO', horaInicioTraslado: '2026-08-12T10:00:00Z', horaFinTraslado: '2026-08-12T10:30:00Z' })).toBe('ARRIBO_HOSPITALARIO');
    expect(deriveVisualPhase({ estado: 'EN_SITIO', horaInicioTraslado: '2026-08-12T10:00:00Z', horaFinTraslado: '2026-08-12T10:30:00Z', handoverPresence: true })).toBe('ENTREGADO');
    expect(visualStatusSteps({ estado: 'COMPLETADO', horaFinTraslado: '2026-08-12T10:30:00Z', handoverPresence: true }).at(-1)?.id).toBe('CERRADO');
  });

  it('keeps cancellation and hospitalisation as explicit non-closing phases', () => {
    expect(visualStatusSteps({ estado: 'CANCELADO' })).toEqual([{ id: 'CANCELADO', label: 'Cancelada' }]);
    expect(visualStatusSteps({ estado: 'HOSPITALIZACION_PENDIENTE' }).at(-1)?.id).toBe('HOSPITALIZACION_PENDIENTE');
  });
});
