import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PrefacturacionApiService, LotePrefacturacionDTO } from './prefacturacion.api';
import { environment } from '../../../environments/environment';

describe('PrefacturacionApiService', () => {
  let service: PrefacturacionApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/v2/prefacturacion/lotes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PrefacturacionApiService],
    });
    service = TestBed.inject(PrefacturacionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should generarLineas via POST with desde/hasta body', () => {
    const loteId = 10;
    const mockResponse: LotePrefacturacionDTO = {
      id: loteId,
      fechaCreacion: '2026-08-01',
      estado: 'BORRADOR',
      financiadorNombre: 'Obra Social Test',
      totalTickets: 2,
    };

    service.generarLineas(loteId, '2026-08-01', '2026-08-31').subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/${loteId}/generar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ desde: '2026-08-01', hasta: '2026-08-31' });
    req.flush(mockResponse);
  });
});
