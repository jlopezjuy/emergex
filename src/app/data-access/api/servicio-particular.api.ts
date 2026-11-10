import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface RegistrarServicioParticularDto {
  tipoServicio: 'TRASLADO' | 'ATENCION' | 'EVENTO_PUNTUAL';
  nombre?: string;
  apellido?: string;
  dni?: string;
  cuil?: string;
  telefono?: string;
  descripcion?: string;
  importe: number;
  formaPago: 'EFECTIVO' | 'TRANSFERENCIA' | string;
  tipoFactura: 'FACTURA_B' | 'FACTURA_C';
  observaciones?: string;
  tipoTraslado?: string;
  fechaServicio: string; // ISO date (yyyy-MM-dd)
  numeroFactura?: string;
}

export interface ServicioParticularResponse {
  id: number;
  facturaId: number;
  numeroFactura: string;
  importe: number;
  formaPago: string;
  estado: string;
  personaAsistidaNombre: string;
  fechaServicio: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ServicioParticularApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  registrar(dto: RegistrarServicioParticularDto): Observable<ServicioParticularResponse> {
    return this.http.post<ServicioParticularResponse>(`${this.base}/servicios-particulares`, dto);
  }
}
