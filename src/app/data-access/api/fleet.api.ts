import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  UnidadMovilDTO,
  CrearAmbulanciaRequest,
  FlotaDashboardDTO,
  FlotaMetricasDTO,
  TurnoMovilDTO,
  TripulacionMovilDTO,
  AsignarMovilRequestDTO,
  CambiarMovilRequestDTO,
  GuardiaMovilDTO,
  LogTurnoMovilDTO,
  GuardiaDTO,
  LogTurnoDTO,
  ProfesionalDisponibleDTO,
} from '../dto/ambulancia.dto';
import { TicketAsistenciaDTO } from '../dto/ticket.dto';

@Injectable({ providedIn: 'root' })
export class FleetApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/flota`;
  private v1Base = `${environment.apiUrl}/api/flota`;

  private mapAmbu(raw: any): UnidadMovilDTO {
    return {
      id:                  raw.ambulanciaId,
      identificador:       raw.codigo,
      tipo:                raw.tipo,
      estado:              raw.estado,
      disponibleParaDespacho: raw.disponibleParaDespacho,
      motivoNoDisponible:  raw.motivoNoDisponible ?? null,
      turnoActual:         raw.turnoActual ?? null,
      bateria:             raw.bateriaPct ?? 75,
      combustible:         raw.combustiblePct ?? 65,
      tripulacion:         (raw.tripulacionActual ?? []).map((m: any) => m.profesionalNombre).join(', '),
      tripulacionActual:   raw.tripulacionActual ?? [],
      eta:                 raw.objetivoEta ?? null,
      patente:             raw.patente,
      latitud:             raw.latitud != null ? Number(raw.latitud) : undefined,
      longitud:            raw.longitud != null ? Number(raw.longitud) : undefined,
      // inventario real
      oxigenoPct:          raw.oxigenoPct,
      adrenalinaPct:       raw.adrenalinaPct,
      sueroSalinoPct:      raw.sueroSalinoPct,
      deaPct:              raw.deaPct,
      morfinaPct:          raw.morfinaPct,
      tuboEndotraquealPct: raw.tuboEndotraquealPct,
      // operativa
      kmHoy:               raw.kmHoy,
      serviciosHoy:        raw.serviciosHoy,
      ultimaConexionSegundos: raw.ultimaConexionSegundos,
      ultimaPosicionTimestamp: raw.ultimaPosicionTimestamp,
    };
  }


  dashboard(): Observable<FlotaDashboardDTO> {
    return this.http.get<any>(`${this.base}/dashboard`).pipe(
      map((raw) => {
        const unidades = Array.isArray(raw?.unidades) ? raw.unidades : [];
        const countByEstado = (estado: string) => unidades.filter((u: any) => u?.estado === estado).length;
        const disponibles = typeof raw?.disponibles === 'number'
          ? raw.disponibles
          : unidades.filter((u: any) => u?.disponibleParaDespacho === true).length;

        return {
          totalUnidades: raw?.totalUnidades ?? raw?.flotaTotal ?? unidades.length ?? 0,
          disponibles,
          enRuta: raw?.enRuta ?? countByEstado('EN_RUTA'),
          enSitio: raw?.enSitio ?? countByEstado('EN_SITIO'),
          traslado: raw?.traslado ?? countByEstado('TRASLADO'),
          mantenimiento:
            raw?.mantenimiento ??
            countByEstado('EN_TALLER') + countByEstado('MANTENIMIENTO') + countByEstado('FUERA_SERVICIO'),
        } as FlotaDashboardDTO;
      }),
    );
  }

  ambulancias(): Observable<UnidadMovilDTO[]> {
    return this.http.get<any[]>(`${this.base}/ambulancias`).pipe(
      map((items) => (items ?? []).map((r) => this.mapAmbu(r))),
    );
  }

  ambulanciasDisponibles(): Observable<UnidadMovilDTO[]> {
    return this.http.get<any[]>(`${this.base}/ambulancias-disponibles`).pipe(
      map((items) => (items ?? []).map((r) => this.mapAmbu(r))),
    );
  }

  crearAmbulancia(req: CrearAmbulanciaRequest): Observable<UnidadMovilDTO> {
    return this.http.post<any>(`${this.base}/ambulancias`, req).pipe(
      map((r) => this.mapAmbu(r)),
    );
  }

  crearAmbulanciaWizard(req: any): Observable<UnidadMovilDTO> {
    return this.http.post<any>(`${this.base}/ambulancias/wizard`, req).pipe(
      map((r) => this.mapAmbu(r)),
    );
  }


  getAmbulancia(id: number): Observable<UnidadMovilDTO> {
    return this.http.get<any>(`${this.base}/ambulancias/${id}`).pipe(
      map((r) => this.mapAmbu(r)),
    );
  }

  metricas(): Observable<FlotaMetricasDTO> {
    return this.http.get<any>(`${this.base}/metricas`).pipe(
      map((raw) => ({
        tiempoRespuestaPromedio: raw.tiempoRespuestaPromedioSegundos != null
          ? raw.tiempoRespuestaPromedioSegundos / 60
          : undefined,
        distanciaRecorrida: raw.distanciaRecorrida,
        ticketsAtendidos:   raw.enServicio,
        eficiencia:         raw.cargaSistema,
      } as FlotaMetricasDTO)),
    );
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

  cambiarMovil(
    ticketId: number,
    req: CambiarMovilRequestDTO,
    idempotencyKey?: string,
  ): Observable<TicketAsistenciaDTO> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    return this.http.post<TicketAsistenciaDTO>(
      `${this.v1Base}/tickets/${ticketId}/cambiar-movil`,
      req,
      headers ? { headers } : {},
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

  getGuardias(ambulanciaId: number): Observable<GuardiaDTO[]> {
    return this.http.get<GuardiaDTO[]>(`${this.base}/ambulancias/${ambulanciaId}/guardias`);
  }

  getLogsTurnos(ambulanciaId: number): Observable<LogTurnoDTO[]> {
    return this.http.get<LogTurnoDTO[]>(`${this.base}/logs-turnos?ambulanciaId=${ambulanciaId}`);
  }

  getProfesionalesDisponibles(fechaInicio: string, fechaFin: string): Observable<ProfesionalDisponibleDTO[]> {
    return this.http.get<ProfesionalDisponibleDTO[]>(
      `${this.base}/profesionales-disponibles?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
    );
  }

  turnoActivo(ambulanciaId: number): Observable<TurnoMovilDTO> {
    return this.http.get<TurnoMovilDTO>(`${this.base}/ambulancias/${ambulanciaId}/turno-activo`);
  }

  guardias(ambulanciaId: number): Observable<GuardiaMovilDTO[]> {
    return this.http.get<GuardiaMovilDTO[]>(`${this.base}/ambulancias/${ambulanciaId}/guardias`);
  }

  guardarGuardias(ambulanciaId: number, req: GuardiaDTO[]): Observable<GuardiaDTO[]> {
    return this.http.put<GuardiaDTO[]>(`${this.base}/ambulancias/${ambulanciaId}/guardias`, { guardias: req });
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
