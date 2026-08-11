import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { ITEMS_PER_PAGE, PagedResult, buildParams, toPagedResult } from './pagination';

export interface SolicitudCompraDTO {
  id?: number;
  numeroSolicitud?: string;
  concepto?: string;
  justificacion?: string;
  montoEstimado?: number;
  estado?: 'PRESENTADA' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  solicitadoPor?: string;
  solicitante?: string;
  fechaSolicitud?: string;
  centroCostoId?: number;
  centroCostoNombre?: string;
}

export interface CotizacionProveedorDTO {
  id?: number;
  solicitudCompraId: number;
  proveedorId?: number;
  proveedorNombre?: string;
  montoCotizado: number;
  plazoEntregaDias?: number;
  observaciones?: string;
  seleccionada?: boolean;
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
  private cotizacionesBase = `${environment.apiUrl}/api/v1/cotizaciones-proveedor`;

  getSolicitudes(): Observable<SolicitudCompraDTO[]> {
    return this.http.get<SolicitudCompraDTO[]>(`${this.base}/solicitudes`);
  }

  /**
   * Obtiene la lista paginada server-side de solicitudes de compra (V3-S3-01).
   */
  getSolicitudesPage(page = 0, size = ITEMS_PER_PAGE): Observable<PagedResult<SolicitudCompraDTO>> {
    const params = buildParams({ page, size, sort: 'id,desc' });
    return this.http
      .get<SolicitudCompraDTO[]>(`${this.base}/solicitudes`, { params, observe: 'response' })
      .pipe(toPagedResult());
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

  /**
   * Obtiene la lista paginada server-side de órdenes de compra (V3-S3-01).
   */
  getOrdenesCompraPage(page = 0, size = ITEMS_PER_PAGE): Observable<PagedResult<OrdenCompraDTO>> {
    const params = buildParams({ page, size, sort: 'id,desc' });
    return this.http
      .get<OrdenCompraDTO[]>(`${this.base}/ordenes`, { params, observe: 'response' })
      .pipe(toPagedResult());
  }

  /**
   * Obtiene las cotizaciones de proveedores registradas para una Solicitud de Compra (V3-S3-02).
   */
  getCotizacionesPorSolicitud(solicitudCompraId: number): Observable<CotizacionProveedorDTO[]> {
    return this.http.get<CotizacionProveedorDTO[]>(`${this.cotizacionesBase}/solicitud/${solicitudCompraId}`);
  }

  /**
   * Registra una nueva cotización de proveedor para comparativa de compra (V3-S3-02).
   */
  registrarCotizacion(dto: CotizacionProveedorDTO): Observable<CotizacionProveedorDTO> {
    return this.http.post<CotizacionProveedorDTO>(this.cotizacionesBase, dto);
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
