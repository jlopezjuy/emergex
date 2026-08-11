import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegistrarCobranzaRequestDTO {
  terceroEmpresaId: number;
  numeroRecibo: string;
  montoCobrado: number;
  moneda?: string;
}

export interface AplicarCobranzaRequestDTO {
  documentoComercialId: number;
  montoImputado: number;
}

export interface RevertirAplicacionRequestDTO {
  motivoReversion: string;
}

export interface CobranzaDTO {
  id: number;
  numeroRecibo: string;
  montoCobrado: number;
  montoAplicado: number;
  montoRemanente: number;
  moneda: string;
  fechaCobro: string;
}

export interface AplicacionCobranzaDTO {
  id: number;
  montoImputado: number;
  revertida?: boolean;
  motivoReversion?: string;
  createdAt: string;
}

export interface RegistrarGestionCobranzaDTO {
  clienteId: number;
  tipoGestion: string;
  fechaPromesaPago?: string;
  montoPrometido?: number;
  observaciones: string;
}

export interface GestionCobranzaDTO {
  id: number;
  clienteId: number;
  tipoGestion: string;
  fechaPromesaPago?: string;
  montoPrometido?: number;
  observaciones: string;
  createdAt?: string;
}

export interface DocumentoPendienteDTO {
  id: number;
  numeroDocumento: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  montoTotal: number;
  saldoPendiente: number;
  moneda: string;
}

/**
 * Servicio de llamadas HTTP para el ciclo de cobranzas y su aplicación (S2-04 / S2-05 / F2-03).
 */
@Injectable({ providedIn: 'root' })
export class CobranzasApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/cxc`;

  registrarCobranza(req: RegistrarCobranzaRequestDTO): Observable<CobranzaDTO> {
    return this.http.post<CobranzaDTO>(`${this.base}/cobranzas`, req);
  }

  aplicarADocumento(cobranzaId: number, req: AplicarCobranzaRequestDTO): Observable<AplicacionCobranzaDTO> {
    return this.http.post<AplicacionCobranzaDTO>(`${this.base}/cobranzas/${cobranzaId}/aplicaciones`, req);
  }

  revertirAplicacion(aplicacionId: number, req: RevertirAplicacionRequestDTO): Observable<void> {
    return this.http.post<void>(`${this.base}/aplicaciones/${aplicacionId}/reversa`, req);
  }

  registrarGestion(req: RegistrarGestionCobranzaDTO): Observable<GestionCobranzaDTO> {
    return this.http.post<GestionCobranzaDTO>(`${this.base}/gestiones`, req);
  }

  getGestionesByCliente(clienteId: number): Observable<GestionCobranzaDTO[]> {
    return this.http.get<GestionCobranzaDTO[]>(`${this.base}/gestiones/cliente/${clienteId}`);
  }

  getDocumentosPendientes(terceroEmpresaId: number): Observable<DocumentoPendienteDTO[]> {
    return this.http.get<DocumentoPendienteDTO[]>(`${this.base}/documentos-pendientes?terceroEmpresaId=${terceroEmpresaId}`);
  }
}
