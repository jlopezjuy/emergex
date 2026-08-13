import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditoriaMedicaApiService, PrestacionAuditDTO } from './auditoria-medica.api';
import { environment } from '../../../environments/environment';

describe('AuditoriaMedicaApiService', () => {
  let service: AuditoriaMedicaApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/v2/auditoria-medica`;

  const prestacion: PrestacionAuditDTO = {
    id: 1,
    fecha: '2026-08-12T10:00:00Z',
    cargoCobrado: 5000,
    importeUnitario: 4500,
    estadoRevision: 'PENDIENTE',
    paciente: { id: 1, nombre: 'Juan', apellido: 'Perez', dni: '30111222' },
    prestacion: { id: 1, codigo: 'COD-1', nombre: 'Emergencia domiciliaria' },
    ticket: { id: 1, numeroTicket: 'TK-0001', direccion: 'Calle Falsa 123', tipoAsistencia: 'EMERGENCIA_DOMICILIARIA', nivelUrgencia: 'ROJO' },
    contratoCobertura: { id: 1, codigo: 'CONV-001' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuditoriaMedicaApiService],
    });
    service = TestBed.inject(AuditoriaMedicaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list pendientes via GET', () => {
    service.pendientes().subscribe(res => {
      expect(res).toEqual([prestacion]);
    });

    const req = httpMock.expectOne(`${baseUrl}/pendientes`);
    expect(req.request.method).toBe('GET');
    req.flush([prestacion]);
  });

  it('should aprobar a prestación via POST', () => {
    service.aprobar(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1/aprobar`);
    expect(req.request.method).toBe('POST');
    req.flush(prestacion);
  });

  it('should excluir a prestación via POST with motivo', () => {
    service.excluir(1, 'Falta documentación').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1/excluir`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Falta documentación' });
    req.flush(prestacion);
  });
});
