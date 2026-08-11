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

  it('debería consultar solicitudes paginadas con cabecera X-Total-Count (V3-S3-01)', () => {
    service.getSolicitudesPage(0, 10).subscribe((paged) => {
      expect(paged.data.length).toBe(1);
      expect(paged.total).toBe(15);
      expect(paged.data[0].centroCostoId).toBe(5);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/compras/solicitudes?page=0&size=10&sort=id,desc`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, concepto: 'Insumos médicos', estado: 'PRESENTADA', centroCostoId: 5 }], {
      headers: { 'X-Total-Count': '15' }
    });
  });

  it('debería obtener cotizaciones por solicitud (V3-S3-02)', () => {
    const mockCotizacion = { id: 100, solicitudCompraId: 1, montoCotizado: 15000, proveedorNombre: 'Drogueria Test' };
    service.getCotizacionesPorSolicitud(1).subscribe((cotizaciones) => {
      expect(cotizaciones.length).toBe(1);
      expect(cotizaciones[0].montoCotizado).toBe(15000);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/cotizaciones-proveedor/solicitud/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCotizacion]);
  });

  it('debería registrar una cotización de proveedor (V3-S3-02)', () => {
    const dto = { solicitudCompraId: 1, proveedorId: 2, montoCotizado: 12000, plazoEntregaDias: 3 };
    service.registrarCotizacion(dto).subscribe((res) => {
      expect(res.id).toBe(200);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/cotizaciones-proveedor`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 200, ...dto });
  });
});
