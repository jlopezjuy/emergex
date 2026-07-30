export type TipoMovimientoLedger = 'DEBITO_DOCUMENTO' | 'CREDITO_COBRANZA' | 'REVERSA_APLICACION' | 'AJUSTE_CREDITO';

export interface LedgerCuentaCorriente {
  id: number;
  empresaId: number;
  terceroEmpresaId: number;
  fechaContable: string;
  tipoMovimiento: TipoMovimientoLedger;
  concepto: string;
  montoDebe: number;
  montoHaber: number;
  documentoComercialId?: number;
  correlationId?: string;
  createdAt: string;
}
