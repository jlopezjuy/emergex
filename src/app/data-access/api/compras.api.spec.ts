import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComprasApiService } from './compras.api';
import { environment } from '../../../environments/environment';

describe('ComprasApiService (F0-04 Integration Spec)', () => {
  let service: ComprasApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ComprasApiService],
    });

    service = TestBed.inject(ComprasApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería consultar solicitudes de compra con base URL correcta', () => {
    service.getSolicitudes().subscribe((solicitudes) => {
      expect(solicitudes.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/compras/solicitudes`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, concepto: 'Insumos médicos', estado: 'PENDIENTE' }]);
  });

  it('debería aprobar una solicitud de compra', () => {
    service.aprobarSolicitud(1).subscribe((res) => {
      expect(res.estado).toBe('APROBADA');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/compras/solicitudes/1/aprobar`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, concepto: 'Insumos médicos', estado: 'APROBADA' });
  });

  it('debería consultar órdenes de compra', () => {
    service.getOrdenesCompra().subscribe((ordenes) => {
      expect(ordenes.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/compras/ordenes`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 10, numero: 'OC-1001', montoTotal: 50000 }]);
  });
});
