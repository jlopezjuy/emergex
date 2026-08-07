export type EstadoInstitucion = 'ACTIVA' | 'PENDIENTE_ACTIVACION' | 'SUSPENDIDA' | 'BAJA';

export type InstitutionType =
  | 'ESCUELA'
  | 'JARDIN'
  | 'COLEGIO_SECUNDARIO'
  | 'UNIVERSIDAD'
  | 'SHOPPING'
  | 'EMPRESA'
  | 'CLUB'
  | 'GERIATRICO'
  | 'GIMNASIO'
  | 'ORGANISMO_PUBLICO'
  | 'EVENTO'
  | 'OTRO';

export type ContractStatus = 'active' | 'suspended' | 'ended' | 'draft';

export interface ContractDTO {
  id?: number;
  code: string;
  plan: string;
  from: string;
  to: string;
  status: ContractStatus;
  monthlyPrice: number;
  eventPrice?: number;
  monthlyCap: number;
  kpiMinutes: number;
  conditions?: string;
}

export interface InstitutionDTO {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  type: InstitutionType;
  status: EstadoInstitucion;
  plan: string;
  email?: string;
  phone?: string;
  adminContact?: string;
  opsContact?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  polygon?: [number, number][];
  members?: number;
  sinceMonth?: string;
  contract?: ContractDTO;
}

export interface ContratoCoberturaPlanDTO {
  id?: number;
  contratoCoberturaId: number;
  planComercialId: number;
  planComercialNombre?: string;
  descripcion?: string;
  cantidadAfiliadosAsignados?: number;
  precioAcordadoOverride?: number;
  activo: boolean;
}

export interface FacturacionContratoDTO {
  id: number;
  periodoDesde: string;
  periodoHasta: string;
  cantidadMiembrosFacturados: number;
  precioUnitario: number;
  importeTotal: number;
  saldoPendiente?: number;
  observaciones?: string;
  contratoCobertura?: { id: number; codigo?: string; nombre?: string };
  empresa?: { id: number };
}

export interface GenerarFacturaContratoRequest {
  contratoId: number;
  periodoDesde: string;
  periodoHasta: string;
  observaciones?: string;
}

export interface RegistrarPagoInstitucionalRequest {
  fechaPago: string;
  monto: number;
  metodoPago:
    | 'EFECTIVO'
    | 'TRANSFERENCIA'
    | 'TARJETA_DEBITO'
    | 'TARJETA_CREDITO'
    | 'MERCADOPAGO'
    | 'CHEQUE'
    | 'OBRA_SOCIAL'
    | 'PREPAGA'
    | 'OTRO';
  numeroReferencia?: string;
  nota?: string;
}

export interface PagoInstitucionalResponseDTO {
  pagoId: number;
  facturacionContratoId: number;
  fechaPago?: string;
  monto?: number;
  metodoPago?: string;
  estadoPago?: string;
  saldoPendienteFactura?: number;
}

export interface PagoInstitucionalItemDTO {
  id: number;
  fechaPago?: string;
  montoTotal?: number;
  metodoPago?: string;
  estado?: string;
  numeroReferencia?: string;
  nota?: string;
}

export interface InstitucionMiembroItem {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  rol: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  activo: boolean;
}

export interface InstitucionEstadoCuentaDTO {
  institucionId: number;
  institucionNombre: string;
  totalFacturado: number;
  totalPagado?: number;
  saldoPendiente?: number;
  deudaEstimada?: boolean;
  detalleCalculoDeuda?: string;
  totalVencido?: number;
  totalPorVencer?: number;
  totalAlDia?: number;
  cantidadFacturas: number;
  cantidadVencidas?: number;
  cantidadPorVencer?: number;
  cantidadAlDia?: number;
  facturas: FacturacionContratoDTO[];
}

export interface AltaInstitucionCompletaRequest {
  institucion: Omit<InstitutionDTO, 'id'> & { id?: string };
  contratoInicial?: {
    codigo?: string;
    modalidadCobertura?: 'INDIVIDUAL_PLAN' | 'AREA_PROTEGIDA' | 'EVENTO';
    vigenciaDesde: string;
    vigenciaHasta?: string;
    estadoContrato?: 'BORRADOR' | 'ACTIVO' | 'SUSPENDIDO' | 'VENCIDO' | 'RESCINDIDO' | 'EN_RENEGOCIACION' | 'FINALIZADO' | 'ANULADO';
    precioMensualAcordado?: number;
    precioEventoAcordado?: number;
    topeAtencionesMensuales?: number;
    kpiRespuestaMinutos?: number;
    condicionesParticulares?: string;
    planComercialId?: number;
    areaProtegidaId?: number;
  };
}

export interface AltaInstitucionCompletaResponse {
  institucion: InstitutionDTO;
  contratoCobertura?: {
    id?: number;
    codigo?: string;
    vigenciaDesde?: string;
    vigenciaHasta?: string;
    estadoContrato?: string;
  };
}

export interface AutorizanteItem {
  id: number;
  login: string;
  nombreCompleto: string;
}
