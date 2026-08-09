import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SolicitudCompraDTO {
  id?: number;
  concepto: string;
  montoEstimado?: number;
  estado?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  solicitadoPor?: string;
  fechaSolicitud?: string;
}

export interface OrdenCompraDTO {
  id?: number;
  numero?: string;
  proveedorId?: number;
  montoTotal?: number;
  estado?: 'EMITIDA' | 'RECEPCIONADA' | 'CANCELADA';
  fechaEmision?: string;
}

export interface RecepcionBienesDTO {
  id?: number;
  numeroRemito: string;
  fechaRecepcion: string;
  recibidoPor: string;
  ordenCompraId?: number;
}

export interface LineaRecepcionBienesDTO {
  id?: number;
  descripcionItem: string;
  cantidadRecibida: number;
  numeroLote?: string;
  fechaVencimiento?: string;
}

export interface RegistrarRecepcionRequest {
  ordenCompraId: number;
  recepcionBienes: RecepcionBienesDTO;
  lineas: LineaRecepcionBienesDTO[];
  esParcial: boolean;
}

export interface ComprobanteProveedorDTO {
  id?: number;
  tipoDocumento: string;
  puntoVenta: number;
  numeroDocumento: number;
  fechaComprobante: string;
  montoTotal: number;
  estadoMatching?: 'PENDIENTE_MATCHING' | 'MATCH_OK' | 'BLOQUEADO_DIFERENCIA';
  motivoBloqueo?: string;
  proveedorId?: number;
  ordenCompraId?: number;
}

export interface OverrideMatchingRequest {
  comprobanteId: number;
  motivoExcepcion: string;
  usuarioAprobador: string;
}

@Injectable({
  providedIn: 'root',
})
export class ComprasApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/compras`;

  getSolicitudes(): Observable<SolicitudCompraDTO[]> {
    return this.http.get<SolicitudCompraDTO[]>(`${this.base}/solicitudes`);
  }

  crearSolicitud(solicitud: Partial<SolicitudCompraDTO>): Observable<SolicitudCompraDTO> {
    return this.http.post<SolicitudCompraDTO>(`${this.base}/solicitudes`, solicitud);
  }

  aprobarSolicitud(id: number): Observable<SolicitudCompraDTO> {
    return this.http.post<SolicitudCompraDTO>(`${this.base}/solicitudes/${id}/aprobar`, {});
  }

  getOrdenesCompra(): Observable<OrdenCompraDTO[]> {
    return this.http.get<OrdenCompraDTO[]>(`${this.base}/ordenes`);
  }

  registrarRecepcion(req: RegistrarRecepcionRequest): Observable<RecepcionBienesDTO> {
    return this.http.post<RecepcionBienesDTO>(`${this.base}/recepciones`, req);
  }

  getRecepcionesPorOC(ordenCompraId: number): Observable<RecepcionBienesDTO[]> {
    return this.http.get<RecepcionBienesDTO[]>(`${this.base}/recepciones/orden-compra/${ordenCompraId}`);
  }

  registrarFacturaProveedor(comprobante: ComprobanteProveedorDTO, proveedorId: number, ordenCompraId?: number): Observable<ComprobanteProveedorDTO> {
    return this.http.post<ComprobanteProveedorDTO>(`${this.base}/comprobantes-proveedores`, {
      comprobante,
      proveedorId,
      ordenCompraId,
    });
  }

  getComprobantesProveedor(): Observable<ComprobanteProveedorDTO[]> {
    return this.http.get<ComprobanteProveedorDTO[]>(`${this.base}/comprobantes-proveedores`);
  }

  evaluarMatchingTriangular(comprobanteId: number, ordenCompraId: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.base}/three-way-matching/evaluar-triangular?comprobanteId=${comprobanteId}&ordenCompraId=${ordenCompraId}`, {});
  }

  overrideMatching(req: OverrideMatchingRequest): Observable<ComprobanteProveedorDTO> {
    return this.http.post<ComprobanteProveedorDTO>(`${this.base}/three-way-matching/override`, req);
  }
}
