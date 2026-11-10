import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SurveyAdminApiService } from './survey-admin.api';
import { SurveyOperatorApiService } from './survey-operator.api';
import { Observable } from 'rxjs';
import { EncuestaDTO, PageResponse } from '../dto/survey.dto';

describe('Survey APIs', () => {
  let http: HttpTestingController;
  let admin: SurveyAdminApiService;
  let operator: SurveyOperatorApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    admin = TestBed.inject(SurveyAdminApiService);
    operator = TestBed.inject(SurveyOperatorApiService);
  });

  afterEach(() => http.verify());

  it('consulta encuestas con paginación y filtros JHipster', () => {
    expectTypeOf(admin.querySurveys({})).toEqualTypeOf<Observable<PageResponse<EncuestaDTO>>>();
    admin.querySurveys({ page: 1, size: 20, nombre: 'atención', estado: 'ACTIVA' }).subscribe(result => {
      expect(result.total).toBe(33);
      expect(result.data).toHaveLength(1);
      expect(result.totalPages).toBe(2);
    });
    const req = http.expectOne(request =>
      request.url.endsWith('/api/v2/admin/encuestas/query') &&
      request.params.get('page') === '1' && request.params.get('size') === '20' &&
      request.params.get('nombre.contains') === 'atención' && request.params.get('estado.equals') === 'ACTIVA'
    );
    req.flush([{ id: 1 }], { headers: { 'X-Total-Count': '33', 'X-Total-Pages': '99', 'X-Page-Size': '1' } });
  });

  it('genera campaña sólo a través de un plan real', () => {
    admin.generateCampaign(7, { fechaDesde: '2026-07-13', fechaHasta: '2026-07-19', seed: 'fixed' }).subscribe();
    const req = http.expectOne(request => request.url.endsWith('/api/v2/admin/encuestas/planes/7/generar'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.seed).toBe('fixed');
    req.flush({ campaniaId: 9, alreadyExisted: false, requested: 15, selected: 15, seed: 'fixed' });
  });

  it('actualiza una definición borrador con IDs de path y body iguales', () => {
    const payload = { id: 3, codigo: 'SAT-01', nombre: 'Satisfacción', descripcion: null, objetivo: 'Medir', tipo: 'NPS' as const };
    admin.updateSurvey(3, payload).subscribe();
    const req = http.expectOne(request => request.url.endsWith('/api/v2/admin/encuestas/3'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, estado: 'BORRADOR' });
  });

  it('consulta contactos de campaña con filtros soportados', () => {
    admin.campaignContacts(8, { estado: 'REPROGRAMADO', texto: 'Ana', asignado: true, page: 0, size: 10 }).subscribe();
    const req = http.expectOne(request => request.url.endsWith('/campanias/8/contactos'));
    expect(req.request.params.get('reprogramado')).toBeNull();
    expect(req.request.params.get('estado')).toBe('REPROGRAMADO');
    expect(req.request.params.get('texto')).toBe('Ana');
    expect(req.request.params.get('asignado')).toBe('true');
    req.flush([], { headers: { 'X-Total-Count': '0' } });
  });

  it('registra intento sin permitir COMPLETADA en el contrato TypeScript', () => {
    operator.recordAttempt(4, { resultado: 'REPROGRAMADA', fechaReprogramada: '2026-07-20T15:00:00Z' }).subscribe();
    const req = http.expectOne(request => request.url.endsWith('/api/operador/encuestas/contactos/4/intentos'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.resultado).toBe('REPROGRAMADA');
    req.flush({ id: 5, fechaHora: '2026-07-14T10:00:00Z', resultado: 'REPROGRAMADA' });
  });

  it('guarda parcial y finaliza por endpoints diferentes', () => {
    const payload = { respuestas: [{ preguntaId: 2, valorNumerico: 10, noAplica: false, opcionIds: [] }] };
    operator.savePartial(11, payload).subscribe();
    operator.complete(11, payload).subscribe();
    expect(http.expectOne(request => request.url.endsWith('/respuestas/11') && request.method === 'PUT')).toBeTruthy();
    expect(http.expectOne(request => request.url.endsWith('/respuestas/11/finalizar') && request.method === 'POST')).toBeTruthy();
  });
});
