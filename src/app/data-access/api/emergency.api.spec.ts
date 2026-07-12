import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmergencyApiService } from './emergency.api';
import { AltaRapidaRequest, CrearTicketRequest, DespacharRequest, CancelarTicketRequest } from '../dto/ticket.dto';

describe('EmergencyApiService - V2 & Adapters', () => {
  let service: EmergencyApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmergencyApiService]
    });
    service = TestBed.inject(EmergencyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map ticketId to id for altaRapida response', () => {
    const mockRequest: AltaRapidaRequest = {
      tipoAsistencia: 'EMERGENCIA_DOMICILIARIA',
      nivelUrgencia: 'ROJO',
      descripcionSintomas: 'Dolor de pecho',
      noAfiliado: true,
      pacienteNombre: 'John',
      pacienteApellido: 'Doe',
      pacienteDni: '12345678',
      pacienteTelefono: '11223344'
    };

    const mockResponse = {
      ticketId: 101,
      numeroTicket: 'T-101',
      estadoActual: 'PENDIENTE',
      horaLlamada: new Date().toISOString(),
      pacienteNombreSnapshot: 'John Doe',
      pacienteTelefonoSnapshot: '11223344'
    };

    service.altaRapida(mockRequest).subscribe((ticket) => {
      expect(ticket.id).toBe(101);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/operador-emergencias/tickets/alta-rapida'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call V2 endpoint on crear() and map using mapTicket', () => {
    const mockRequest: CrearTicketRequest = {
      tipoAsistencia: 'EMERGENCIA_DOMICILIARIA',
      nivelUrgencia: 'ROJO',
      descripcionSintomas: 'Dolor abdominal agudo'
    };

    const mockResponse = {
      id: 202,
      numeroTicket: 'T-202',
      estadoActual: 'ACTIVO',
      horaLlamada: new Date().toISOString()
    };

    service.crear(mockRequest).subscribe((ticket) => {
      expect(ticket.id).toBe(202);
      expect(ticket.codigo).toBe('T-202');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/v2/asistencias/recibir-llamada'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call V2 endpoint on despachar() and map using mapTicket', () => {
    const mockRequest: DespacharRequest = {
      ambulanciaId: 5,
      notas: 'Despacho prioritario'
    };

    const mockResponse = {
      id: 202,
      numeroTicket: 'T-202',
      estadoActual: 'DESPACHADO'
    };

    service.despachar(202, mockRequest).subscribe((ticket) => {
      expect(ticket.id).toBe(202);
      expect(ticket.codigo).toBe('T-202');
      expect(ticket.estado).toBe('DESPACHADO');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/v2/asistencias/202/despachar'));
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('should call V2 endpoint on enCamino() and map using mapTicket', () => {
    const mockResponse = {
      id: 202,
      numeroTicket: 'T-202',
      estadoActual: 'EN_CAMINO'
    };

    service.enCamino(202).subscribe((ticket) => {
      expect(ticket.id).toBe(202);
      expect(ticket.codigo).toBe('T-202');
      expect(ticket.estado).toBe('EN_CAMINO');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/v2/asistencias/202/en-camino'));
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });

  it('should call V2 endpoint on agregarNota() and map using mapTicket', () => {
    const mockResponse = {
      id: 202,
      numeroTicket: 'T-202',
      estadoActual: 'EN_CAMINO'
    };

    service.agregarNota(202, 'Nota de prueba').subscribe((ticket) => {
      expect(ticket.id).toBe(202);
      expect(ticket.codigo).toBe('T-202');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/v2/asistencias/202/agregar-nota'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nota: 'Nota de prueba' });
    req.flush(mockResponse);
  });
});

