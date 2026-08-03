import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  registrarRecepcion(req: RegistrarRecepcionRequest): Observable<RecepcionBienesDTO> {
    return this.http.post<RecepcionBienesDTO>('/api/compras/recepciones', req);
  }

  getRecepcionesPorOC(ordenCompraId: number): Observable<RecepcionBienesDTO[]> {
    return this.http.get<RecepcionBienesDTO[]>(`/api/compras/recepciones/orden-compra/${ordenCompraId}`);
  }

  registrarFacturaProveedor(comprobante: ComprobanteProveedorDTO, proveedorId: number, ordenCompraId?: number): Observable<ComprobanteProveedorDTO> {
    return this.http.post<ComprobanteProveedorDTO>('/api/compras/comprobantes-proveedores', {
      comprobante,
      proveedorId,
      ordenCompraId,
    });
  }

  getComprobantesProveedor(): Observable<ComprobanteProveedorDTO[]> {
    return this.http.get<ComprobanteProveedorDTO[]>('/api/compras/comprobantes-proveedores');
  }

  evaluarMatchingTriangular(comprobanteId: number, ordenCompraId: number): Observable<boolean> {
    return this.http.post<boolean>(`/api/compras/three-way-matching/evaluar-triangular?comprobanteId=${comprobanteId}&ordenCompraId=${ordenCompraId}`, {});
  }

  overrideMatching(req: OverrideMatchingRequest): Observable<ComprobanteProveedorDTO> {
    return this.http.post<ComprobanteProveedorDTO>('/api/compras/three-way-matching/override', req);
  }
}
