import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CampaniaEncuestaDetalle,
  CampaniaGenerationSummary,
  CampaniaSummary,
  ContactoCampaniaResumen,
  CreateEncuestaRequest,
  EncuestaDTO,
  EncuestaDetalle,
  EncuestaSummary,
  EncuestaVersionDetalle,
  EstadoCampaniaEncuesta,
  EstadoContactoEncuesta,
  EstadoEncuesta,
  FrecuenciaEncuesta,
  MetricasCampania,
  PageResponse,
  PlanEncuestaDTO,
  PlanRequest,
  PlanSummary,
  RespuestaEncuestaDetalle,
  TipoEncuesta,
  UpdateEncuestaRequest,
  VersionRequest,
} from '../dto/survey.dto';

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}

function pageParams(query: PageQuery): HttpParams {
  return new HttpParams()
    .set('page', String(query.page ?? 0))
    .set('size', String(query.size ?? 20))
    .set('sort', query.sort ?? 'id,desc');
}

function toPage<T>(response: HttpResponse<T[]>, requestSize: number): PageResponse<T> {
  const total = Number(response.headers.get('X-Total-Count') ?? response.body?.length ?? 0);
  return {
    data: response.body ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / requestSize)),
  };
}

@Injectable({ providedIn: 'root' })
export class SurveyAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v2/admin/encuestas`;

  querySurveys(query: PageQuery & { nombre?: string; estado?: EstadoEncuesta; tipo?: TipoEncuesta }): Observable<PageResponse<EncuestaDTO>> {
    let params = pageParams(query);
    if (query.nombre) params = params.set('nombre.contains', query.nombre);
    if (query.estado) params = params.set('estado.equals', query.estado);
    if (query.tipo) params = params.set('tipo.equals', query.tipo);
    return this.http.get<EncuestaDTO[]>(`${this.base}/query`, { params, observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  listSurveys(query: PageQuery = {}): Observable<PageResponse<EncuestaSummary>> {
    return this.http.get<EncuestaSummary[]>(this.base, { params: pageParams(query), observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  createSurvey(request: CreateEncuestaRequest): Observable<EncuestaSummary> {
    return this.http.post<EncuestaSummary>(this.base, request);
  }

  updateSurvey(id: number, request: UpdateEncuestaRequest): Observable<EncuestaSummary> {
    return this.http.put<EncuestaSummary>(`${this.base}/${id}`, request);
  }

  surveyDetail(id: number): Observable<EncuestaDetalle> {
    return this.http.get<EncuestaDetalle>(`${this.base}/${id}`);
  }

  versionDetail(surveyId: number, versionId: number): Observable<EncuestaVersionDetalle> {
    return this.http.get<EncuestaVersionDetalle>(`${this.base}/${surveyId}/versiones/${versionId}`);
  }

  addVersion(id: number, request: VersionRequest): Observable<EncuestaSummary> {
    return this.http.post<EncuestaSummary>(`${this.base}/${id}/versiones`, request);
  }

  activate(id: number): Observable<EncuestaSummary> {
    return this.http.post<EncuestaSummary>(`${this.base}/${id}/activar`, {});
  }

  deactivate(id: number): Observable<EncuestaSummary> {
    return this.http.post<EncuestaSummary>(`${this.base}/${id}/desactivar`, {});
  }

  archive(id: number): Observable<EncuestaSummary> {
    return this.http.post<EncuestaSummary>(`${this.base}/${id}/archivar`, {});
  }

  clone(id: number, request: { codigo: string; nombre: string }): Observable<EncuestaSummary> {
    return this.http.post<EncuestaSummary>(`${this.base}/${id}/clonar`, request);
  }

  listPlans(query: PageQuery = {}): Observable<PageResponse<PlanSummary>> {
    return this.http.get<PlanSummary[]>(`${this.base}/planes`, { params: pageParams(query), observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  planDetail(id: number): Observable<PlanEncuestaDTO | null> {
    const params = pageParams({ page: 0, size: 1 }).set('id.equals', String(id));
    return this.http.get<PlanEncuestaDTO[]>(`${this.base}/planes/query`, { params }).pipe(map(rows => rows[0] ?? null));
  }

  queryPlans(query: PageQuery & { nombre?: string; activo?: boolean; frecuencia?: FrecuenciaEncuesta }): Observable<PageResponse<PlanEncuestaDTO>> {
    let params = pageParams(query);
    if (query.nombre) params = params.set('nombre.contains', query.nombre);
    if (query.activo !== undefined) params = params.set('activo.equals', String(query.activo));
    if (query.frecuencia) params = params.set('frecuencia.equals', query.frecuencia);
    return this.http.get<PlanEncuestaDTO[]>(`${this.base}/planes/query`, { params, observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  savePlan(request: PlanRequest): Observable<PlanSummary> {
    return this.http.post<PlanSummary>(`${this.base}/planes`, request);
  }

  generateCampaign(planId: number, request?: { fechaDesde?: string | null; fechaHasta?: string | null; seed?: string | null }): Observable<CampaniaGenerationSummary> {
    return this.http.post<CampaniaGenerationSummary>(`${this.base}/planes/${planId}/generar`, request ?? {});
  }

  queryCampaigns(query: PageQuery & { estado?: EstadoCampaniaEncuesta; encuestaId?: number; planId?: number; desde?: string; hasta?: string }): Observable<PageResponse<CampaniaSummary>> {
    let params = pageParams(query);
    if (query.estado) params = params.set('estado.equals', query.estado);
    if (query.encuestaId) params = params.set('encuestaId.equals', String(query.encuestaId));
    if (query.planId) params = params.set('planId.equals', String(query.planId));
    if (query.desde) params = params.set('fechaDesde.greaterThanOrEqual', query.desde);
    if (query.hasta) params = params.set('fechaHasta.lessThanOrEqual', query.hasta);
    return this.http.get<CampaniaSummary[]>(`${this.base}/campanias/query`, { params, observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  listCampaigns(query: PageQuery = {}): Observable<PageResponse<CampaniaSummary>> {
    return this.http.get<CampaniaSummary[]>(`${this.base}/campanias`, { params: pageParams(query), observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  campaignDetail(id: number): Observable<CampaniaEncuestaDetalle> {
    return this.http.get<CampaniaEncuestaDetalle>(`${this.base}/campanias/${id}`);
  }

  campaignContacts(id: number, query: PageQuery & {
    estado?: EstadoContactoEncuesta;
    texto?: string;
    asignado?: boolean;
    reprogramado?: boolean;
    operadorId?: number;
  }): Observable<PageResponse<ContactoCampaniaResumen>> {
    let params = pageParams(query);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.texto) params = params.set('texto', query.texto);
    if (query.asignado !== undefined) params = params.set('asignado', String(query.asignado));
    if (query.reprogramado !== undefined) params = params.set('reprogramado', String(query.reprogramado));
    if (query.operadorId) params = params.set('operadorId', String(query.operadorId));
    return this.http.get<ContactoCampaniaResumen[]>(`${this.base}/campanias/${id}/contactos`, { params, observe: 'response' }).pipe(
      map(response => toPage(response, query.size ?? 20)),
    );
  }

  campaignMetrics(id: number): Observable<MetricasCampania> {
    return this.http.get<MetricasCampania>(`${this.base}/campanias/${id}/metricas`);
  }

  startCampaign(id: number): Observable<{ id: number; estado: EstadoCampaniaEncuesta }> {
    return this.http.post<{ id: number; estado: EstadoCampaniaEncuesta }>(`${this.base}/campanias/${id}/iniciar`, {});
  }

  finishCampaign(id: number): Observable<{ id: number; estado: EstadoCampaniaEncuesta }> {
    return this.http.post<{ id: number; estado: EstadoCampaniaEncuesta }>(`${this.base}/campanias/${id}/finalizar`, {});
  }

  cancelCampaign(id: number): Observable<{ id: number; estado: EstadoCampaniaEncuesta }> {
    return this.http.post<{ id: number; estado: EstadoCampaniaEncuesta }>(`${this.base}/campanias/${id}/cancelar`, {});
  }

  responseDetail(id: number): Observable<RespuestaEncuestaDetalle> {
    return this.http.get<RespuestaEncuestaDetalle>(`${this.base}/respuestas/${id}`);
  }
}
