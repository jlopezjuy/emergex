import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BandejasApi } from './bandejas.api';
import { environment } from '../../../environments/environment';
import { BandejaTrabajoResumenDTO } from '../dto/bandejas.dto';

describe('BandejasApi', () => {
  let service: BandejasApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BandejasApi]
    });

    service = TestBed.inject(BandejasApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería realizar GET a /api/admin/bandejas-trabajo/resumen', () => {
    const mockResumen: BandejaTrabajoResumenDTO = {
      ticketsPendientesTarifacion: 5,
      facturasPendientesCobro: 12,
      debitosPendientesReclamo: 2,
      promesasIncumplidas: 1,
      clientesEnMoraCritica: 3,
      ordenesCompraPendientesAprobacion: 4,
      ordenesPagoPendientesAprobacion: 2,
      contratosPorVencer: 6,
      contratosVencidos: 1,
      itemsFacturacion: [],
      itemsCobranzas: [],
      itemsCompras: [],
      itemsContratos: []
    };

    service.getResumen().subscribe((res: BandejaTrabajoResumenDTO) => {
      expect(res).toEqual(mockResumen);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/bandejas-trabajo/resumen`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResumen);
  });
});
