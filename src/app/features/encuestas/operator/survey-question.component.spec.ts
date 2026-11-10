import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreguntaEncuestaDetalle } from '../../../data-access/dto/survey.dto';
import { SurveyQuestionComponent, emptyAnswer, validateSurveyAnswer } from './survey-question.component';

const question = (type: PreguntaEncuestaDetalle['tipoRespuesta'], extra: Partial<PreguntaEncuestaDetalle> = {}): PreguntaEncuestaDetalle => ({
  id: 1, codigo: 'P1', texto: 'Pregunta', tipoRespuesta: type, orden: 1, obligatoria: true,
  permiteNoAplica: false, activa: true, opciones: [], ...extra,
});

describe('validateSurveyAnswer', () => {
  it('rechaza NPS fuera de 0 a 10', () => {
    expect(validateSurveyAnswer(question('NPS'), { ...emptyAnswer(1), valorNumerico: 11 })).toContain('0 y 10');
  });

  it('respeta los límites de una escala', () => {
    expect(validateSurveyAnswer(question('ESCALA', { valorMinimo: 1, valorMaximo: 5 }), { ...emptyAnswer(1), valorNumerico: 0 })).toContain('1 y 5');
  });

  it('rechaza múltiples opciones en selección única', () => {
    expect(validateSurveyAnswer(question('SELECCION_UNICA'), { ...emptyAnswer(1), opcionIds: [1, 2] })).toContain('una sola');
  });

  it('acepta múltiples opciones en selección múltiple', () => {
    expect(validateSurveyAnswer(question('SELECCION_MULTIPLE'), { ...emptyAnswer(1), opcionIds: [1, 2] })).toBeNull();
  });

  it('exige las preguntas obligatorias', () => {
    expect(validateSurveyAnswer(question('TEXTO_LARGO'), emptyAnswer(1))).toContain('obligatoria');
  });
});

describe('SurveyQuestionComponent', () => {
  beforeEach(async () => TestBed.configureTestingModule({ imports: [SurveyQuestionComponent] }).compileComponents());

  it('deshabilita los controles cuando la respuesta es de solo lectura', () => {
    const fixture = TestBed.createComponent(SurveyQuestionComponent);
    fixture.componentRef.setInput('question', question('TEXTO_CORTO'));
    fixture.componentRef.setInput('answer', emptyAnswer(1));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('usa radios nativos con nombre accesible para NPS', () => {
    const fixture = TestBed.createComponent(SurveyQuestionComponent);
    fixture.componentRef.setInput('question', question('NPS'));
    fixture.componentRef.setInput('answer', { ...emptyAnswer(1), valorNumerico: 7 });
    fixture.detectChanges();

    const radios = [...fixture.nativeElement.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    expect(radios).toHaveLength(11);
    expect(radios.every(radio => radio.name === 'question-1')).toBe(true);
    expect(radios.find(radio => radio.value === '7')?.checked).toBe(true);
  });
});
