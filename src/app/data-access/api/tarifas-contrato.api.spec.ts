import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TarifasContratoApiService } from './tarifas-contrato.api';
import { TarifaContratoDTO } from '../dto/tarifas-contrato.dto';
import { environment } from '../../../environments/environment';

describe('TarifasContratoApiService', () => {
  let service: TarifasContratoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TarifasContratoApiService,
      ],
    });
    service = TestBed.inject(TarifasContratoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener tarifas de contrato filtradas por contratoId', () => {
    service.getTarifasByContrato(10).subscribe((res: TarifaContratoDTO[]) => {
      expect(res.length).toBe(1);
      expect(res[0].importe).toBe(1500);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tarifas-contrato?contratoId=10`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, contratoCobertura: { id: 10 }, prestacion: { id: 2, nombre: 'Consulta' }, importe: 1500, vigenciaDesde: '2026-01-01' }]);
  });

  it('debería crear una nueva tarifa de contrato', () => {
    const payload: TarifaContratoDTO = {
      contratoCobertura: { id: 10 },
      prestacion: { id: 2 },
      importe: 1500,
      vigenciaDesde: '2026-01-01',
    };
    service.createTarifa(payload).subscribe((res: TarifaContratoDTO) => {
      expect(res.id).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tarifas-contrato`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, ...payload });
  });

  it('debería actualizar una tarifa de contrato existente', () => {
    const payload: TarifaContratoDTO = {
      id: 1,
      contratoCobertura: { id: 10 },
      prestacion: { id: 2 },
      importe: 1800,
      vigenciaDesde: '2026-01-01',
    };
    service.updateTarifa(1, payload).subscribe((res: TarifaContratoDTO) => {
      expect(res.importe).toBe(1800);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tarifas-contrato/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload });
  });

  it('debería eliminar una tarifa de contrato', () => {
    service.deleteTarifa(1).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tarifas-contrato/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
