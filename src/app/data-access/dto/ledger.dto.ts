export type TipoMovimientoLedger = 'DEBITO_DOCUMENTO' | 'CREDITO_COBRANZA' | 'REVERSA_APLICACION' | 'AJUSTE_CREDITO';

export interface LedgerMovimientoDTO {
  id: number;
  fechaContable: string;
  tipoMovimiento: TipoMovimientoLedger;
  concepto: string;
  montoDebe: number;
  montoHaber: number;
}

export interface TerceroResumenDTO {
  id: number;
  razonSocial: string;
  cuit: string;
  nombreComercial?: string;
}

export interface AgingDeudaDTO {
  noVencido: number;
  tramo0a30: number;
  tramo31a60: number;
  tramo61a90: number;
  tramo90plus: number;
  totalVencido: number;
}
