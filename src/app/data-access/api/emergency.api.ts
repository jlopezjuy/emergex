import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  TicketAsistenciaDTO,
  TicketDetalleDTO,
  TripulacionDetalleDTO,
  CrearTicketRequest,
  AltaRapidaRequest,
  DespacharRequest,
  CerrarTicketRequest,
  CancelarTicketRequest,
  LogEstadoTicketDTO,
} from '../dto/ticket.dto';

const URGENCIA_MAP: Record<string, TicketAsistenciaDTO['prioridad']> = {
  ROJO: 'CRITICA',
  AMARILLO: 'URGENTE',
  VERDE: 'NORMAL',
};

@Injectable({ providedIn: 'root' })
export class EmergencyApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/asistencias`;

  private mapTicket(raw: any): TicketAsistenciaDTO {
    return {
      id:                 raw.id,
      codigo:             raw.numeroTicket,
      tipoEmergencia:     raw.descripcionSintomas,
      estado:             raw.estadoActual,
      prioridad:          URGENCIA_MAP[raw.nivelUrgencia] ?? undefined,
      direccion:          raw.direccion,
      ambulanciaId:       raw.ambulancia?.id,
      unidadAsignada:     raw.ambulancia?.codigo,
      empresaId:          raw.empresa?.id,
      operador:           raw.creadoPor?.login,
      fechaCreacion:      raw.horaLlamada,
      pacienteDescripcion: raw.pacienteNombreSnapshot,
      elapsedSeconds:     raw.esperaMinutos != null ? raw.esperaMinutos * 60 : undefined,
      latitud:            undefined,
      longitud:           undefined,
    };
  }

  getActivos(): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<any[]>(`${this.base}/activos`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getById(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(
      map((r) => this.mapTicket(r)),
    );
  }

  getDetalle(id: number): Observable<TicketDetalleDTO> {
    return this.http.get<any>(`${this.base}/${id}/detalle`).pipe(
      map((raw) => ({
        ticket:        raw.ticket ? this.mapTicket(raw.ticket) : undefined,
        timeline:      raw.timeline,
        tripulacion:   (raw.tripulacion ?? []).map((m: any): TripulacionDetalleDTO => ({
          id:     m.profesionalId,
          nombre: m.profesionalNombre,
          rol:    m.rol,
        })),
        signos:        [],
        procedimientos: [],
        medicacion:    [],
      })),
    );
  }

  getTimeline(id: number): Observable<LogEstadoTicketDTO[]> {
    return this.http.get<any[]>(`${this.base}/${id}/timeline`).pipe(
      map((items) =>
        (items ?? []).map((item) => ({
          id:       item.id,
          estado:   item.estadoNuevo ?? item.estado ?? '?',
          fecha:    item.fechaHora   ?? item.fecha   ?? '',
          operador: item.cambiadoPor?.login ?? item.operador,
          notas:    item.nota        ?? item.notas,
        } as LogEstadoTicketDTO))
      )
    );
  }

  crear(req: CrearTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.post<TicketAsistenciaDTO>(`${this.base}/recibir-llamada`, req);
  }

  altaRapida(req: AltaRapidaRequest): Observable<TicketAsistenciaDTO> {
    return this.http.post<any>(
      `${environment.apiUrl}/api/operador-emergencias/tickets/alta-rapida`,
      req,
    ).pipe(map((r) => this.mapTicket(r)));
  }

  despachar(id: number, req: DespacharRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/despachar`, req);
  }

  enCamino(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/en-camino`, {});
  }

  enSitio(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/en-sitio`, {});
  }

  cerrar(id: number, req: CerrarTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/cerrar`, req);
  }

  cancelar(id: number, req: CancelarTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/cancelar`, req);
  }

  sugerirMovil(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/sugerir-movil`);
  }

  agregarNota(id: number, nota: string): Observable<unknown> {
    return this.http.patch<unknown>(`${this.base}/${id}/agregar-nota`, { nota });
  }
}
