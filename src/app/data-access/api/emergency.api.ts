import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  DespachoMultiMovilRequest,
  CerrarTicketRequest,
  CancelarTicketRequest,
  LogEstadoTicketDTO,
  SignosVitalesDTO,
  AtencionFullDTO,
  AtencionAsistenciaItemDTO,
  IniciarAtencionDesdeTicketResponse,
  HospitalDTO,
  DiagnosticoFrecuenteDTO,
  EntregaHospitalariaDTO,
  TelemedicinaSalaResponseDTO,
  CoberturaAsistenciaSnapshotDTO,
  ContactoDespachoRequestDTO,
  ConsentimientoInformadoDTO,
  RegistrarPersonaTicketRequest,
  EpisodioClinicoDTO,
  MotivoLlamadoDTO,
  ContextoEmergenciaPaciente,
} from '../dto/ticket.dto';

const URGENCIA_MAP: Record<string, TicketAsistenciaDTO['prioridad']> = {
  ROJO: 'CRITICA',
  AMARILLO: 'URGENTE',
  VERDE: 'NORMAL',
};

export interface CompletarEntregaHospitalariaCommand {
  entrega: EntregaHospitalariaDTO;
  cierre: CerrarTicketRequest;
}

@Injectable({ providedIn: 'root' })
export class EmergencyApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/asistencias`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTicket(raw: any): TicketAsistenciaDTO {
    return {
      id:                 raw.id ?? raw.ticketId,
      version:            raw.version,
      codigo:             raw.numeroTicket,
      tipoEmergencia:     raw.descripcionSintomas,
      estado:             raw.estadoActual,
      prioridad:          URGENCIA_MAP[raw.nivelUrgencia as string] ?? undefined,
      nivelUrgencia:      raw.nivelUrgencia,
      direccion:          raw.direccion,
      ambulanciaId:       raw.ambulancia?.id,
      ambulanciaEstado:   raw.ambulancia?.estado,
      unidadAsignada:     raw.ambulancia?.codigo,
      empresaId:          raw.empresa?.id,
      operador:           raw.creadoPor?.login,
      fechaCreacion:      raw.horaLlamada,
      pacienteDescripcion: raw.pacienteNombreSnapshot,
      pacienteNombreSnapshot: raw.pacienteNombreSnapshot,
      pacienteDniSnapshot: raw.pacienteDniSnapshot,
      horaDespacho:       raw.horaDespacho,
      horaLlegada:        raw.horaLlegada,
      horaInicioTraslado: raw.horaInicioTraslado,
      horaFinTraslado:    raw.horaFinTraslado,
      horaCierre:         raw.horaCierre,
      entregaHospitalariaRegistrada: raw.entregaHospitalariaRegistrada,
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
      incidenteEventoId:  raw.incidenteEventoId,
      incidenteEventoNumero: raw.incidenteEventoNumero,
      autorizacionEspecial: raw.autorizacionEspecial,
      autorizadoPor:      raw.autorizadoPor,
      detalleAutorizacion: raw.detalleAutorizacion,
      motivoLlamadoId:    raw.motivoLlamadoId,
      motivoLlamadoNombre: raw.motivoLlamadoNombre,
      tipoCoberturaEstadistica: raw.tipoCoberturaEstadistica,
      tipoPracticaEstadistica: raw.tipoPracticaEstadistica,
      historialMoviles:   raw.historialMoviles,
      // Unidades ACTIVAS del ticket (despacho múltiple V2): las filas de historial
      // sin fecha de liberación. La primaria sigue en ambulanciaId/unidadAsignada.
      ambulancias:        (raw.historialMoviles ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m: any) => !m.fechaLiberacion)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => ({
          ambulanciaId: m.ambulanciaId,
          ambulanciaCodigo: m.ambulanciaCodigo,
          fechaAsignacion: m.fechaAsignacion,
        })),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return this.http.get<unknown[]>(`${this.base}/activos`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getMisActivos(): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<unknown[]>(`${this.base}/mis-activos`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getHistorial(): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<unknown[]>(`${this.base}/historial`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getById(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.get<unknown>(`${this.base}/${id}`).pipe(
      map((r) => this.mapTicket(r)),
    );
  }

  getDetalle(id: number): Observable<TicketDetalleDTO> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<any>(`${this.base}/${id}/detalle`).pipe(
      map((raw) => ({
        ticket:        raw.ticket ? this.mapTicket(raw.ticket) : undefined,
        timeline:      raw.timeline,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return this.http.get<Array<Record<string, unknown>>>(`${this.base}/${id}/timeline`).pipe(
      map((items) =>
        (items ?? []).map((item) => ({
          id:       item['id'] as number,
          estado:   (item['estadoNuevo'] ?? item['estado'] ?? '?') as string,
          fecha:    (item['fechaHora']   ?? item['fecha']   ?? '') as string,
          fechaEvento: (item['fechaHoraEvento'] as string | undefined),
          origenHorario: (item['origenHorario'] as string | undefined),
          estadoAnterior: (item['estadoAnterior'] as string | undefined),
          operador: (item['cambiadoPor'] as { login?: string } | undefined)?.login ?? (item['operador'] as string),
          notas:    (item['nota']        ?? item['notas']) as string,
        } as LogEstadoTicketDTO))
      )
    );
  }

  getLatestGeo(targetType: 'TICKET' | 'AMBULANCIA', targetId: number): Observable<{ latitud: number; longitud: number; timestamp?: string }> {
    if (!targetId || isNaN(targetId) || targetId <= 0) {
      return throwError(() => new Error(`targetId inválido para geo posiciones: ${targetId}`));
    }
    return this.http.get<Record<string, unknown>>(`${environment.apiUrl}/api/v1/geo/posiciones/${targetType}/${targetId}/latest`).pipe(
      map((geo) => ({
        latitud: Number(geo['latitud']),
        longitud: Number(geo['longitud']),
        timestamp: geo['timestamp'] as string | undefined,
      })),
    );
  }

  getTracking(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${environment.apiUrl}/api/v1/tickets/${id}/tracking`);
  }

  crear(req: CrearTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.post<unknown>(`${this.base}/recibir-llamada`, req).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  agregarPersona(ticketId: number, req: RegistrarPersonaTicketRequest): Observable<EpisodioClinicoDTO> {
    return this.http.post<EpisodioClinicoDTO>(`${this.base}/${ticketId}/personas`, req);
  }

  identificarPersona(ticketId: number, req: RegistrarPersonaTicketRequest): Observable<EpisodioClinicoDTO> {
    return this.http.patch<EpisodioClinicoDTO>(`${this.base}/${ticketId}/sujeto`, req);
  }

  getEpisodios(ticketId: number): Observable<EpisodioClinicoDTO[]> {
    return this.http.get<EpisodioClinicoDTO[]>(`${this.base}/${ticketId}/episodios`);
  }

  altaRapida(req: AltaRapidaRequest): Observable<TicketAsistenciaDTO> {
    return this.http.post<Record<string, unknown>>(
      `${environment.apiUrl}/api/operador-emergencias/tickets/alta-rapida`,
      req,
    ).pipe(
      // El backend (G1) devuelve ahora el ticket completo en `ticket`; si no viene
      // (versión vieja), se sigue mapeando el response mínimo como antes.
      map((r) => this.mapTicket(r['ticket'] ?? r)),
    );
  }

  despachar(id: number, req: DespacharRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/despachar`, req).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  /**
   * Despacho múltiple V2 (S2.1): asigna N unidades (ej. VIR + UTIM) de forma
   * simultánea a un mismo ticket mediante POST /api/v2/asistencias/{id}/despacho-multiple.
   *
   * @param id id del ticket en estado RECIBIDO
   * @param req lista de unidades a despachar (mínimo 1, máximo 5)
   * @returns el ticket despachado con su DTO completo
   */
  despacharMultiple(id: number, req: DespachoMultiMovilRequest): Observable<TicketAsistenciaDTO> {
    return this.http.post<unknown>(`${this.base}/${id}/despacho-multiple`, req).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  enCamino(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/en-camino`, {}).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  enSitio(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/en-sitio`, {}).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  iniciarTraslado(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/iniciar-traslado`, {}).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  finalizarTraslado(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/finalizar-traslado`, {}).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  cerrar(id: number, req: CerrarTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/cerrar`, req).pipe(
      map((r) => this.mapTicket(r)),
    );
  }

  cancelar(id: number, req: CancelarTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/cancelar`, req).pipe(
      map((r) => this.mapTicket(r))
    );
  }

  sugerirMovil(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/sugerir-movil`);
  }

  /**
   * Obtiene la tabla declarativa de transiciones permitidas directamente del backend (H-15 / S4-T2).
   * La tabla de transiciones del backend es la única fuente de verdad; los clientes la consultan en vez de duplicarla.
   */
  getTransicionesPermitidas(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${environment.apiUrl}/api/v1/asistencias/transiciones-permitidas`);
  }

  agregarNota(id: number, nota: string): Observable<TicketAsistenciaDTO> {
    return this.http.patch<unknown>(`${this.base}/${id}/agregar-nota`, { nota }).pipe(
      map((r) => this.mapTicket(r))
    );
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<any>(`${environment.apiUrl}/api/atenciones/${atencionId}/detalle`).pipe(
      map((raw) => ({
        ...raw,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  getDiagnosticosFrecuentes(): Observable<DiagnosticoFrecuenteDTO[]> {
    return this.http.get<DiagnosticoFrecuenteDTO[]>(`${environment.apiUrl}/api/diagnosticos-frecuentes`);
  }

  getMotivosLlamado(): Observable<MotivoLlamadoDTO[]> {
    return this.http.get<MotivoLlamadoDTO[]>(`${environment.apiUrl}/api/motivos-llamado`);
  }

  getContextoPaciente(pacienteId: number): Observable<ContextoEmergenciaPaciente> {
    return this.http.get<ContextoEmergenciaPaciente>(
      `${environment.apiUrl}/api/operador-emergencias/pacientes/${pacienteId}/contexto`,
    );
  }

  registrarEntregaHospitalaria(ticketId: number, dto: EntregaHospitalariaDTO): Observable<EntregaHospitalariaDTO> {
    return this.http.post<EntregaHospitalariaDTO>(
      `${environment.apiUrl}/api/v1/asistencias/${ticketId}/entrega-hospitalaria`,
      dto
    );
  }

  completarEntregaHospitalaria(
    ticketId: number,
    command: CompletarEntregaHospitalariaCommand,
    idempotencyKey?: string,
  ): Observable<TicketAsistenciaDTO> {
    let headers = new HttpHeaders();
    if (idempotencyKey) {
      headers = headers.set('X-Idempotency-Key', idempotencyKey);
    }

    return this.http.post<unknown>(
      `${environment.apiUrl}/api/v1/asistencias/${ticketId}/completar-entrega-hospitalaria`,
      command,
      { headers },
    ).pipe(
      map((response) => this.mapTicket(response)),
    );
  }

  getEntregaHospitalaria(ticketId: number): Observable<EntregaHospitalariaDTO | null> {
    return this.http.get<EntregaHospitalariaDTO>(
      `${environment.apiUrl}/api/v1/asistencias/${ticketId}/entrega-hospitalaria`
    ).pipe(
      catchError((err) => (err.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  iniciarTelemedicina(ticketId: number): Observable<TelemedicinaSalaResponseDTO> {
    return this.http.post<TelemedicinaSalaResponseDTO>(
      `${environment.apiUrl}/api/operador-emergencias/tickets/${ticketId}/iniciar-telemedicina`,
      {}
    );
  }

  getCoberturaSnapshot(ticketId: number): Observable<CoberturaAsistenciaSnapshotDTO | null> {
    return this.http.get<CoberturaAsistenciaSnapshotDTO>(`${environment.apiUrl}/api/v2/tickets/${ticketId}/cobertura-snapshot`).pipe(
      catchError((err) => (err.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  registrarContactoDespacho(ticketId: number, req: ContactoDespachoRequestDTO): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/api/operador-emergencias/tickets/${ticketId}/contactos-despacho`,
      req
    );
  }

  getConsentimientos(pacienteId?: number): Observable<ConsentimientoInformadoDTO[]> {
    return this.http.get<ConsentimientoInformadoDTO[]>(`${environment.apiUrl}/api/consentimiento-informados?size=1000`).pipe(
      map(list => {
        if (!list) return [];
        if (pacienteId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return list.filter(c => (c as any).paciente?.id === pacienteId);
        }
        return list;
      })
    );
  }

  getAsistenciasPorEvento(eventoId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<unknown[]>(`${environment.apiUrl}/api/v2/eventos-cobertura/${eventoId}/asistencias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getAsistenciasPorInstitucion(institucionId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<unknown[]>(`${environment.apiUrl}/api/v2/instituciones/${institucionId}/asistencias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  getAsistenciasPorContexto(contextoCoberturaId: number): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<unknown[]>(`${environment.apiUrl}/api/v2/contextos-cobertura/${contextoCoberturaId}/asistencias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapTicket(r))),
    );
  }

  sugerirAreaProtegida(latitud: number, longitud: number): Observable<import('../dto/ticket.dto').SugerenciaAreaProtegidaDTO | null> {
    return this.http.get<import('../dto/ticket.dto').SugerenciaAreaProtegidaDTO>(`${environment.apiUrl}/api/operador-emergencias/sugerir-area-protegida`, {
      params: { latitud: latitud.toString(), longitud: longitud.toString() }
    }).pipe(
      catchError(() => of(null))
    );
  }
}
