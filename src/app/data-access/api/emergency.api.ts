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
  SignosVitalesDTO,
  AtencionFullDTO,
  AtencionAsistenciaItemDTO,
  IniciarAtencionDesdeTicketResponse,
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

  private normalizeEstado(rawEstado?: string): string | undefined {
    return rawEstado === 'COMPLETADO' ? 'CERRADO' : rawEstado;
  }

  private mapTicket(raw: any): TicketAsistenciaDTO {
    return {
      id:                 raw.id,
      codigo:             raw.numeroTicket,
      tipoEmergencia:     raw.descripcionSintomas,
      estado:             this.normalizeEstado(raw.estadoActual),
      prioridad:          URGENCIA_MAP[raw.nivelUrgencia] ?? undefined,
      direccion:          raw.direccion,
      ambulanciaId:       raw.ambulancia?.id,
      unidadAsignada:     raw.ambulancia?.codigo,
      empresaId:          raw.empresa?.id,
      operador:           raw.creadoPor?.login,
      fechaCreacion:      raw.horaLlamada,
      pacienteDescripcion: raw.pacienteNombreSnapshot,
      horaDespacho:       raw.horaDespacho,
      horaLlegada:        raw.horaLlegada,
      horaInicioTraslado: raw.horaInicioTraslado,
      horaFinTraslado:    raw.horaFinTraslado,
      horaCierre:         raw.horaCierre,
      elapsedSeconds:     raw.horaLlamada
        ? Math.floor((Date.now() - new Date(raw.horaLlamada).getTime()) / 1000)
        : raw.esperaMinutos != null ? raw.esperaMinutos * 60 : undefined,
      latitud:            undefined,
      longitud:           undefined,
    };
  }

  private mapResolucionSignos(resolucion: any): SignosVitalesDTO[] {
    const resumen = resolucion?.resumenSignosVitales;
    if (!resumen) return [];

    const taMatch = String(resumen).match(/TA:\s*(\d+)\s*\/\s*(\d+)/i);
    const fcMatch = String(resumen).match(/FC:\s*(\d+)/i);
    const frMatch = String(resumen).match(/FR:\s*(\d+)/i);
    const satMatch = String(resumen).match(/SatO2:\s*(\d+)/i);
    const tempMatch = String(resumen).match(/Temp:\s*([\d.]+)/i);
    const gluMatch = String(resumen).match(/Glu:\s*(\d+)/i);

    return [{
      timestamp: resolucion.fechaResolucion,
      presionSistolica: taMatch ? Number(taMatch[1]) : undefined,
      presionDiastolica: taMatch ? Number(taMatch[2]) : undefined,
      frecuenciaCardiaca: fcMatch ? Number(fcMatch[1]) : undefined,
      frecuenciaRespiratoria: frMatch ? Number(frMatch[1]) : undefined,
      saturacionO2: satMatch ? Number(satMatch[1]) : undefined,
      temperatura: tempMatch ? Number(tempMatch[1]) : undefined,
      glucemia: gluMatch ? Number(gluMatch[1]) : undefined,
    }];
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
          id:     m.profesional?.id ?? m.profesionalId ?? m.id,
          nombre: [m.profesional?.apellido, m.profesional?.nombre].filter(Boolean).join(', ') || m.profesionalNombre || m.nombre,
          rol:    m.rolEnTicket ?? m.rol,
        })),
        signos:        this.mapResolucionSignos(raw.resolucion),
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

  iniciarTraslado(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/iniciar-traslado`, {});
  }

  finalizarTraslado(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/finalizar-traslado`, {});
  }

  cerrar(id: number, req: CerrarTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<any>(`${this.base}/${id}/cerrar`, req).pipe(
      map((r) => this.mapTicket(r)),
    );
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

  getAtencionesPorTicket(ticketId: number): Observable<AtencionAsistenciaItemDTO[]> {
    return this.http.get<AtencionAsistenciaItemDTO[]>(`${environment.apiUrl}/api/atenciones/ticket/${ticketId}/atenciones`);
  }

  iniciarAtencionDesdeTicket(ticketId: number): Observable<IniciarAtencionDesdeTicketResponse> {
    return this.http.post<IniciarAtencionDesdeTicketResponse>(
      `${environment.apiUrl}/api/atenciones/iniciar-desde-ticket/${ticketId}`,
      { tipoConsulta: 'URGENCIA' },
    );
  }

  getAtencionDetalle(atencionId: number): Observable<AtencionFullDTO> {
    return this.http.get<any>(`${environment.apiUrl}/api/atenciones/${atencionId}/detalle`).pipe(
      map((raw) => ({
        ...raw,
        signos: (raw.signos ?? []).map((s: any) => ({
          id: s.id,
          timestamp: s.fechaHora,
          fechaHora: s.fechaHora,
          frecuenciaCardiaca: s.frecuenciaCardiaca,
          presionSistolica: s.presionSistolica,
          presionDiastolica: s.presionDiastolica,
          saturacionO2: s.saturacionOxigeno,
          saturacionOxigeno: s.saturacionOxigeno,
          temperatura: s.temperatura != null ? Number(s.temperatura) : undefined,
          frecuenciaRespiratoria: s.frecuenciaRespiratoria,
          glucemia: s.glucemia,
          observacion: s.observacion ?? s.observaciones,
        })),
      } as AtencionFullDTO)),
    );
  }

  guardarAtencionCompleta(req: AtencionFullDTO): Observable<AtencionFullDTO> {
    return this.http.post<AtencionFullDTO>(`${environment.apiUrl}/api/atenciones/guardar-completa`, req);
  }
}
