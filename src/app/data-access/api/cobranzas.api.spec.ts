import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CobranzasApiService, RegistrarCobranzaRequestDTO, AplicarCobranzaRequestDTO, RevertirAplicacionRequestDTO } from './cobranzas.api';
import { environment } from '../../../environments/environment';

describe('CobranzasApiService', () => {
  let service: CobranzasApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/cxc`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CobranzasApiService
      ]
    });
    service = TestBed.inject(CobranzasApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should registrarCobranza via POST', () => {
    const reqDto: RegistrarCobranzaRequestDTO = { terceroEmpresaId: 1, numeroRecibo: '0001-00000001', montoCobrado: 1000 };
    const mockResponse = { id: 10, numeroRecibo: '0001-00000001', montoCobrado: 1000, montoAplicado: 0, montoRemanente: 1000, moneda: 'ARS', fechaCobro: '2023-10-10' };

    service.registrarCobranza(reqDto).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/cobranzas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqDto);
    req.flush(mockResponse);
  });

  it('should aplicarADocumento via POST', () => {
    const cobranzaId = 10;
    const reqDto: AplicarCobranzaRequestDTO = { documentoComercialId: 20, montoImputado: 500 };
    const mockResponse = { id: 1, montoImputado: 500, createdAt: '2023-10-10T10:00:00' };

    service.aplicarADocumento(cobranzaId, reqDto).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/cobranzas/${cobranzaId}/aplicaciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqDto);
    req.flush(mockResponse);
  });

  it('should revertirAplicacion via POST', () => {
    const aplicacionId = 1;
    const reqDto: RevertirAplicacionRequestDTO = { motivoReversion: 'Error' };

    service.revertirAplicacion(aplicacionId, reqDto).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/aplicaciones/${aplicacionId}/reversa`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqDto);
    req.flush(null);
  });

  it('should getDocumentosPendientes via GET', () => {
    const terceroId = 5;
    const mockResponse = [{ id: 1, numeroDocumento: 'A-0001', fechaEmision: '2023-10-10', montoTotal: 1000, saldoPendiente: 1000, moneda: 'ARS' }];

    service.getDocumentosPendientes(terceroId).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/documentos-pendientes?terceroEmpresaId=${terceroId}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
