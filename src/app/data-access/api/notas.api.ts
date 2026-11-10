import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoNota =
  | 'NOTA_CREDITO_A'
  | 'NOTA_CREDITO_B'
  | 'NOTA_CREDITO_C'
  | 'NOTA_DEBITO_A'
  | 'NOTA_DEBITO_B'
  | 'NOTA_DEBITO_C';

export type MotivoNotaCredito =
  | 'ANULACION_TOTAL'
  | 'ERROR_FACTURACION'
  | 'DESCUENTO_BONIFICACION'
  | 'DEBITO_RECHAZO_PRESTACION'
  | 'DIFERENCIA_PRECIO'
  | 'RESCISION_CONTRATO'
  | 'OTRO';

export interface EmitirNotaCreditoDTO {
  documentoOriginalId: number;
  numeroDocumento?: string;
  monto: number;
  tipoDocumento?: 'NOTA_CREDITO_A' | 'NOTA_CREDITO_B' | 'NOTA_CREDITO_C';
  motivoAjuste: MotivoNotaCredito;
  observacion?: string;
}

export interface EmitirNotaDebitoDTO {
  terceroId: number;
  documentoOriginalId?: number;
  numeroDocumento: string;
  monto: number;
  tipoDocumento: 'NOTA_DEBITO_A' | 'NOTA_DEBITO_B' | 'NOTA_DEBITO_C';
  motivoAjuste: MotivoNotaCredito;
  observacion?: string;
}

export interface DocumentoComercialDTO {
  id: number;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
  saldoPendiente: number;
  estado: string;
  documentoCorregido?: { id: number; numeroDocumento?: string };
  motivoAjuste?: MotivoNotaCredito;
  motivoAjusteObservacion?: string;
}

@Injectable({ providedIn: 'root' })
export class NotasApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  emitirNotaCredito(payload: EmitirNotaCreditoDTO): Observable<DocumentoComercialDTO> {
    return this.http.post<DocumentoComercialDTO>(`${this.baseUrl}/api/notas-credito`, payload);
  }

  emitirNotaDebito(payload: EmitirNotaDebitoDTO): Observable<DocumentoComercialDTO> {
    return this.http.post<DocumentoComercialDTO>(`${this.baseUrl}/api/notas-debito`, payload);
  }

  getDocumentoComercial(id: number): Observable<DocumentoComercialDTO> {
    return this.http.get<DocumentoComercialDTO>(`${this.baseUrl}/api/documentos-comerciales/${id}`);
  }

  getPreviewFiscal(id: number): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/api/documentos-comerciales/${id}/preview-fiscal`);
  }
}
