import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ArcaStatusDTO } from './facturacion.api';

export type EstadoComprobanteFiscal = 'PENDIENTE_CAE' | 'AUTORIZADO' | 'RECHAZADO_ARCA';

export interface ComprobanteFiscalDTO {
  id: number;
  empresaId?: number;
  documentoComercialId?: number;
  tipoComprobante: string;
  puntoVenta: number;
  numeroComprobante: number;
  fechaEmision: string;
  montoTotal: number;
  cae?: string | null;
  vencimientoCae?: string | null;
  estado: EstadoComprobanteFiscal | string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  receptorNombre?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ComprobantesFiscalesApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  listarComprobantes(estado?: string | null, financiadorId?: number | null, page = 0, size = 50): Observable<ComprobanteFiscalDTO[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'createdAt,desc');

    if (estado) {
      params = params.set('estado', estado);
    }
    if (financiadorId) {
      params = params.set('financiadorId', financiadorId.toString());
    }

    return this.http.get<ComprobanteFiscalDTO[]>(`${this.base}/comprobantes-fiscales`, { params });
  }

  emitirComprobante(documentoId: number, idempotencyKey: string): Observable<ComprobanteFiscalDTO> {
    const headers = new HttpHeaders({
      'X-Idempotency-Key': idempotencyKey,
    });
    return this.http.post<ComprobanteFiscalDTO>(
      `${this.base}/documentos-comerciales/${documentoId}/emitir-comprobante`,
      {},
      { headers }
    );
  }

  getArcaStatus(): Observable<ArcaStatusDTO> {
    return this.http.get<ArcaStatusDTO>(`${this.base}/arca/status`);
  }
}
