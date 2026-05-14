import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TicketAsistenciaDTO,
  CrearTicketRequest,
  DespacharRequest,
  CerrarTicketRequest,
  LogEstadoTicketDTO,
} from '../dto/ticket.dto';

@Injectable({ providedIn: 'root' })
export class EmergencyApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/asistencias`;

  getActivos(): Observable<TicketAsistenciaDTO[]> {
    return this.http.get<TicketAsistenciaDTO[]>(`${this.base}/activos`);
  }

  getById(id: number): Observable<TicketAsistenciaDTO> {
    return this.http.get<TicketAsistenciaDTO>(`${this.base}/${id}`);
  }

  getDetalle(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/detalle`);
  }

  getTimeline(id: number): Observable<LogEstadoTicketDTO[]> {
    return this.http.get<LogEstadoTicketDTO[]>(`${this.base}/${id}/timeline`);
  }

  crear(req: CrearTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.post<TicketAsistenciaDTO>(`${this.base}/recibir-llamada`, req);
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

  cancelar(id: number, req: CerrarTicketRequest): Observable<TicketAsistenciaDTO> {
    return this.http.patch<TicketAsistenciaDTO>(`${this.base}/${id}/cancelar`, req);
  }

  sugerirMovil(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/sugerir-movil`);
  }
}
