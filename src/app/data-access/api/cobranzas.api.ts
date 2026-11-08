import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

/**
 * Recibo + imputaciones en una sola solicitud (H-09): reemplaza el flujo de "crear recibo" +
 * N llamadas de "imputar", que dejaba estado parcial ante cualquier falla intermedia.
 */
export interface RegistrarCobranzaConImputacionesRequestDTO {
  terceroEmpresaId: number;
  numeroRecibo: string;
  /** Total que cancela deuda (bruto): lo recibido es este monto menos las retenciones. */
  montoCobrado: number;
  moneda?: string;
  imputaciones: AplicarCobranzaRequestDTO[];
  medioPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';
  retenciones?: RetencionSufridaDTO[];
}

/** Retención que el cliente practicó al pagar; cancela deuda pero no es plata recibida. */
export interface RetencionSufridaDTO {
  tipo: 'GANANCIAS' | 'IIBB' | 'IVA' | 'SUSS';
  monto: number;
  numeroCertificado: string;
  /** Obligatoria sólo para IIBB. */
  jurisdiccion?: string;
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

  /**
   * Registra el recibo y aplica todas sus imputaciones en una sola operación atómica (H-09).
   * {@code idempotencyKey} permite que un reintento del mismo formulario (doble click, error de
   * red) no genere un segundo recibo: el backend devuelve el ya creado en el primer intento.
   */
  registrarCobranzaConImputaciones(
    req: RegistrarCobranzaConImputacionesRequestDTO,
    idempotencyKey: string,
  ): Observable<CobranzaDTO> {
    const headers = new HttpHeaders({ 'X-Idempotency-Key': idempotencyKey });
    return this.http.post<CobranzaDTO>(`${this.base}/cobranzas-con-imputaciones`, req, { headers });
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
