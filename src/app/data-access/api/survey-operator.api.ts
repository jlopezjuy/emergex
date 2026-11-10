import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CanalEncuesta,
  ContactoEncuestaDetalle,
  ContactoSummary,
  GuardarRespuestasRequest,
  IntentoRequest,
  IntentoSummary,
  PageResponse,
  RespuestaSummary,
} from '../dto/survey.dto';

function toPage<T>(response: HttpResponse<T[]>, size: number): PageResponse<T> {
  const total = Number(response.headers.get('X-Total-Count') ?? response.body?.length ?? 0);
  return { data: response.body ?? [], total, totalPages: Math.max(1, Math.ceil(total / size)) };
}

@Injectable({ providedIn: 'root' })
export class SurveyOperatorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/operador/encuestas`;

  pending(page = 0, size = 20, sort = 'fechaProximoIntento,asc'): Observable<PageResponse<ContactoSummary>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
    return this.http.get<ContactoSummary[]>(`${this.base}/contactos/pendientes`, { params, observe: 'response' }).pipe(
      map(response => toPage(response, size)),
    );
  }

  assign(id: number): Observable<ContactoSummary> {
    return this.http.post<ContactoSummary>(`${this.base}/contactos/${id}/asignar`, {});
  }

  detail(id: number): Observable<ContactoEncuestaDetalle> {
    return this.http.get<ContactoEncuestaDetalle>(`${this.base}/contactos/${id}`);
  }

  recordAttempt(id: number, request: IntentoRequest): Observable<IntentoSummary> {
    return this.http.post<IntentoSummary>(`${this.base}/contactos/${id}/intentos`, request);
  }

  history(id: number): Observable<IntentoSummary[]> {
    return this.http.get<IntentoSummary[]>(`${this.base}/contactos/${id}/intentos`);
  }

  startResponse(contactId: number, canal: CanalEncuesta = 'TELEFONO'): Observable<RespuestaSummary> {
    return this.http.post<RespuestaSummary>(`${this.base}/contactos/${contactId}/respuestas`, { canal });
  }

  savePartial(id: number, request: GuardarRespuestasRequest): Observable<RespuestaSummary> {
    return this.http.put<RespuestaSummary>(`${this.base}/respuestas/${id}`, request);
  }

  complete(id: number, request: GuardarRespuestasRequest): Observable<RespuestaSummary> {
    return this.http.post<RespuestaSummary>(`${this.base}/respuestas/${id}/finalizar`, request);
  }
}
