export type EstadoSolicitudCompra = 'BORRADOR' | 'PRESENTADA' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';
export type EstadoOrdenCompra = 'EMITIDA' | 'CONFORMADA_PARCIAL' | 'CONFORMADA_TOTAL' | 'ANULADA';

export interface SolicitudCompra {
  id?: number;
  empresaId?: number;
  numeroSolicitud: string;
  solicitante: string;
  fechaSolicitud: string;
  justificacion: string;
  montoEstimado: number;
  estado: EstadoSolicitudCompra;
  aprobadoPor?: string;
  aprobadoAt?: string;
  motivoRechazo?: string;
}

export interface CrearSolicitudCompraRequest {
  numeroSolicitud: string;
  justificacion: string;
  montoEstimado: number;
}

export interface OrdenDeCompra {
  id?: number;
  empresaId?: number;
  proveedorId: number;
  solicitudCompraId?: number;
  numeroOc: string;
  fechaEmision: string;
  montoTotal: number;
  moneda: string;
  estado: EstadoOrdenCompra;
  emitidaPor: string;
}
