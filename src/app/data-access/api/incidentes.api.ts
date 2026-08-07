import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TicketAsistenciaDTO } from '../dto/ticket.dto';

/**
 * Estado del ciclo de vida de un siniestro/accidente masivo (multi-paciente).
 *
 * <p>Espejo del enum Java {@code EstadoIncidenteEvento}. Un incidente nace
 * {@code ABIERTO} y solo pasa a {@code CERRADO} a través del endpoint de cierre,
 * que exige que no queden tickets de asistencia activos vinculados.</p>
 */
export type EstadoIncidenteEvento = 'ABIERTO' | 'CERRADO';

/**
 * DTO de un incidente (siniestro/accidente masivo).
 *
 * <p>{@code numeroIncidente} (serie {@code IN-XXXXXX}) es asignado por el backend en
 * el alta. {@code ticketsCount} es un campo de salida que el backend calcula al
 * listar, no se envía en la creación.</p>
 */
export interface IncidenteEventoDTO {
  id: number;
  numeroIncidente?: string;
  descripcion: string;
  direccion?: string;
  fechaHora: string;
  latitud?: number;
  longitud?: number;
  estado: EstadoIncidenteEvento;
  empresaId?: number;
  ticketsCount?: number;
}

/** Payload de creación/edición de un incidente. {@code numeroIncidente} no viaja. */
export interface IncidenteEventoPayload {
  descripcion: string;
  direccion?: string;
  fechaHora: string;
  latitud?: number;
  longitud?: number;
}

/**
 * API de siniestros/accidentes masivos multi-paciente (backend v2).
 *
 * <p>La asignación de tickets a un incidente es SIEMPRE explícita del operador
 * ({@code vincularTicket}/{@code desvincularTicket}): no hay geocerca automática.
 * Todos los endpoints son multi-tenant (el backend filtra por la empresa del
 * usuario autenticado).</p>
 */
@Injectable({ providedIn: 'root' })
export class IncidentesApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/incidentes-evento`;

  /**
   * Lista los incidentes de la empresa actual, opcionalmente filtrados por estado.
   */
  getIncidentes(estado?: EstadoIncidenteEvento): Observable<IncidenteEventoDTO[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<IncidenteEventoDTO[]>(this.base, { params });
  }

  /** Detalle de un incidente (multi-tenant). */
  getIncidente(id: number): Observable<IncidenteEventoDTO> {
    return this.http.get<IncidenteEventoDTO>(`${this.base}/${id}`);
  }

  /** Crea un incidente nuevo. El backend asigna numeroIncidente y estado=ABIERTO. */
  crearIncidente(dto: IncidenteEventoPayload): Observable<IncidenteEventoDTO> {
    return this.http.post<IncidenteEventoDTO>(this.base, dto);
  }

  /** Cierra el incidente si no quedan tickets activos vinculados. */
  cerrarIncidente(id: number): Observable<IncidenteEventoDTO> {
    return this.http.post<IncidenteEventoDTO>(`${this.base}/${id}/cerrar`, {});
  }

  /** Vincula un ticket existente al incidente (asignación explícita del operador). */
  vincularTicket(incidenteId: number, ticketId: number): Observable<IncidenteEventoDTO> {
    return this.http.post<IncidenteEventoDTO>(`${this.base}/${incidenteId}/tickets/${ticketId}`, {});
  }

  /** Desvincula un ticket del incidente. */
  desvincularTicket(incidenteId: number, ticketId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${incidenteId}/tickets/${ticketId}`);
  }

  /** Tickets de asistencia vinculados al siniestro (multi-tenant). */
  getTicketsIncidente(incidenteId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<any[]>(`${this.base}/${incidenteId}/tickets`).pipe(map(list => (list ?? []).map(r => this.mapTicket(r))));
  }

  /**
   * Normaliza el ticket del backend al shape que usa el operativo ({@code TicketAsistenciaDTO}).
   *
   * <p>Replica el mapeo mínimo que consume {@code coverage-operations}: código,
   * estado, urgencia, unidad, descripción del paciente e incidente. El resto de los
   * campos quedan undefined y no afectan al operativo.</p>
   */
  private mapTicket(raw: any): TicketAsistenciaDTO {
    return {
      id: raw.id ?? raw.ticketId,
      codigo: raw.numeroTicket,
      estado: raw.estadoActual,
      nivelUrgencia: raw.nivelUrgencia,
      direccion: raw.direccion,
      unidadAsignada: raw.ambulancia?.codigo,
      pacienteDescripcion: raw.pacienteNombreSnapshot,
      pacienteNombreSnapshot: raw.pacienteNombreSnapshot,
      coberturaNombreSnapshot: raw.coberturaNombreSnapshot,
      fechaCreacion: raw.horaLlamada,
      contextoCobertura: raw.contextoCobertura,
      incidenteEventoId: raw.incidenteEventoId,
      incidenteEventoNumero: raw.incidenteEventoNumero,
    };
  }
}
