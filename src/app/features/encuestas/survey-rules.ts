import {
  EstadoCampaniaEncuesta,
  EstadoContactoEncuesta,
  EstadoEncuesta,
  FrecuenciaEncuesta,
  TipoRespuestaEncuesta,
} from '../../data-access/dto/survey.dto';

const OPERABLE_CONTACT_STATES = new Set<EstadoContactoEncuesta>([
  'PENDIENTE',
  'ASIGNADO',
  'EN_PROCESO',
  'REPROGRAMADO',
  'SIN_RESPUESTA',
]);

export function isSurveyContactOperable(state: EstadoContactoEncuesta): boolean {
  return OPERABLE_CONTACT_STATES.has(state);
}

export function canFinishSurveyCampaign(state: EstadoCampaniaEncuesta, pendingContacts: number): boolean {
  return state === 'EN_PROCESO' && pendingContacts === 0;
}

export function canCreateSurveyVersion(state: EstadoEncuesta): boolean {
  return state !== 'ARCHIVADA';
}

export function validateCampaignPeriod(
  frequency: FrecuenciaEncuesta,
  from: string,
  to: string,
): string | null {
  if (frequency === 'MANUAL' && (!from || !to)) return 'El período es obligatorio para un plan manual.';
  if ((from && !to) || (!from && to)) return 'Completá ambas fechas del período.';
  if (from && to && to < from) return 'La fecha final no puede ser anterior a la inicial.';
  return null;
}

interface SurveyOptionSequence {
  codigo: string;
  orden: number;
}

export function normalizeSurveyOptions<T extends SurveyOptionSequence>(options: T[]): T[] {
  return options.map((option, index) => {
    const position = index + 1;
    const automaticCode = !option.codigo.trim() || /^O\d+$/.test(option.codigo.trim());
    return { ...option, codigo: automaticCode ? `O${position}` : option.codigo.trim(), orden: position };
  });
}

export function supportsSurveyOptions(type: TipoRespuestaEncuesta): boolean {
  return type === 'SELECCION_UNICA' || type === 'SELECCION_MULTIPLE';
}

export function surveyOptionsForRequest<T extends SurveyOptionSequence>(type: TipoRespuestaEncuesta, options: T[]): T[] {
  return supportsSurveyOptions(type) ? normalizeSurveyOptions(options) : [];
}
