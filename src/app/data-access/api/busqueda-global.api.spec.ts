import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BusquedaGlobalApi } from './busqueda-global.api';
import { environment } from '../../../environments/environment';
import { BusquedaGlobalResultadoDTO } from '../dto/busqueda-global.dto';

describe('BusquedaGlobalApi', () => {
  let service: BusquedaGlobalApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BusquedaGlobalApi]
    });

    service = TestBed.inject(BusquedaGlobalApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería realizar GET a /api/v1/busqueda-global con query y limite', () => {
    const mockResponse: BusquedaGlobalResultadoDTO = {
      query: '12345678',
      totalCoincidencias: 1,
      resultados: [
        {
          tipo: 'AFILIADO',
          id: 10,
          codigo: 'A-001',
          titulo: 'Juan Pérez',
          subtitulo: 'DNI 12345678',
          urlRef: '/afiliados/10'
        }
      ]
    };

    service.buscar('12345678', 5).subscribe((res: BusquedaGlobalResultadoDTO) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((request) => {
      return (
        request.url === `${environment.apiUrl}/api/v1/busqueda-global` &&
        request.params.get('query') === '12345678' &&
        request.params.get('limite') === '5'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
