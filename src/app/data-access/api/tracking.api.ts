import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GeoPosicionDTO } from '../dto/ambulancia.dto';

@Injectable({ providedIn: 'root' })
export class TrackingApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1`;

  getTracking(ticketId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/tickets/${ticketId}/tracking`);
  }

  getUbicacion(ambulanciaId: number): Observable<GeoPosicionDTO> {
    return this.http.get<GeoPosicionDTO>(
      `${this.base}/ambulancias/${ambulanciaId}/ubicacion`,
    );
  }

  upsertUbicacion(
    ambulanciaId: number,
    req: GeoPosicionDTO,
  ): Observable<GeoPosicionDTO> {
    return this.http.post<GeoPosicionDTO>(
      `${this.base}/ambulancias/${ambulanciaId}/ubicacion`,
      req,
    );
  }

  upsertUbicacionConIdempotency(
    ambulanciaId: number,
    req: any,
    idempotencyKey?: string
  ): Observable<any> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.http.post<any>(
      `${this.base}/ambulancias/${ambulanciaId}/ubicacion`,
      req,
      { headers }
    );
  }

  getUbicacionHistorial(ambulanciaId: number): Observable<GeoPosicionDTO[]> {
    return this.http.get<GeoPosicionDTO[]>(
      `${this.base}/ambulancias/${ambulanciaId}/ubicacion/historial`,
    );
  }

  aceptarAsignacion(id: number, req?: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/asignaciones/${id}/aceptar`, req || {});
  }

  rechazarAsignacion(id: number, req?: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/asignaciones/${id}/rechazar`, req || {});
  }

  registrarHeartbeat(req: any): Observable<void> {
    return this.http.post<void>(`${this.base}/tracking/heartbeat`, req);
  }
}
