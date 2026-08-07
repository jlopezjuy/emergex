import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TicketAuditDTO {
  id: number;
  numero?: string;
  pacienteNombre?: string;
  pacienteDni?: string;
  direccion?: string;
  tipoAsistencia?: string;
  nivelUrgencia?: string;
  estado: string;
  fechaCreacion?: string;
  fechaCompletado?: string;
  diagnosticoCie10?: string;
  observaciones?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaMedicaApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/auditoria-medica`;

  pendientes(): Observable<TicketAuditDTO[]> {
    return this.http.get<TicketAuditDTO[]>(`${this.base}/pendientes`);
  }

  aprobar(ticketId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${ticketId}/aprobar`, {});
  }

  observar(ticketId: number, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${ticketId}/observar`, { motivo });
  }
}
