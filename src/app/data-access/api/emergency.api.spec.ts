import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmergencyApiService } from './emergency.api';
import { AltaRapidaRequest, CrearTicketRequest, DespacharRequest, DespachoMultiMovilRequest } from '../dto/ticket.dto';

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

  it('should call despacho-multiple endpoint with the list of ambulance ids (V2)', () => {
    const reqBody: DespachoMultiMovilRequest = { ambulanciaIds: [10, 11], nota: 'VIR + UTIM' };
    const mockResponse = {
      id: 202,
      numeroTicket: 'T-202',
      estadoActual: 'DESPACHADO',
    };

    service.despacharMultiple(202, reqBody).subscribe((ticket) => {
      expect(ticket.id).toBe(202);
      expect(ticket.estado).toBe('DESPACHADO');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/v2/asistencias/202/despacho-multiple'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqBody);
    req.flush(mockResponse);
  });

  it('should map the full ticket from raw.ticket in the alta rápida response (G1)', () => {
    const mockRequest: AltaRapidaRequest = {
      tipoAsistencia: 'EMERGENCIA_DOMICILIARIA',
      nivelUrgencia: 'ROJO',
      descripcionSintomas: 'Dolor precordial',
    };

    const mockResponse = {
      ticketId: 303,
      numeroTicket: 'E-000303',
      estadoActual: 'RECIBIDO',
      ticket: {
        id: 303,
        numeroTicket: 'E-000303',
        estadoActual: 'RECIBIDO',
        nivelUrgencia: 'ROJO',
        tipoAsistencia: 'EMERGENCIA_DOMICILIARIA',
        direccion: 'Av. San Martín 1234',
        descripcionSintomas: 'Dolor precordial',
        pacienteNombreSnapshot: 'Miguel Bustamante',
        pacienteDniSnapshot: '7289503',
        ambulancia: { id: 10, codigo: 'VIR-01' },
        horaLlamada: new Date().toISOString(),
      },
    };

    service.altaRapida(mockRequest).subscribe((ticket) => {
      expect(ticket.id).toBe(303);
      expect(ticket.codigo).toBe('E-000303');
      expect(ticket.nivelUrgencia).toBe('ROJO');
      expect(ticket.prioridad).toBe('CRITICA');
      expect(ticket.tipoAsistencia).toBe('EMERGENCIA_DOMICILIARIA');
      expect(ticket.direccion).toBe('Av. San Martín 1234');
      expect(ticket.pacienteDniSnapshot).toBe('7289503');
      expect(ticket.ambulanciaId).toBe(10);
      expect(ticket.unidadAsignada).toBe('VIR-01');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/operador-emergencias/tickets/alta-rapida'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should derive ambulancias from the active historialMoviles entries (multi-móvil)', () => {
    const mockResponse = {
      id: 400,
      estadoActual: 'DESPACHADO',
      historialMoviles: [
        {
          ambulanciaId: 10,
          ambulanciaCodigo: 'VIR-01',
          fechaAsignacion: '2026-08-06T10:00:00Z',
          fechaLiberacion: null,
        },
        {
          ambulanciaId: 11,
          ambulanciaCodigo: 'UTIM-02',
          fechaAsignacion: '2026-08-06T10:00:00Z',
          fechaLiberacion: null,
        },
        {
          ambulanciaId: 12,
          ambulanciaCodigo: 'AMB-03',
          fechaAsignacion: '2026-08-06T09:00:00Z',
          fechaLiberacion: '2026-08-06T09:30:00Z',
        },
      ],
    };

    service.getById(400).subscribe((ticket) => {
      expect(ticket.ambulancias?.map((a) => a.ambulanciaId)).toEqual([10, 11]);
      expect(ticket.ambulancias?.[0].ambulanciaCodigo).toBe('VIR-01');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/v2/asistencias/400'));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should post hospital delivery to the V1 endpoint', () => {
    const delivery = {
      receptorNombre: 'Dra. Ana Pérez',
      horaEntrega: '2026-08-11T12:00:00.000Z',
      hospitalId: 12,
    };

    service.registrarEntregaHospitalaria(66816, delivery).subscribe();

    const req = httpMock.expectOne((r) =>
      r.url.endsWith('/api/v1/asistencias/66816/entrega-hospitalaria'),
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(delivery);
    req.flush({ id: 1, ticketId: 66816, ...delivery });
  });

  it('should atomically complete hospital delivery through the V1 endpoint with idempotency', () => {
    const command = {
      entrega: {
        receptorNombre: 'Dra. Ana Pérez',
        horaEntrega: '2026-08-12T12:00:00.000Z',
        hospitalId: 12,
      },
      cierre: {
        nota: 'Paciente entregado al hospital receptor.',
        resolucion: {
          impresionClinica: 'Estabilizado al arribo.',
          requiereTraslado: true,
          tipoResolucion: 'DERIVADO_HOSPITAL',
        },
      },
    };

    service.completarEntregaHospitalaria(66816, command, 'handover-66816-1').subscribe((ticket) => {
      expect(ticket.id).toBe(66816);
      expect(ticket.estado).toBe('COMPLETADO');
    });

    const req = httpMock.expectOne((request) =>
      request.url.endsWith('/api/v1/asistencias/66816/completar-entrega-hospitalaria'),
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(command);
    expect(req.request.headers.get('X-Idempotency-Key')).toBe('handover-66816-1');
    req.flush({ id: 66816, estadoActual: 'COMPLETADO' });
  });
});
