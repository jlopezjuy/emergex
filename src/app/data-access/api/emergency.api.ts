import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  HospitalDTO,
  EntregaHospitalariaDTO,
  TelemedicinaSalaResponseDTO,
  CoberturaAsistenciaSnapshotDTO,
  ContactoDespachoRequestDTO,
  ConsentimientoInformadoDTO,
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
      nivelUrgencia:      raw.nivelUrgencia,
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
      enTraslado:         raw.enTraslado,
      trasladoFinalizado: raw.trasladoFinalizado,
      elapsedSeconds:     raw.horaLlamada
        ? Math.floor((Date.now() - new Date(raw.horaLlamada).getTime()) / 1000)
        : raw.esperaMinutos != null ? raw.esperaMinutos * 60 : undefined,
      latitud:            undefined,
      longitud:           undefined,
      tipoAsistencia:     raw.tipoAsistencia,
      canal:              raw.canal,
      empresaHabilitaTelemedicina: raw.empresa?.habilitaTelemedicina,
      empresaUrlTelemedicina: raw.empresa?.urlTelemedicina,
      contextoCobertura:  raw.contextoCobertura,
      coberturaNombreSnapshot: raw.coberturaNombreSnapshot,
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

  getHistorial(): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<any[]>(`${this.base}/historial`).pipe(
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
        resolucion:    raw.resolucion,
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

  getLatestGeo(targetType: 'TICKET' | 'AMBULANCIA', targetId: number): Observable<{ latitud: number; longitud: number; timestamp?: string }> {
    if (!targetId || isNaN(targetId) || targetId <= 0) {
      return throwError(() => new Error(`targetId inválido para geo posiciones: ${targetId}`));
    }
    return this.http.get<any>(`${environment.apiUrl}/api/v1/geo/posiciones/${targetType}/${targetId}/latest`).pipe(
      map((geo) => ({
        latitud: Number(geo.latitud),
        longitud: Number(geo.longitud),
        timestamp: geo.timestamp,
      })),
    );
  }

  getTracking(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/v1/tickets/${id}/tracking`);
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
    void id;
    void nota;
    return throwError(() => new Error('NOTA_ENDPOINT_NOT_AVAILABLE'));
  }

  getAtencionesPorTicket(ticketId: number): Observable<AtencionAsistenciaItemDTO[]> {
    return this.http.get<AtencionAsistenciaItemDTO[]>(`${environment.apiUrl}/api/atenciones/ticket/${ticketId}/atenciones`);
  }

  iniciarAtencionDesdeTicket(ticketId: number, profesionalId?: number): Observable<IniciarAtencionDesdeTicketResponse> {
    return this.http.post<IniciarAtencionDesdeTicketResponse>(
      `${environment.apiUrl}/api/atenciones/iniciar-desde-ticket/${ticketId}`,
      {
        tipoConsulta: 'URGENCIA',
        ...(profesionalId ? { profesionalId } : {}),
      },
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

  getHospitales(): Observable<HospitalDTO[]> {
    return this.http.get<HospitalDTO[]>(`${environment.apiUrl}/api/hospitales`);
  }

  registrarEntregaHospitalaria(ticketId: number, dto: EntregaHospitalariaDTO): Observable<EntregaHospitalariaDTO> {
    return this.http.post<EntregaHospitalariaDTO>(
      `${this.base}/${ticketId}/entrega-hospitalaria`,
      dto
    );
  }

  getEntregaHospitalaria(ticketId: number): Observable<EntregaHospitalariaDTO | null> {
    return this.http.get<EntregaHospitalariaDTO>(
      `${this.base}/${ticketId}/entrega-hospitalaria`
    ).pipe(
      catchError(() => of(null))
    );
  }

  iniciarTelemedicina(ticketId: number): Observable<TelemedicinaSalaResponseDTO> {
    return this.http.post<TelemedicinaSalaResponseDTO>(
      `${environment.apiUrl}/api/operador-emergencias/tickets/${ticketId}/iniciar-telemedicina`,
      {}
    );
  }

  getCoberturaSnapshot(ticketId: number): Observable<CoberturaAsistenciaSnapshotDTO | null> {
    return this.http.get<CoberturaAsistenciaSnapshotDTO>(`${environment.apiUrl}/api/v2/tickets/${ticketId}/cobertura-snapshot`)
      .pipe(catchError(() => of(null)));
  }

  registrarContactoDespacho(ticketId: number, req: ContactoDespachoRequestDTO): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/api/operador-emergencias/tickets/${ticketId}/contactos-despacho`,
      req
    );
  }

  getConsentimientos(pacienteId?: number): Observable<ConsentimientoInformadoDTO[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/consentimiento-informados?size=1000`).pipe(
      map(list => {
        if (!list) return [];
        if (pacienteId) {
          return list.filter(c => c.paciente?.id === pacienteId);
        }
        return list;
      }),
      catchError(() => of([]))
    );
  }

  getAsistenciasPorEvento(eventoId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v2/eventos-cobertura/${eventoId}/asistencias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getAsistenciasPorInstitucion(institucionId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v2/instituciones/${institucionId}/asistencias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getAsistenciasPorContexto(contextoCoberturaId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v2/contextos-cobertura/${contextoCoberturaId}/asistencias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }
}
