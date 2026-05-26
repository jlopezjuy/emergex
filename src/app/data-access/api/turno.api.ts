import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TurnoResumenDTO,
  TurnoDetalleDTO,
  CrearTurnoRequest,
  SlotDisponibleDTO,
  CancelarTurnoRequest,
  ReagendarTurnoRequest,
  CheckInTurnoRequest
} from '../dto/turno.dto';

@Injectable({ providedIn: 'root' })
export class TurnoApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/turnos`;

  crear(request: CrearTurnoRequest): Observable<TurnoResumenDTO> {
    return this.http.post<TurnoResumenDTO>(this.base, request);
  }

  getTurnosSemanaEmpresa(fechaDesde: string): Observable<TurnoResumenDTO[]> {
    const params = new HttpParams().set('fechaDesde', fechaDesde);
    return this.http.get<TurnoResumenDTO[]>(`${this.base}/empresa/semana`, { params });
  }

  getTurnosRangoEmpresa(inicio: string, fin: string): Observable<TurnoResumenDTO[]> {
    const params = new HttpParams()
      .set('inicio', inicio)
      .set('fin', fin);
    return this.http.get<TurnoResumenDTO[]>(`${this.base}/empresa/rango`, { params });
  }

  getSlotsDisponibles(profesionalId: number, fecha: string): Observable<SlotDisponibleDTO[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<SlotDisponibleDTO[]>(`${this.base}/profesional/${profesionalId}/slots-disponibles`, { params });
  }

  getDetalle(id: number): Observable<TurnoDetalleDTO> {
    return this.http.get<TurnoDetalleDTO>(`${this.base}/${id}`);
  }

  confirmar(id: number): Observable<TurnoResumenDTO> {
    return this.http.patch<TurnoResumenDTO>(`${this.base}/${id}/confirmar`, null);
  }

  cancelar(id: number, request: CancelarTurnoRequest): Observable<TurnoResumenDTO> {
    return this.http.patch<TurnoResumenDTO>(`${this.base}/${id}/cancelar`, request);
  }

  reagendar(id: number, request: ReagendarTurnoRequest): Observable<unknown> {
    return this.http.patch<unknown>(`${this.base}/${id}/reagendar`, request);
  }

  checkIn(id: number, request?: CheckInTurnoRequest): Observable<TurnoResumenDTO> {
    return this.http.patch<TurnoResumenDTO>(`${this.base}/${id}/check-in`, request ?? {});
  }
}
