import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LotePrefacturacionDTO {
  id: number;
  fechaCreacion: string;
  estado: 'BORRADOR' | 'CONFIRMADO' | 'EMITIDO' | 'ANULADO';
  financiadorNombre: string;
  totalTickets: number;
  items?: TicketPrefacturacionDTO[];
}

export interface TicketPrefacturacionDTO {
  id: number;
  ticketId: number;
  numeroTicket: string;
  pacienteNombre: string;
  fechaAtencion: string;
  valor: number;
  incluido: boolean;
}

@Injectable({ providedIn: 'root' })
export class PrefacturacionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/prefacturacion/lotes`;

  listarLotes(): Observable<LotePrefacturacionDTO[]> {
    return this.http.get<LotePrefacturacionDTO[]>(this.base);
  }

  obtenerLote(id: number): Observable<LotePrefacturacionDTO> {
    return this.http.get<LotePrefacturacionDTO>(`${this.base}/${id}`);
  }

  crearLote(financiadorId: number): Observable<LotePrefacturacionDTO> {
    return this.http.post<LotePrefacturacionDTO>(this.base, { financiadorId });
  }

  confirmarLote(id: number): Observable<LotePrefacturacionDTO> {
    return this.http.post<LotePrefacturacionDTO>(`${this.base}/${id}/confirmar`, {});
  }

  excluirTicket(loteId: number, ticketId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${loteId}/tickets/${ticketId}`);
  }
}
