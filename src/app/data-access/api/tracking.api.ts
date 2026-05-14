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

  getUbicacionHistorial(ambulanciaId: number): Observable<GeoPosicionDTO[]> {
    return this.http.get<GeoPosicionDTO[]>(
      `${this.base}/ambulancias/${ambulanciaId}/ubicacion/historial`,
    );
  }
}
