import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdministracionMedicamentoDTO,
  AprobarAutorizacionDTO,
  AsignarEquipoDTO,
  AutorizacionInternacionDTO,
  CambioPlanCuidadoDTO,
  EquipoTratanteDTO,
  EvaluacionDomiciliariaDTO,
  EventoInternacionDTO,
  FinalizarVisitaDTO,
  IniciarInternacionDTO,
  InsumoDomiciliarioDTO,
  InternacionDomiciliariaDTO,
  InternacionTimelineItemDTO,
  NotaEvolucionInternacionDTO,
  PlanCuidadoDTO,
  PrescripcionContinuaDTO,
  RechazarAutorizacionDTO,
  RechazoInternacionDTO,
  ResumenAltaDTO,
  SignosVitalesDTO,
  VisitaProgramadaDTO,
  AlertaInternacion,
} from '../dto/internacion.dto';

@Injectable({ providedIn: 'root' })
export class InternacionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1`;
  private autorizacionesBase = `${environment.apiUrl}/api/v1/autorizaciones`;

  /* ──────────── Orquestador ──────────── */

  iniciarDesdeTicket(dto: IniciarInternacionDTO): Observable<InternacionDomiciliariaDTO> {
    return this.http.post<InternacionDomiciliariaDTO>(
      `${this.base}/internaciones/desde-ticket`,
      dto,
    );
  }

  cargarEvaluacion(id: number, dto: EvaluacionDomiciliariaDTO): Observable<InternacionDomiciliariaDTO> {
    return this.http.post<InternacionDomiciliariaDTO>(
      `${this.base}/internaciones/${id}/evaluacion`,
      dto,
    );
  }

  definirPlanCuidado(id: number, dto: PlanCuidadoDTO): Observable<InternacionDomiciliariaDTO> {
    return this.http.post<InternacionDomiciliariaDTO>(
      `${this.base}/internaciones/${id}/plan-cuidado`,
      dto,
    );
  }

  asignarEquipo(id: number, dto: AsignarEquipoDTO): Observable<EquipoTratanteDTO> {
    return this.http.post<EquipoTratanteDTO>(
      `${this.base}/internaciones/${id}/equipo`,
      dto,
    );
  }

  cerrarInternacion(id: number, dto: ResumenAltaDTO): Observable<InternacionDomiciliariaDTO> {
    return this.http.post<InternacionDomiciliariaDTO>(
      `${this.base}/internaciones/${id}/cerrar`,
      dto,
    );
  }

  rechazarInternacion(id: number, dto: RechazoInternacionDTO): Observable<InternacionDomiciliariaDTO> {
    return this.http.patch<InternacionDomiciliariaDTO>(
      `${this.base}/internaciones/${id}/rechazar`,
      dto,
    );
  }

  /* ──────────── Consultas ──────────── */

  getTimeline(id: number): Observable<InternacionTimelineItemDTO[]> {
    return this.http.get<InternacionTimelineItemDTO[]>(
      `${this.base}/internaciones/${id}/timeline`,
    );
  }

  getContactosUtiles(id: number): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(
      `${this.base}/internaciones/${id}/contactos-utiles`,
    );
  }

  getActivas(): Observable<InternacionDomiciliariaDTO[]> {
    return this.http.get<InternacionDomiciliariaDTO[]>(
      `${this.base}/internaciones/activas`,
    );
  }

  getSignosVitalesSerie(id: number): Observable<SignosVitalesDTO[]> {
    return this.http.get<SignosVitalesDTO[]>(
      `${this.base}/internaciones/${id}/signos-vitales/serie`,
    );
  }

  getPrescripciones(id: number): Observable<PrescripcionContinuaDTO[]> {
    return this.http.get<PrescripcionContinuaDTO[]>(
      `${this.base}/internaciones/${id}/prescripciones`,
    );
  }

  getHistorialPlan(id: number): Observable<CambioPlanCuidadoDTO[]> {
    return this.http.get<CambioPlanCuidadoDTO[]>(
      `${this.base}/internaciones/${id}/historial-plan`,
    );
  }

  /* ──────────── Visitas ──────────── */

  generarVisitas(
    id: number,
    desde: string,
    hasta: string,
    tipoVisita: string = 'CONTROL_GENERAL',
  ): Observable<void> {
    const params = new HttpParams()
      .set('desde', desde)
      .set('hasta', hasta)
      .set('tipoVisita', tipoVisita);
    return this.http.post<void>(
      `${this.base}/internaciones/${id}/visitas/generar`,
      null,
      { params },
    );
  }

  iniciarVisita(visitaId: number): Observable<VisitaProgramadaDTO> {
    return this.http.post<VisitaProgramadaDTO>(
      `${this.base}/visitas/${visitaId}/iniciar`,
      null,
    );
  }

  finalizarVisita(visitaId: number, dto: FinalizarVisitaDTO): Observable<VisitaProgramadaDTO> {
    return this.http.post<VisitaProgramadaDTO>(
      `${this.base}/visitas/${visitaId}/finalizar`,
      dto,
    );
  }

  reprogramarVisita(
    visitaId: number,
    nuevaFecha: string,
    motivo: string,
  ): Observable<VisitaProgramadaDTO> {
    const params = new HttpParams().set('nuevaFecha', nuevaFecha).set('motivo', motivo);
    return this.http.post<VisitaProgramadaDTO>(
      `${this.base}/visitas/${visitaId}/reprogramar`,
      null,
      { params },
    );
  }

  /* ──────────── Prescripciones ──────────── */

  crearPrescripcion(id: number, dto: PrescripcionContinuaDTO): Observable<PrescripcionContinuaDTO> {
    return this.http.post<PrescripcionContinuaDTO>(
      `${this.base}/internaciones/${id}/prescripciones`,
      dto,
    );
  }

  suspenderPrescripcion(prescripcionId: number, motivo: string): Observable<PrescripcionContinuaDTO> {
    return this.http.put<PrescripcionContinuaDTO>(
      `${this.base}/prescripciones/${prescripcionId}/suspender`,
      motivo,
    );
  }

  registrarAdministracion(
    prescripcionId: number,
    dto: AdministracionMedicamentoDTO,
  ): Observable<AdministracionMedicamentoDTO> {
    return this.http.post<AdministracionMedicamentoDTO>(
      `${this.base}/prescripciones/${prescripcionId}/administraciones`,
      dto,
    );
  }

  /* ──────────── Eventos y notas ──────────── */

  registrarEvento(id: number, dto: EventoInternacionDTO): Observable<EventoInternacionDTO> {
    return this.http.post<EventoInternacionDTO>(
      `${this.base}/internaciones/${id}/eventos`,
      dto,
    );
  }

  agregarNota(id: number, dto: NotaEvolucionInternacionDTO): Observable<NotaEvolucionInternacionDTO> {
    return this.http.post<NotaEvolucionInternacionDTO>(
      `${this.base}/internaciones/${id}/notas`,
      dto,
    );
  }

  /* ──────────── Insumos ──────────── */

  solicitarInsumo(id: number, dto: InsumoDomiciliarioDTO): Observable<InsumoDomiciliarioDTO> {
    return this.http.post<InsumoDomiciliarioDTO>(
      `${this.base}/internaciones/${id}/insumos`,
      dto,
    );
  }

  entregarInsumo(
    insumoId: number,
    cantidad: number,
    lote?: string,
    fechaVencimiento?: string,
  ): Observable<InsumoDomiciliarioDTO> {
    let params = new HttpParams().set('cantidad', cantidad);
    if (lote) params = params.set('lote', lote);
    if (fechaVencimiento) params = params.set('fechaVencimiento', fechaVencimiento);
    return this.http.patch<InsumoDomiciliarioDTO>(
      `${this.base}/insumos/${insumoId}/entregar`,
      null,
      { params },
    );
  }

  consumirInsumo(insumoId: number, cantidad: number): Observable<InsumoDomiciliarioDTO> {
    const params = new HttpParams().set('cantidad', cantidad);
    return this.http.patch<InsumoDomiciliarioDTO>(
      `${this.base}/insumos/${insumoId}/consumir`,
      null,
      { params },
    );
  }

  devolverInsumo(
    insumoId: number,
    cantidad: number,
    motivo: string,
  ): Observable<InsumoDomiciliarioDTO> {
    const params = new HttpParams().set('cantidad', cantidad).set('motivo', motivo);
    return this.http.patch<InsumoDomiciliarioDTO>(
      `${this.base}/insumos/${insumoId}/devolver`,
      null,
      { params },
    );
  }

  /* ──────────── Autorizaciones ──────────── */

  solicitarAutorizacion(
    internacionId: number,
    dto: AutorizacionInternacionDTO,
  ): Observable<AutorizacionInternacionDTO> {
    return this.http.post<AutorizacionInternacionDTO>(
      `${this.base}/internaciones/${internacionId}/autorizaciones`,
      dto,
    );
  }

  listarAutorizaciones(internacionId: number): Observable<AutorizacionInternacionDTO[]> {
    return this.http.get<AutorizacionInternacionDTO[]>(
      `${this.base}/internaciones/${internacionId}/autorizaciones`,
    );
  }

  aprobarAutorizacion(
    autorizacionId: number,
    dto: AprobarAutorizacionDTO,
  ): Observable<AutorizacionInternacionDTO> {
    return this.http.patch<AutorizacionInternacionDTO>(
      `${this.autorizacionesBase}/${autorizacionId}/aprobar`,
      dto,
    );
  }

  rechazarAutorizacion(
    autorizacionId: number,
    dto: RechazarAutorizacionDTO,
  ): Observable<AutorizacionInternacionDTO> {
    return this.http.patch<AutorizacionInternacionDTO>(
      `${this.autorizacionesBase}/${autorizacionId}/rechazar`,
      dto,
    );
  }

  marcarVencidaAutorizacion(autorizacionId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.autorizacionesBase}/${autorizacionId}/marcar-vencida`,
      null,
    );
  }

  /* ──────────── Adjuntos y Consentimientos ──────────── */

  vincularAdjunto(internacionId: number, archivoId: number): Observable<void> {
    const params = new HttpParams().set('archivoId', archivoId);
    return this.http.post<void>(
      `${this.base}/internaciones/${internacionId}/adjuntos`,
      null,
      { params },
    );
  }

  vincularConsentimiento(internacionId: number, consentimientoId: number): Observable<void> {
    const params = new HttpParams().set('consentimientoId', consentimientoId);
    return this.http.post<void>(
      `${this.base}/internaciones/${internacionId}/consentimientos`,
      null,
      { params },
    );
  }

  /* ──────────── Reportes ──────────── */

  getVisitasPendientes(): Observable<VisitaProgramadaDTO[]> {
    return this.http.get<VisitaProgramadaDTO[]>(
      `${this.base}/internaciones/reportes/visitas-pendientes`,
    );
  }

  getAutorizacionesPorVencer(): Observable<AutorizacionInternacionDTO[]> {
    return this.http.get<AutorizacionInternacionDTO[]>(
      `${this.base}/internaciones/reportes/autorizaciones-por-vencer`,
    );
  }

  /* ──────────── Alertas ──────────── */

  getAlertasActivas(internacionId: number): Observable<AlertaInternacion[]> {
    return this.http.get<AlertaInternacion[]>(
      `${this.base}/internaciones/${internacionId}/alertas`,
    );
  }

  atenderAlerta(alertaId: number): Observable<AlertaInternacion> {
    return this.http.patch<AlertaInternacion>(
      `${this.base}/alertas/${alertaId}/atender`,
      {},
    );
  }

  getAlertasAbiertas(): Observable<AlertaInternacion[]> {
    return this.http.get<AlertaInternacion[]>(`${this.base}/alertas/abiertas`);
  }
}
