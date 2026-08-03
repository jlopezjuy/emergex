import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FacturacionApiService, RegistrarPagoRequest } from './facturacion.api';
import { environment } from '../../../environments/environment';

describe('FacturacionApiService (TDD Integration Spec)', () => {
  let service: FacturacionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FacturacionApiService],
    });

    service = TestBed.inject(FacturacionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería solicitar listarFacturas con parámetro opcional estado', () => {
    service.listarFacturas('EMITIDA').subscribe((facturas) => {
      expect(facturas.length).toBe(1);
      expect(facturas[0].numeroFactura).toBe('FAC-101');
      expect(facturas[0].importeTotal).toBe(1500);
    });

    const req = httpMock.expectOne((request) =>
      request.url === `${environment.apiUrl}/v1/facturas` &&
      request.params.get('estado') === 'EMITIDA'
    );
    expect(req.request.method).toBe('GET');

    req.flush([
      { id: 101, numeroFactura: 'FAC-101', estado: 'EMITIDA', importeTotal: 1500 },
    ]);
  });

  it('debería enviar POST para generarMensual', () => {
    service.generarMensual(5, 2026).subscribe((res) => {
      expect(res.totalGeneradas).toBe(10);
      expect(res.facturasGeneradas.length).toBe(10);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/facturas/generar-mensual`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mes: 5, anio: 2026 });

    req.flush({
      mes: 5,
      anio: 2026,
      totalGeneradas: 10,
      totalOmitidas: 0,
      facturasGeneradas: Array(10).fill({ id: 1, importeTotal: 1000 }),
    });
  });

  it('debería manejar errores 400 Bad Request al registrar un pago con datos inválidos', () => {
    const pagoReq: RegistrarPagoRequest = {
      fechaPago: '2026-05-15',
      monto: -500,
      metodoPago: 'TRANSFERENCIA',
    };

    service.registrarPago(101, pagoReq).subscribe({
      next: () => expect.fail('Debería haber fallado con 400'),
      error: (err) => {
        expect(err.status).toBe(400);
        expect(err.error.message).toContain('Monto inválido');
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/facturas/101/pagos`);
    expect(req.request.method).toBe('POST');

    req.flush({ message: 'Monto inválido para el pago' }, { status: 400, statusText: 'Bad Request' });
  });

  it('debería capturar timeout o error 500 de servidor en la generación fiscal', () => {
    service.generarMensual(6, 2026).subscribe({
      next: () => expect.fail('Debería haber fallado con 500'),
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/facturas/generar-mensual`);
    req.flush({ message: 'Fallo catastrófico en servicio ARCA/AFIP' }, { status: 500, statusText: 'Internal Server Error' });
  });
});
