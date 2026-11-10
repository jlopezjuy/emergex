import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OrdenesPagoApiService } from './ordenes-pago.api';
import { environment } from '../../../environments/environment';

describe('OrdenesPagoApiService', () => {
  let service: OrdenesPagoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrdenesPagoApiService
      ]
    });
    service = TestBed.inject(OrdenesPagoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería listar las órdenes de pago', () => {
    service.getOrdenesDePago().subscribe(ops => {
      expect(ops.length).toBe(1);
      expect(ops[0].numeroOp).toBe('OP-001');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/cxp/ordenes-pago`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 1000, montoNeto: 1000, estado: 'PENDIENTE_APROBACION' }]);
  });

  it('debería emitir una orden de pago', () => {
    const payload = { comprobanteId: 10, numeroOp: 'OP-002', montoRetenciones: 100 };
    service.emitirOrdenDePago(payload).subscribe(res => {
      expect(res.id).toBe(2);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/cxp/ordenes-pago`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 2, numeroOp: 'OP-002', comprobanteId: 10, montoBruto: 1000, montoRetenciones: 100, montoNeto: 900, estado: 'PENDIENTE_APROBACION' });
  });

  it('debería aprobar una orden de pago', () => {
    service.aprobarOrdenDePago(1).subscribe(res => {
      expect(res.estado).toBe('APROBADA');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/cxp/ordenes-pago/1/aprobar`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 1000, montoNeto: 1000, estado: 'APROBADA' });
  });

  it('debería ejecutar una orden de pago con idempotency header', () => {
    service.ejecutarOrdenDePago(1, { medioPago: 'TRANSFERENCIA', referenciaTransf: 'REF123' }, 'KEY-999').subscribe(res => {
      expect(res.estado).toBe('EJECUTADA');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/cxp/ordenes-pago/1/ejecutar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Idempotency-Key')).toBe('KEY-999');
    req.flush({ id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 1000, montoNeto: 1000, estado: 'EJECUTADA' });
  });
});
