import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardOperativoDTO } from '../dto/dashboard.dto';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/dashboard`;

  operativo(fecha?: string): Observable<DashboardOperativoDTO> {
    const params = fecha ? `?fecha=${fecha}` : '';
    return this.http.get<any>(`${this.base}/operativo${params}`).pipe(
      map((raw) => ({
        fecha:                  raw.fecha,
        ticketsActivos:         raw.ticketsActivos,
        totalTickets:           raw.ticketsActivosDetalle?.length ?? 0,
        ticketsCriticos:        raw.ticketsPorUrgencia?.ROJO ?? 0,
        unidadesDisponibles:    raw.movilesActivos,
        totalUnidades:          undefined,
        slaPromedio:            0,
        tiempoRespuestaPromedio: raw.esperaPromedioMinutos,
        ticketsPorPrioridad: {
          CRITICA:  raw.ticketsPorUrgencia?.ROJO    ?? 0,
          URGENTE:  raw.ticketsPorUrgencia?.AMARILLO ?? 0,
          NORMAL:   raw.ticketsPorUrgencia?.VERDE    ?? 0,
        },
      } as DashboardOperativoDTO)),
    );
  }
}
