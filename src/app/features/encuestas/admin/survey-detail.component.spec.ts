import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import { EncuestaDetalle } from '../../../data-access/dto/survey.dto';
import { SurveyDetailComponent } from './survey-detail.component';

describe('SurveyDetailComponent question controls', () => {
  it('limpia y deshabilita opciones ocultas, y las reactiva al volver a selección', () => {
    TestBed.configureTestingModule({
      imports: [SurveyDetailComponent],
      providers: [
        provideRouter([]),
        { provide: SurveyAdminApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    });
    const component = TestBed.createComponent(SurveyDetailComponent).componentInstance;
    component.addQuestion();
    const type = component.questions.at(0).get('tipoRespuesta')!;

    expect(component.options(0).disabled).toBe(true);
    type.setValue('SELECCION_UNICA');
    component.onQuestionTypeChange(0);
    expect(component.options(0).enabled).toBe(true);
    expect(component.options(0).length).toBe(1);

    type.setValue('TEXTO_LARGO');
    component.onQuestionTypeChange(0);
    expect(component.options(0).disabled).toBe(true);
    expect(component.options(0).length).toBe(0);
  });
});

const survey = (estado: EncuestaDetalle['estado']): EncuestaDetalle => ({
  id: 1, codigo: 'ENC-01', nombre: 'Encuesta inicial', descripcion: 'Descripción', objetivo: 'Objetivo',
  tipo: 'NPS', estado, fechaCreacion: '2026-07-14T10:00:00', fechaActualizacion: '2026-07-14T10:00:00', versionActual: null,
});

describe('SurveyDetailComponent definition editing', () => {
  it('precarga el borrador y evita doble submit', () => {
    const pending = new Subject<unknown>();
    const api = { surveyDetail: () => of(survey('BORRADOR')), updateSurvey: vi.fn(() => pending) };
    TestBed.configureTestingModule({
      imports: [SurveyDetailComponent],
      providers: [
        provideRouter([]),
        { provide: SurveyAdminApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, routeConfig: { path: ':id/editar' } } } },
      ],
    });
    const fixture = TestBed.createComponent(SurveyDetailComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.editForm.getRawValue()).toMatchObject({ id: 1, codigo: 'ENC-01', nombre: 'Encuesta inicial', tipo: 'NPS' });
    fixture.componentInstance.saveDefinition();
    fixture.componentInstance.saveDefinition();
    expect(api.updateSurvey).toHaveBeenCalledTimes(1);
  });

  it('mantiene sólo lectura al entrar a editar una encuesta no borrador', () => {
    const api = { surveyDetail: () => of(survey('ACTIVA')), updateSurvey: vi.fn() };
    TestBed.configureTestingModule({
      imports: [SurveyDetailComponent],
      providers: [
        provideRouter([]),
        { provide: SurveyAdminApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, routeConfig: { path: ':id/editar' } } } },
      ],
    });
    const fixture = TestBed.createComponent(SurveyDetailComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="survey-edit-form"]')).toBeNull();
    expect(api.updateSurvey).not.toHaveBeenCalled();
  });
});
