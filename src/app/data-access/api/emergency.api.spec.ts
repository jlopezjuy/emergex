import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmergencyApiService } from './emergency.api';
import { AltaRapidaRequest } from '../dto/ticket.dto';

describe('EmergencyApiService', () => {
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
      // Under existing logic, this will fail because raw.id is mapped to id, and there is no raw.id, only raw.ticketId
      expect(ticket.id).toBe(101);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/operador-emergencias/tickets/alta-rapida'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
