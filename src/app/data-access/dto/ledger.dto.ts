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
