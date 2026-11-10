import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PrestacionAuditDTO {
  id: number;
  fecha?: string;
  cargoCobrado: number;
  importeUnitario?: number;
  estadoRevision: string;
  motivoExclusion?: string;
  paciente?: {
    id: number;
    nombre?: string;
    apellido?: string;
    dni?: string;
  };
  prestacion?: {
    id: number;
    codigo?: string;
    nombre?: string;
  };
  ticket?: {
    id: number;
    numeroTicket?: string;
    direccion?: string;
    tipoAsistencia?: string;
    nivelUrgencia?: string;
  };
  /**
   * Refleja `RegistroPrestacion.contratoCobertura`: el backend serializa la entidad cruda,
   * así que el código del contrato viaja anidado, no aplanado.
   */
  contratoCobertura?: {
    id: number;
    codigo?: string;
  };
}

/**
 * Shape de una respuesta paginada de Spring Data (Page<T>). El backend de
 * `pendientes()` devuelve una Page, no un array plano; este servicio desenvolvel el
 * contenido para que los consumidores reciban `PrestacionAuditDTO[]`.
 */
interface SpringPage<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaMedicaApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/auditoria-medica`;

  pendientes(): Observable<PrestacionAuditDTO[]> {
    return this.http.get<SpringPage<PrestacionAuditDTO>>(`${this.base}/pendientes`).pipe(map(p => p.content));
  }

  aprobar(registroPrestacionId: number): Observable<PrestacionAuditDTO> {
    return this.http.post<PrestacionAuditDTO>(`${this.base}/${registroPrestacionId}/aprobar`, {});
  }

  excluir(registroPrestacionId: number, motivo: string): Observable<PrestacionAuditDTO> {
    return this.http.post<PrestacionAuditDTO>(`${this.base}/${registroPrestacionId}/excluir`, { motivo });
  }
}
