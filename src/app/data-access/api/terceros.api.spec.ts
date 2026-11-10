import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TercerosApiService } from './terceros.api';
import { environment } from '../../../environments/environment';

describe('TercerosApiService', () => {
  let service: TercerosApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TercerosApiService
      ]
    });
    service = TestBed.inject(TercerosApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería registrar un tercero', () => {
    const dto = {
      tipoIdentificador: 'CUIT' as const,
      identificador: '30-12345678-9',
      razonSocialCanonica: 'Proveedor Test SA',
      nombreComercial: 'Proveedor Test'
    };

    service.registrarTercero(dto).subscribe(res => {
      expect(res.id).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/terceros`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 1, ...dto });
  });

  it('debería solicitar alta de CBU', () => {
    const dto = {
      terceroEmpresaId: 1,
      bancoNombre: 'Banco Galicia',
      cbu: '0070000000000000000012',
      titularNombre: 'Proveedor Test SA'
    };

    service.solicitarAltaCbu(dto).subscribe(res => {
      expect(res.id).toBe(10);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/terceros/cuentas-bancarias/solicitar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 10, ...dto, estado: 'PENDIENTE_VERIFICACION' });
  });

  it('debería listar las cuentas bancarias de un tercero (QA-ROL-021)', () => {
    service.listarCuentasBancarias(7).subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].estado).toBe('PENDIENTE_VERIFICACION');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/terceros/7/cuentas-bancarias`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 10, bancoNombre: 'Banco X', cbuMasked: '****1234', titularNombre: 'Prov SA', estado: 'PENDIENTE_VERIFICACION' }]);
  });

  it('debería aprobar CBU de un tercero', () => {
    service.aprobarCbu(10).subscribe(res => {
      expect(res.estado).toBe('VERIFICADA');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/terceros/cuentas-bancarias/10/aprobar`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, estado: 'VERIFICADA' });
  });

  it('debería obtener listado paginado con X-Total-Count (V3-S3-01)', () => {
    const mockResumen = [
      { id: 1, razonSocial: 'Proveedor A', cuit: '30-11111111-9', nombreComercial: 'Prov A' }
    ];

    service.getPage({ q: 'Proveedor', page: 0, size: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.total).toBe(42);
      expect(res.data[0].razonSocial).toBe('Proveedor A');
    });

    const req = httpMock.expectOne(request =>
      request.url === `${environment.apiUrl}/api/terceros` &&
      request.params.get('q') === 'Proveedor' &&
      request.params.get('page') === '0' &&
      request.params.get('size') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResumen, { headers: { 'X-Total-Count': '42' } });
  });
});
