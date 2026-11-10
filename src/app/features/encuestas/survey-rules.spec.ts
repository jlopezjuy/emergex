import { describe, expect, it } from 'vitest';
import {
  canFinishSurveyCampaign,
  canCreateSurveyVersion,
  isSurveyContactOperable,
  normalizeSurveyOptions,
  surveyOptionsForRequest,
  validateCampaignPeriod,
} from './survey-rules';
import { EstadoContactoEncuesta } from '../../data-access/dto/survey.dto';

describe('survey lifecycle rules', () => {
  it('replica exactamente los estados operables del backend', () => {
    const operable: EstadoContactoEncuesta[] = ['PENDIENTE', 'ASIGNADO', 'EN_PROCESO', 'REPROGRAMADO', 'SIN_RESPUESTA'];
    const terminal: EstadoContactoEncuesta[] = ['COMPLETADO', 'RECHAZADO', 'TELEFONO_INVALIDO', 'NO_DESEA_PARTICIPAR', 'CANCELADO'];
    expect(operable.every(isSurveyContactOperable)).toBe(true);
    expect(terminal.some(isSurveyContactOperable)).toBe(false);
  });

  it('sólo permite finalizar una campaña en proceso sin contactos pendientes', () => {
    expect(canFinishSurveyCampaign('EN_PROCESO', 0)).toBe(true);
    expect(canFinishSurveyCampaign('EN_PROCESO', 1)).toBe(false);
    expect(canFinishSurveyCampaign('GENERADA', 0)).toBe(false);
  });

  it('exige período explícito para planes manuales', () => {
    expect(validateCampaignPeriod('MANUAL', '', '')).toContain('obligatorio');
    expect(validateCampaignPeriod('MANUAL', '2026-07-13', '2026-07-19')).toBeNull();
    expect(validateCampaignPeriod('SEMANAL', '', '')).toBeNull();
  });

  it('normaliza orden y códigos automáticos sin pisar códigos de negocio', () => {
    expect(normalizeSurveyOptions([
      { codigo: 'O1', orden: 1 },
      { codigo: 'RESPUESTA_ESPECIAL', orden: 3 },
      { codigo: '', orden: 3 },
    ])).toEqual([
      { codigo: 'O1', orden: 1 },
      { codigo: 'RESPUESTA_ESPECIAL', orden: 2 },
      { codigo: 'O3', orden: 3 },
    ]);
  });

  it('elimina opciones residuales de preguntas no seleccionables', () => {
    expect(surveyOptionsForRequest('TEXTO_LARGO', [{ codigo: 'O1', orden: 1 }])).toEqual([]);
    expect(surveyOptionsForRequest('SELECCION_UNICA', [{ codigo: '', orden: 8 }])).toEqual([{ codigo: 'O1', orden: 1 }]);
  });

  it('impide crear versiones sobre encuestas archivadas', () => {
    expect(canCreateSurveyVersion('ARCHIVADA')).toBe(false);
    expect(canCreateSurveyVersion('ACTIVA')).toBe(true);
  });
});
