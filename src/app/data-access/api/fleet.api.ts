import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UnidadMovilDTO,
  CrearAmbulanciaRequest,
  FlotaDashboardDTO,
  FlotaMetricasDTO,
  TurnoMovilDTO,
  TripulacionMovilDTO,
  AsignarMovilRequestDTO,
  GuardiaMovilDTO,
  LogTurnoMovilDTO,
} from '../dto/ambulancia.dto';

@Injectable({ providedIn: 'root' })
export class FleetApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/flota`;
  private v1Base = `${environment.apiUrl}/api/flota`;

  dashboard(): Observable<FlotaDashboardDTO> {
    return this.http.get<FlotaDashboardDTO>(`${this.base}/dashboard`);
  }

  ambulancias(): Observable<UnidadMovilDTO[]> {
    return this.http.get<UnidadMovilDTO[]>(`${this.base}/ambulancias`);
  }

  ambulanciasDisponibles(): Observable<UnidadMovilDTO[]> {
    return this.http.get<UnidadMovilDTO[]>(`${this.base}/ambulancias-disponibles`);
  }

  crearAmbulancia(req: CrearAmbulanciaRequest): Observable<UnidadMovilDTO> {
    return this.http.post<UnidadMovilDTO>(`${this.base}/ambulancias`, req);
  }

  getAmbulancia(id: number): Observable<UnidadMovilDTO> {
    return this.http.get<UnidadMovilDTO>(`${this.base}/ambulancias/${id}`);
  }

  metricas(): Observable<FlotaMetricasDTO> {
    return this.http.get<FlotaMetricasDTO>(`${this.base}/metricas`);
  }

  turnos(ambulanciaId?: number): Observable<TurnoMovilDTO[]> {
    const params = ambulanciaId ? `?ambulanciaId=${ambulanciaId}` : '';
    return this.http.get<TurnoMovilDTO[]>(`${this.base}/turnos-movil${params}`);
  }

  crearTurno(req: TurnoMovilDTO): Observable<TurnoMovilDTO> {
    return this.http.post<TurnoMovilDTO>(`${this.base}/turnos-movil`, req);
  }

  agregarTripulacion(
    turnoId: number,
    req: TripulacionMovilDTO,
  ): Observable<TripulacionMovilDTO> {
    return this.http.post<TripulacionMovilDTO>(
      `${this.base}/turnos-movil/${turnoId}/tripulacion`,
      req,
    );
  }

  asignarMovil(
    ticketId: number,
    req: AsignarMovilRequestDTO,
  ): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.v1Base}/tickets/${ticketId}/asignar-movil`,
      req,
    );
  }

  profesionalesDisponibles(
    fechaInicio: string,
    fechaFin: string,
  ): Observable<TripulacionMovilDTO[]> {
    return this.http.get<TripulacionMovilDTO[]>(
      `${this.base}/profesionales-disponibles?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
    );
  }

  turnoActivo(ambulanciaId: number): Observable<TurnoMovilDTO> {
    return this.http.get<TurnoMovilDTO>(`${this.base}/ambulancias/${ambulanciaId}/turno-activo`);
  }

  guardias(ambulanciaId: number): Observable<GuardiaMovilDTO[]> {
    return this.http.get<GuardiaMovilDTO[]>(`${this.base}/ambulancias/${ambulanciaId}/guardias`);
  }

  guardarGuardias(ambulanciaId: number, req: GuardiaMovilDTO[]): Observable<GuardiaMovilDTO[]> {
    return this.http.put<GuardiaMovilDTO[]>(`${this.base}/ambulancias/${ambulanciaId}/guardias`, req);
  }

  desactivarGuardia(guardiaId: number, observacion?: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/guardias/${guardiaId}/desactivar`, { observacion });
  }

  logsTurnos(ambulanciaId?: number): Observable<LogTurnoMovilDTO[]> {
    const params = ambulanciaId ? `?ambulanciaId=${ambulanciaId}` : '';
    return this.http.get<LogTurnoMovilDTO[]>(`${this.base}/logs-turnos${params}`);
  }

  eliminarTripulacion(tripulacionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tripulacion-movil/${tripulacionId}`);
  }
}
