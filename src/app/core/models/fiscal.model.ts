export type EstadoComprobanteFiscal = 'PENDIENTE_CAE' | 'AUTORIZADO' | 'RECHAZADO_ARCA';

export interface ComprobanteFiscalArca {
  id?: number;
  empresaId?: number;
  documentoComercialId?: number;
  tipoComprobante: string;
  puntoVenta: number;
  numeroComprobante: number;
  fechaEmision: string;
  montoTotal: number;
  cae?: string;
  vencimientoCae?: string;
  estado: EstadoComprobanteFiscal;
}
