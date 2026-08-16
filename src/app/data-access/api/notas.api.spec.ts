import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotasApiService, EmitirNotaCreditoDTO, EmitirNotaDebitoDTO } from './notas.api';
import { environment } from '../../../environments/environment';

describe('NotasApiService', () => {
  let service: NotasApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotasApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(NotasApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('emitirNotaCredito envía POST a /api/notas-credito y devuelve DocumentoComercialDTO', () => {
    const payload: EmitirNotaCreditoDTO = {
      documentoOriginalId: 100,
      numeroDocumento: 'NC-0001-00000001',
      monto: 605.00,
      tipoDocumento: 'NOTA_CREDITO_A',
    };

    service.emitirNotaCredito(payload).subscribe((res) => {
      expect(res.id).toBe(200);
      expect(res.montoTotal).toBe(605.00);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/notas-credito`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 200, montoTotal: 605.00, tipoDocumento: 'NOTA_CREDITO_A', numeroDocumento: 'NC-0001-00000001', saldoPendiente: 0, estado: 'COBRADO_TOTAL', montoNeto: 500.00, montoIva: 105.00, fechaEmision: '2026-08-16' });
  });

  it('emitirNotaDebito envía POST a /api/notas-debito y devuelve DocumentoComercialDTO', () => {
    const payload: EmitirNotaDebitoDTO = {
      terceroId: 10,
      documentoOriginalId: 100,
      numeroDocumento: 'ND-0001-00000001',
      monto: 1210.00,
      tipoDocumento: 'NOTA_DEBITO_A',
    };

    service.emitirNotaDebito(payload).subscribe((res) => {
      expect(res.id).toBe(201);
      expect(res.montoTotal).toBe(1210.00);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/notas-debito`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 201, montoTotal: 1210.00, tipoDocumento: 'NOTA_DEBITO_A', numeroDocumento: 'ND-0001-00000001', saldoPendiente: 1210.00, estado: 'EMITIDO', montoNeto: 1000.00, montoIva: 210.00, fechaEmision: '2026-08-16' });
  });
});
