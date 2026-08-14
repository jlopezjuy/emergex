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

  /**
   * Confirma el lote (BORRADOR → CONFIRMADO). Ya no emite el documento comercial: la emisión es
   * un paso deliberado y separado, ver {@link emitirLote} (H-13).
   */
  confirmarLote(id: number): Observable<LotePrefacturacionDTO> {
    return this.http.post<LotePrefacturacionDTO>(`${this.base}/${id}/confirmar`, {});
  }

  /**
   * Emite el lote (CONFIRMADO → EMITIDO): genera el documento comercial y el asiento contable.
   * El backend rechaza la emisión si el lote no está en CONFIRMADO (H-13).
   */
  emitirLote(id: number): Observable<LotePrefacturacionDTO> {
    return this.http.post<LotePrefacturacionDTO>(`${this.base}/${id}/emitir`, {});
  }

  generarLineas(id: number, desde: string, hasta: string): Observable<LotePrefacturacionDTO> {
    return this.http.post<LotePrefacturacionDTO>(`${this.base}/${id}/generar`, { desde, hasta });
  }

  excluirTicket(loteId: number, ticketId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${loteId}/tickets/${ticketId}`);
  }
}
