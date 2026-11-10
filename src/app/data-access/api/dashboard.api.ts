import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardOperativoDTO, DashboardComercialDTO } from '../dto/dashboard.dto';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/dashboard`;

  operativo(fecha?: string): Observable<DashboardOperativoDTO> {
    const params = fecha ? `?fecha=${fecha}` : '';
    return this.http.get<Record<string, unknown>>(`${this.base}/operativo${params}`).pipe(
      map((raw) => ({
        fecha:                  raw['fecha'] as string,
        ticketsActivos:         raw['ticketsActivos'] as number,
        totalTickets:           (raw['totalTicketsDia'] as number) ?? 0,
        ticketsCriticos:        ((raw['ticketsPorUrgencia'] as Record<string, number> | undefined)?.['ROJO']) ?? 0,
        unidadesDisponibles:    raw['unidadesDisponibles'] as number,
        totalUnidades:          raw['unidadesTotal'] as number,
        slaPromedio:            (raw['slaPromedio'] as number) ?? 100,
        tiempoRespuestaPromedio:  (raw['tiempoRespuestaPromedioMinutos'] as number) ?? 0,
        ticketsPorPrioridad: {
          CRITICA:  ((raw['ticketsPorUrgencia'] as Record<string, number> | undefined)?.['ROJO'])    ?? 0,
          URGENTE:  ((raw['ticketsPorUrgencia'] as Record<string, number> | undefined)?.['AMARILLO']) ?? 0,
          NORMAL:   ((raw['ticketsPorUrgencia'] as Record<string, number> | undefined)?.['VERDE'])    ?? 0,
        },
        tiemposRespuestaHistorico: (raw['tiemposRespuestaHistorico'] as unknown[]) ?? [],
        cargaPorHora: (raw['cargaPorHora'] as Record<string, number>) ?? {},
      } as DashboardOperativoDTO)),
    );
  }

  comercial(): Observable<DashboardComercialDTO> {
    return this.http.get<DashboardComercialDTO>(`${this.base}/comercial`);
  }
}
