export type EstadoRecepcion = 'PENDIENTE_CONFORMIDAD' | 'CONFORMADA' | 'RECHAZADA';
export type EstadoMatching = 'MATCH_OK' | 'BLOQUEADO_DIFERENCIA' | 'PENDIENTE_MATCHING';

export interface RecepcionBienes {
  id?: number;
  empresaId?: number;
  ordenDeCompraId: number;
  numeroRemito: string;
  fechaRecepcion: string;
  estado: EstadoRecepcion;
  recibidoPor: string;
}

export interface ComprobanteProveedor {
  id?: number;
  empresaId?: number;
  proveedorId: number;
  ordenDeCompraId?: number;
  recepcionBienesId?: number;
  tipoDocumento: string;
  puntoVenta: number;
  numeroDocumento: number;
  fechaComprobante: string;
  montoTotal: number;
  estadoMatching: EstadoMatching;
  motivoBloqueo?: string;
}
