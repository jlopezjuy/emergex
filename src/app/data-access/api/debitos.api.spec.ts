import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DebitosApiService } from './debitos.api';
import { DebitoDocumentoDTO } from '../dto/debitos.dto';
import { environment } from '../../../environments/environment';

describe('DebitosApiService', () => {
  let service: DebitosApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DebitosApiService
      ]
    });
    service = TestBed.inject(DebitosApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener débitos paginados o listado completo', () => {
    service.getDebitos().subscribe((res: DebitoDocumentoDTO[]) => {
      expect(res.length).toBe(1);
      expect(res[0].estado).toBe('PENDIENTE');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/debitos-documentos`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, documentoId: 10, montoDebito: 500, estado: 'PENDIENTE' }]);
  });

  it('debería obtener un débito por ID', () => {
    service.getDebitoById(1).subscribe((res: DebitoDocumentoDTO) => {
      expect(res.id).toBe(1);
      expect(res.estado).toBe('PENDIENTE');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/debitos-documentos/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, documentoId: 10, montoDebito: 500, estado: 'PENDIENTE' });
  });

  it('debería registrar un nuevo débito', () => {
    const payload = { documentoId: 10, montoDebito: 500, causaPrincipal: 'VALOR_EXCESIVO' };
    service.registrarDebito(payload).subscribe((res: DebitoDocumentoDTO) => {
      expect(res.id).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/debitos-documentos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, documentoId: 10, montoDebito: 500, causaPrincipal: 'VALOR_EXCESIVO', estado: 'PENDIENTE' });
  });

  it('debería actualizar el estado de un débito', () => {
    const payload = { nuevoEstado: 'ACEPTADO' as const, montoRecuperado: 500 };
    service.actualizarEstado(1, payload).subscribe((res: DebitoDocumentoDTO) => {
      expect(res.estado).toBe('ACEPTADO');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/debitos-documentos/1/estado`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, documentoId: 10, montoDebito: 500, estado: 'ACEPTADO', montoRecuperado: 500 });
  });
});
