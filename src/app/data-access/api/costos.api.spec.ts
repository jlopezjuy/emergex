import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CostosApiService } from './costos.api';
import { environment } from '../../../environments/environment';

describe('CostosApiService', () => {
  let service: CostosApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CostosApiService
      ]
    });
    service = TestBed.inject(CostosApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener la lista de centros de costo', () => {
    service.getCentrosCosto().subscribe(centros => {
      expect(centros.length).toBe(1);
      expect(centros[0].nombre).toBe('Operaciones San Isidro');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/costos/centros`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, codigo: 'CC-01', nombre: 'Operaciones San Isidro' }]);
  });
});
