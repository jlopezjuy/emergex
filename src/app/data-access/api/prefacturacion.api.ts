import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Refleja el LotePrefacturacionDTO real que envía el backend
 * (LotePrefacturacionResource.java, /api/v2/prefacturacion/lotes).
 *
 * `financiadorNombre` y `totalTickets` NUNCA existieron en esa respuesta -eran campos
 * fantasma que siempre llegaban `undefined`-, lo que además rompía el buscador de lotes con
 * un TypeError apenas alguien tipeaba algo (ADM-UX-018). `numeroLote` y `montoTotal` sí
 * existen y no se estaban usando.
 */
export interface LotePrefacturacionDTO {
  id: number;
  numeroLote?: string;
  fechaCreacion: string;
  estado: 'BORRADOR' | 'CONFIRMADO' | 'EMITIDO' | 'ANULADO';
  financiadorId?: number;
  montoTotal?: number;
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

export interface TicketPendienteTarifacionDTO {
  id: number;
  numeroTicket?: string;
  tipoAsistencia?: string;
  estadoActual?: string;
  estadoTarifacion?: string;
  presupuestoAceptado?: number;
  costoEspera?: number;
}

export interface TarifacionManualPayload {
  cargoBase: number;
  costoEspera: number;
  motivo: string;
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

  /**
   * Obtiene la bandeja de tickets que no pudieron tarifarse automáticamente (S2-T4 / H-06b / H-18).
   */
  listarPendientesTarifacion(): Observable<TicketPendienteTarifacionDTO[]> {
    return this.http.get<TicketPendienteTarifacionDTO[]>(`${environment.apiUrl}/api/ticket-asistencias?estadoTarifacion.equals=PENDIENTE_TARIFACION&sort=id,desc`);
  }

  /**
   * Aplica tarifación manual fijando cargo base, costo de espera y motivo justificado.
   */
  tarifarManual(id: number, payload: TarifacionManualPayload): Observable<TicketPendienteTarifacionDTO> {
    return this.http.post<TicketPendienteTarifacionDTO>(`${environment.apiUrl}/api/ticket-asistencias/${id}/tarifar-manual`, payload);
  }
}
