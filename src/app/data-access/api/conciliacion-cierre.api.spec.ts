import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ConciliacionCierreApiService } from './conciliacion-cierre.api';
import { ConciliacionInstitucionalCierreDTO } from '../dto/conciliacion-cierre.dto';
import { environment } from '../../../environments/environment';

describe('ConciliacionCierreApiService', () => {
  let service: ConciliacionCierreApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConciliacionCierreApiService,
      ],
    });
    service = TestBed.inject(ConciliacionCierreApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener cierres por institucionId', () => {
    service.getByInstitucion(10).subscribe((res: ConciliacionInstitucionalCierreDTO[]) => {
      expect(res.length).toBe(1);
      expect(res[0].saldo).toBe(5000);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/conciliacion-institucional-cierres?institucionId.equals=10`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, institucion: { id: 10 }, totalFacturado: 10000, totalPagado: 5000, saldo: 5000 }]);
  });

  it('debería crear un nuevo cierre de conciliación', () => {
    const payload: ConciliacionInstitucionalCierreDTO = {
      institucion: { id: 10 },
      periodoDesde: '2026-01-01',
      periodoHasta: '2026-01-31',
    };
    service.crearCierre(payload).subscribe((res: ConciliacionInstitucionalCierreDTO) => {
      expect(res.id).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/conciliacion-institucional-cierres`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, ...payload });
  });
});
