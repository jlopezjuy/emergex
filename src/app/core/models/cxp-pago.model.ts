export type EstadoOrdenPago = 'PENDIENTE_APROBACION' | 'APROBADA' | 'EJECUTADA' | 'ANULADA';

export interface OrdenDePago {
  id?: number;
  empresaId?: number;
  proveedorId: number;
  numeroOp: string;
  fechaPago: string;
  montoBruto: number;
  montoRetenciones: number;
  montoNeto: number;
  estado: EstadoOrdenPago;
  creadoPor: string;
}
