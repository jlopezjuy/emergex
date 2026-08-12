export interface StatusStep {
  id: string;
  label: string;
}

export type EstadoAsistenciaVisual =
  | 'RECIBIDO'
  | 'DESPACHADO'
  | 'EN_CAMINO'
  | 'EN_SITIO'
  | 'HOSPITALIZACION_PENDIENTE'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'MEDICO_NO_DISPONIBLE'
  | 'PENDIENTE_AUDITORIA_MEDICA'
  | 'AUDITADO_OK'
  | 'OBSERVADO';

export type VisualPhase = EstadoAsistenciaVisual | 'TRASLADO' | 'ARRIBO_HOSPITALARIO' | 'ENTREGADO' | 'CERRADO' | 'DESCONOCIDO';

export interface VisualPhaseInput {
  estado?: string;
  horaInicioTraslado?: string;
  horaFinTraslado?: string;
  /** true = confirmed delivery, false = confirmed absence, undefined = not established by this detail response. */
  handoverPresence?: boolean;
}

const BASE_STEPS: StatusStep[] = [
  { id: 'RECIBIDO', label: 'Recibido' },
  { id: 'DESPACHADO', label: 'Despachado' },
  { id: 'EN_CAMINO', label: 'En camino' },
  { id: 'EN_SITIO', label: 'En sitio' },
];

const PHASE_STEPS: Record<VisualPhase, StatusStep[]> = {
  RECIBIDO: BASE_STEPS.slice(0, 1),
  DESPACHADO: BASE_STEPS.slice(0, 2),
  EN_CAMINO: BASE_STEPS.slice(0, 3),
  EN_SITIO: BASE_STEPS,
  TRASLADO: [...BASE_STEPS, { id: 'TRASLADO', label: 'Traslado' }],
  ARRIBO_HOSPITALARIO: [...BASE_STEPS, { id: 'TRASLADO', label: 'Traslado' }, { id: 'ARRIBO_HOSPITALARIO', label: 'Arribo hospitalario' }],
  ENTREGADO: [...BASE_STEPS, { id: 'TRASLADO', label: 'Traslado' }, { id: 'ARRIBO_HOSPITALARIO', label: 'Arribo hospitalario' }, { id: 'ENTREGADO', label: 'Entrega aceptada' }],
  HOSPITALIZACION_PENDIENTE: [...BASE_STEPS, { id: 'HOSPITALIZACION_PENDIENTE', label: 'Hospitalización pendiente' }],
  COMPLETADO: [...BASE_STEPS, { id: 'CERRADO', label: 'Completada' }],
  CERRADO: [...BASE_STEPS, { id: 'CERRADO', label: 'Completada' }],
  CANCELADO: [{ id: 'CANCELADO', label: 'Cancelada' }],
  MEDICO_NO_DISPONIBLE: [{ id: 'MEDICO_NO_DISPONIBLE', label: 'Médico no disponible' }],
  PENDIENTE_AUDITORIA_MEDICA: [{ id: 'PENDIENTE_AUDITORIA_MEDICA', label: 'Pendiente de auditoría médica' }],
  AUDITADO_OK: [{ id: 'AUDITADO_OK', label: 'Auditada' }],
  OBSERVADO: [{ id: 'OBSERVADO', label: 'Observada' }],
  DESCONOCIDO: [{ id: 'DESCONOCIDO', label: 'Estado sin clasificar' }],
};

const DOMAIN_PHASES: Record<EstadoAsistenciaVisual, (input: VisualPhaseInput) => VisualPhase> = {
  RECIBIDO: () => 'RECIBIDO',
  DESPACHADO: () => 'DESPACHADO',
  EN_CAMINO: () => 'EN_CAMINO',
  EN_SITIO: (input) => {
    if (input.horaInicioTraslado && !input.horaFinTraslado) return 'TRASLADO';
    if (input.horaFinTraslado && input.handoverPresence === true) return 'ENTREGADO';
    if (input.horaFinTraslado) return 'ARRIBO_HOSPITALARIO';
    return 'EN_SITIO';
  },
  HOSPITALIZACION_PENDIENTE: () => 'HOSPITALIZACION_PENDIENTE',
  COMPLETADO: () => 'CERRADO',
  CANCELADO: () => 'CANCELADO',
  MEDICO_NO_DISPONIBLE: () => 'MEDICO_NO_DISPONIBLE',
  PENDIENTE_AUDITORIA_MEDICA: () => 'PENDIENTE_AUDITORIA_MEDICA',
  AUDITADO_OK: () => 'AUDITADO_OK',
  OBSERVADO: () => 'OBSERVADO',
};

export function deriveVisualPhase(input: VisualPhaseInput): VisualPhase {
  const phaseResolver = DOMAIN_PHASES[input.estado as EstadoAsistenciaVisual];
  return phaseResolver ? phaseResolver(input) : 'DESCONOCIDO';
}

export function visualStatusSteps(input: VisualPhaseInput): StatusStep[] {
  const phase = deriveVisualPhase(input);
  if (input.estado === 'COMPLETADO' && input.horaFinTraslado && input.handoverPresence === true) {
    return [...PHASE_STEPS.ENTREGADO, { id: 'CERRADO', label: 'Completada' }];
  }
  if (input.estado === 'COMPLETADO' && input.horaFinTraslado) {
    return [...PHASE_STEPS.ARRIBO_HOSPITALARIO, { id: 'CERRADO', label: 'Completada' }];
  }
  return PHASE_STEPS[phase];
}

// Compatibility export for consumers that render a static preview only.
export const ALL_STEPS: StatusStep[] = BASE_STEPS;
