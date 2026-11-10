import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IncidentesApiService } from './incidentes.api';

describe('IncidentesApiService', () => {
  let service: IncidentesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IncidentesApiService]
    });
    service = TestBed.inject(IncidentesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería listar incidentes sin filtro por defecto', () => {
    service.getIncidentes().subscribe();

    const req = httpMock.expectOne(r => {
      const url = new URL(r.urlWithParams);
      return url.pathname.endsWith('/api/v2/incidentes-evento') && !url.searchParams.has('estado');
    });
    expect(req.request.method).toBe('GET');
  });

  it('debería filtrar por estado cuando se pasa ABIERTO', () => {
    service.getIncidentes('ABIERTO').subscribe();

    const req = httpMock.expectOne(r => {
      const url = new URL(r.urlWithParams);
      return url.pathname.endsWith('/api/v2/incidentes-evento') && url.searchParams.get('estado') === 'ABIERTO';
    });
    expect(req.request.method).toBe('GET');
  });

  it('debería crear un incidente con POST', () => {
    const payload = { descripcion: 'Choque en ruta', fechaHora: '2026-08-07T10:00:00Z' };
    service.crearIncidente(payload).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/api/v2/incidentes-evento'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.descripcion).toBe('Choque en ruta');
  });

  it('debería cerrar un incidente con POST /cerrar', () => {
    service.cerrarIncidente(42).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/api/v2/incidentes-evento/42/cerrar'));
    expect(req.request.method).toBe('POST');
  });

  it('debería vincular y desvincular tickets', () => {
    service.vincularTicket(42, 7).subscribe();
    const linkReq = httpMock.expectOne(r => r.url.endsWith('/api/v2/incidentes-evento/42/tickets/7'));
    expect(linkReq.request.method).toBe('POST');

    service.desvincularTicket(42, 7).subscribe();
    const unlinkReq = httpMock.expectOne(r => r.url.endsWith('/api/v2/incidentes-evento/42/tickets/7'));
    expect(unlinkReq.request.method).toBe('DELETE');
  });

  it('debería mapear los tickets del incidente al DTO del operativo', () => {
    service.getTicketsIncidente(42).subscribe(tickets => {
      expect(tickets.length).toBe(1);
      expect(tickets[0].id).toBe(99);
      expect(tickets[0].codigo).toBe('E-000001');
      expect(tickets[0].estado).toBe('RECIBIDO');
      expect(tickets[0].incidenteEventoId).toBe(42);
      expect(tickets[0].unidadAsignada).toBe('U-04');
    });

    const req = httpMock.expectOne(r => r.url.endsWith('/api/v2/incidentes-evento/42/tickets'));
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 99,
        numeroTicket: 'E-000001',
        estadoActual: 'RECIBIDO',
        nivelUrgencia: 'ROJO',
        pacienteNombreSnapshot: 'Pérez, Juan',
        ambulancia: { id: 4, codigo: 'U-04' },
        incidenteEventoId: 42,
        incidenteEventoNumero: 'IN-000001',
      }
    ]);
  });
});
