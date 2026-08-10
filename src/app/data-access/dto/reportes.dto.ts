export interface CxCAgingBucketDTO {
  clienteId?: number;
  nombreCliente?: string;
  saldoTotal?: number;
  monto0a30?: number;
  monto31a60?: number;
  monto61a90?: number;
  monto90Mas?: number;
}

export interface CxCAgingReportDTO {
  fechaCorte?: string;
  totalSaldoDeuda?: number;
  total0a30?: number;
  total31a60?: number;
  total61a90?: number;
  total90Mas?: number;
  clientes?: CxCAgingBucketDTO[];
}

export interface ReporteFacturacionClienteDTO {
  clienteId?: number;
  nombreCliente?: string;
  totalFacturado?: number;
  totalCobrado?: number;
  saldoPendiente?: number;
}

export interface ReporteFacturacionContratoDTO {
  contratoId?: number;
  numeroContrato?: string;
  institucionNombre?: string;
  totalFacturado?: number;
  saldoPendiente?: number;
}

export interface ReporteFinancieroDTO {
  facturacionPorCliente?: ReporteFacturacionClienteDTO[];
  facturacionPorContrato?: ReporteFacturacionContratoDTO[];
  totalCobranza?: number;
  totalDeuda?: number;
  totalDebitos?: number;
  aging?: CxCAgingReportDTO;
}

export interface ReporteGastoProveedorDTO {
  proveedorId?: number;
  razonSocial?: string;
  totalGasto?: number;
}

export interface ReporteGastoCentroCostoDTO {
  centroCostoId?: number;
  nombreCentroCosto?: string;
  totalGasto?: number;
}

export interface ReporteGastoCategoriaDTO {
  categoria?: string;
  totalGasto?: number;
}

export interface ReportePagoProximoDTO {
  ordenPagoId?: number;
  proveedorNombre?: string;
  monto?: number;
  fechaVencimiento?: string;
}

export interface ReporteComprasDTO {
  gastoPorProveedor?: ReporteGastoProveedorDTO[];
  gastoPorCentroCosto?: ReporteGastoCentroCostoDTO[];
  gastoPorCategoria?: ReporteGastoCategoriaDTO[];
  totalCuentasPorPagar?: number;
  pagosProximos?: ReportePagoProximoDTO[];
}

export interface ConteoItemDTO {
  nombre?: string;
  cantidad?: number;
}

export interface ResumenContratoPorVencerDTO {
  contratoId?: number;
  numeroContrato?: string;
  institucionNombre?: string;
  fechaVencimiento?: string;
  diasParaVencer?: number;
}

export interface ReportePadronContratosDTO {
  totalAfiliadosActivos?: number;
  afiliadosPorObraSocial?: ConteoItemDTO[];
  afiliadosPorPlan?: ConteoItemDTO[];
  altasEnPeriodo?: number;
  bajasEnPeriodo?: number;
  totalGruposFamiliares?: number;
  contratosActivos?: number;
  contratosPorVencer?: number;
  resumenContratosPorVencer?: ResumenContratoPorVencerDTO[];
}
