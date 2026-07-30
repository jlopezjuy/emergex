export type TipoGestionCobranza = 'PROMESA_PAGO' | 'DISPUTA' | 'INCOBRABLE' | 'RECHAZO_DEBITO';

export interface GestionCobranza {
  id?: number;
  empresaId?: number;
  clienteId: number;
  tipoGestion: TipoGestionCobranza;
  fechaPromesaPago?: string;
  montoPrometido?: number;
  observaciones: string;
  operador: string;
}
