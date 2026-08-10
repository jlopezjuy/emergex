export interface EmitirOrdenDePagoDTO {
  comprobanteId: number;
  numeroOp: string;
  montoRetenciones?: number;
}

export interface EjecutarOrdenDePagoDTO {
  medioPago?: string;
  referenciaTransf?: string;
}

export interface OrdenDePagoDTO {
  id: number;
  numeroOp: string;
  comprobanteId: number;
  proveedorId?: number;
  proveedorNombre?: string;
  montoBruto: number;
  montoRetenciones?: number;
  montoNeto: number;
  estado: 'PENDIENTE_APROBACION' | 'APROBADA' | 'EJECUTADA' | 'CANCELADA';
  cbuDestinoMasked?: string;
  fechaEmision?: string;
  fechaPago?: string;
}
