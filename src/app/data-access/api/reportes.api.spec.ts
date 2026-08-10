import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReportesApiService } from './reportes.api';
import { ReporteFinancieroDTO, ReporteComprasDTO, ReportePadronContratosDTO } from '../dto/reportes.dto';
import { environment } from '../../../environments/environment';

describe('ReportesApiService', () => {
  let service: ReportesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportesApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería solicitar el reporte financiero con parámetros de fecha', () => {
    const mockReporte: ReporteFinancieroDTO = {
      totalCobranza: 150000,
      totalDeuda: 45000,
      totalDebitos: 12000,
      aging: {
        totalSaldoDeuda: 45000,
        total0a30: 20000,
        total31a60: 15000,
        total61a90: 7000,
        total90Mas: 3000,
      },
    };

    service.financiero('2026-01-01T00:00:00Z', '2026-01-31T23:59:59Z').subscribe((res) => {
      expect(res).toEqual(mockReporte);
      expect(res.aging?.total0a30).toBe(20000);
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/api/v1/reportes/financiero` &&
        request.params.get('desde') === '2026-01-01T00:00:00Z' &&
        request.params.get('hasta') === '2026-01-31T23:59:59Z'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockReporte);
  });

  it('debería solicitar el reporte de compras', () => {
    const mockReporte: ReporteComprasDTO = {
      totalCuentasPorPagar: 85000,
      gastoPorProveedor: [{ proveedorId: 1, razonSocial: 'Droguería Central', totalGasto: 50000 }],
    };

    service.compras().subscribe((res) => {
      expect(res).toEqual(mockReporte);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/reportes/compras`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReporte);
  });

  it('debería solicitar el reporte de padrón y contratos', () => {
    const mockReporte: ReportePadronContratosDTO = {
      totalAfiliadosActivos: 1250,
      contratosActivos: 15,
    };

    service.padronContratos().subscribe((res) => {
      expect(res).toEqual(mockReporte);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/reportes/padron-contratos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReporte);
  });
});
