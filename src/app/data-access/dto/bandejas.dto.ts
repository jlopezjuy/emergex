export interface ItemBandejaDTO {
  categoria?: string;
  titulo: string;
  detalle?: string;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  entidadTipo?: string;
  entidadId?: number;
  importe?: number;
  fechaOrigen?: string;
  diasAntiguedad?: number;
  responsable?: string;
  motivoBloqueo?: string;
  proximaAccion?: string;
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
  atencionesDocumentacionIncompletaCount?: number;
  desgloseFinanciadores: ItemResumenFinanciadorDTO[];
  atencionesSinFinanciador: ItemAtencionBandejaCoberturaDTO[];
  atencionesPendientesIdentificar: ItemAtencionBandejaCoberturaDTO[];
  atencionesCubiertasPorAbono: ItemAtencionBandejaCoberturaDTO[];
  atencionesDocumentacionIncompleta: ItemAtencionBandejaCoberturaDTO[];
}

export interface ChecklistPrestacionDTO {
  registroPrestacionId: number;
  estadoAdministrativo: string;
  completo: boolean;
  responsableAsignado?: string;
  proximaAccion?: string;
  motivoBloqueo?: string;
  requisitos: Array<{
    requisitoId: number;
    tipoDocumento: string;
    obligatorio: boolean;
    cumplido: boolean;
    documentoAdjuntoId?: number;
    nombreArchivo?: string;
  }>;
}

export interface ItemValorizacionDTO {
  codigo: string;
  descripcion: string;
  valorBase: number;
  cantidad: number;
  multiplicador: number;
  subtotal: number;
  cargoComun: boolean;
}

export interface DesgloseValorizacionDTO {
  importeTotal: number;
  renglones: ItemValorizacionDTO[];
}

export interface SimulacionTarifaRequestDTO {
  contratoCoberturaId?: number;
  tipoAsistenciaId?: number;
  kilometros?: number;
  minutosEspera?: number;
  esNocturno?: boolean;
  esFeriado?: boolean;
  cantidadAsistidosIncidente?: number;
}

export interface DetalleSnapshotDTO {
  lineaLoteId: number;
  registroPrestacionId: number;
  montoUnitario: number;
  alicuotaIva: number;
  montoIva: number;
  subtotal: number;
}

export interface PresentacionLoteDTO {
  id?: number;
  loteId: number;
  numeroPresentacion: string;
  revision: number;
  estado: 'BORRADOR' | 'ARMADA' | 'ENVIADA' | 'RECIBIDA' | 'OBSERVADA' | 'ACEPTADA_PARCIAL' | 'ACEPTADA' | 'RECHAZADA';
  fechaEnvio?: string;
  fechaRecepcion?: string;
  fechaLimite?: string;
  montoPresentado: number;
  montoAceptado?: number;
  observaciones?: string;
  detalles?: DetalleSnapshotDTO[];
}

export interface ItemLineaDebitoDTO {
  id?: number;
  lineaLoteId?: number;
  montoDebitado: number;
  codigoExterno?: string;
  causaCodigo?: string;
  causaDescripcion?: string;
  documentacionFaltante?: string;
}

export interface DebitoDetalladoDTO {
  id?: number;
  documentoComercialId: number;
  presentacionLoteId?: number;
  montoDebito: number;
  montoRecuperado?: number;
  montoPresentado?: number;
  montoAceptado?: number;
  motivoDebito: string;
  causaPrincipal: string;
  estado?: 'PENDIENTE' | 'CLASIFICADO' | 'APELADO' | 'RECLAMADO' | 'ACEPTADO' | 'RECUPERADO' | 'VENCIDO';
  fechaDebito?: string;
  fechaLimiteReclamo?: string;
  responsable?: string;
  lineas?: ItemLineaDebitoDTO[];
}

export interface ExtractoBancarioDTO {
  id?: number;
  bancoNombre: string;
  fechaMovimiento: string;
  concepto: string;
  monto: number;
  conciliado: boolean;
  hashLinea?: string;
}

export interface ConciliacionBancariaDTO {
  id?: number;
  extractoBancarioId: number;
  documentoComercialId?: number;
  cobranzaId?: number;
  ordenDePagoId?: number;
  montoConciliado: number;
  diferencia?: number;
  estado: 'PENDIENTE' | 'CONCILIADO_AUTOMATICO' | 'CONCILIADO_MANUAL' | 'OBSERVADO' | 'RECHAZADO';
  tipoCoincidencia: string;
  conciliadoPor: string;
  conciliadoAt: string;
}

export interface ItemDrillDownKpiDTO {
  entidadId: number;
  tipoEntidad: string;
  identificador: string;
  descripcion: string;
  importe: number;
  fecha: string;
  responsable?: string;
  estado?: string;
}

export interface KpiAdministrativoDTO {
  codigo: string;
  nombre: string;
  descripcion: string;
  formula: string;
  periodo: string;
  exclusiones: string;
  valorNumerico: number;
  valorFormateado: string;
  unidad: string;
  estadoSalud: 'OPTIMO' | 'ALERTA' | 'CRITICO' | string;
  drillDown: ItemDrillDownKpiDTO[];
}

