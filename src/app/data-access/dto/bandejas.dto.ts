export interface ItemBandejaDTO {
  categoria?: string;
  titulo: string;
  detalle?: string;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  entidadTipo?: string;
  entidadId?: number;
}

export interface BandejaTrabajoResumenDTO {
  ticketsPendientesTarifacion: number;
  facturasPendientesCobro: number;
  debitosPendientesReclamo: number;
  promesasIncumplidas: number;
  clientesEnMoraCritica: number;
  ordenesCompraPendientesAprobacion: number;
  ordenesPagoPendientesAprobacion: number;
  contratosPorVencer: number;
  contratosVencidos: number;
  itemsFacturacion: ItemBandejaDTO[];
  itemsCobranzas: ItemBandejaDTO[];
  itemsCompras: ItemBandejaDTO[];
  itemsContratos: ItemBandejaDTO[];
}
