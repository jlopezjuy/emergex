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

export interface ItemResumenFinanciadorDTO {
  terceroEmpresaId: number;
  nombreFinanciador: string;
  razonSocial?: string;
  cuit?: string;
  cantidadAtenciones: number;
  importeEstimado: number;
}

export interface ItemAtencionBandejaCoberturaDTO {
  registroPrestacionId: number;
  ticketId?: number;
  numeroTicket?: string;
  fecha: string;
  prestacionNombre?: string;
  sujetoNombre?: string;
  modalidadCobertura?: string;
  estadoIdentificacion?: string;
  esFacturable?: boolean;
  motivoNoFacturable?: string;
  nombreFinanciador?: string;
  importeUnitario?: number;
}

export interface ResumenBandejaCoberturaDTO {
  totalAtenciones: number;
  totalImporteEstimado: number;
  atencionesSinFinanciadorCount: number;
  atencionesPendientesIdentificarCount: number;
  atencionesCubiertasPorAbonoCount: number;
  desgloseFinanciadores: ItemResumenFinanciadorDTO[];
  atencionesSinFinanciador: ItemAtencionBandejaCoberturaDTO[];
  atencionesPendientesIdentificar: ItemAtencionBandejaCoberturaDTO[];
  atencionesCubiertasPorAbono: ItemAtencionBandejaCoberturaDTO[];
  atencionesDocumentacionIncompleta: ItemAtencionBandejaCoberturaDTO[];
}

