import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TesoreriaApi } from './tesoreria.api';
import { environment } from '../../../environments/environment';

describe('TesoreriaApi (TDD Integration Spec)', () => {
  let service: TesoreriaApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TesoreriaApi],
    });

    service = TestBed.inject(TesoreriaApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería enviar POST a /api/v2/tesoreria/cajas con HttpParams para abrir caja', () => {
    service.abrirCaja('Caja Central', 5000).subscribe((res) => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${environment.apiUrl}/api/v2/tesoreria/cajas` &&
      r.params.get('nombre') === 'Caja Central' &&
      r.params.get('montoInicial') === '5000'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, nombre: 'Caja Central', montoInicial: 5000 });
  });

  it('debería enviar POST a /api/v2/tesoreria/cajas/:id/movimientos con HttpParams', () => {
    service.registrarMovimientoCaja(1, 'INGRESO', 1200, 'Cobro de coseguro').subscribe((res) => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${environment.apiUrl}/api/v2/tesoreria/cajas/1/movimientos` &&
      r.params.get('tipo') === 'INGRESO' &&
      r.params.get('monto') === '1200' &&
      r.params.get('concepto') === 'Cobro de coseguro'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, tipo: 'INGRESO', monto: 1200, concepto: 'Cobro de coseguro' });
  });

  it('debería enviar POST a /api/v2/tesoreria/cajas/:id/arqueo con HttpParams', () => {
    service.realizarArqueoCaja(1, 4800).subscribe((res) => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${environment.apiUrl}/api/v2/tesoreria/cajas/1/arqueo` &&
      r.params.get('montoFisicoContado') === '4800'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ id: 5, montoFisicoContado: 4800 });
  });
});
