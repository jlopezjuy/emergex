export type EstadoInstitucion = 'ACTIVA' | 'PENDIENTE_ACTIVACION' | 'SUSPENDIDA' | 'BAJA';

export type InstitutionType =
  | 'colegio'
  | 'universidad'
  | 'empresa'
  | 'club'
  | 'hospital'
  | 'gobierno'
  | 'ong'
  | 'otro';

export type ContractStatus = 'active' | 'suspended' | 'ended' | 'draft';

export interface ContractDTO {
  id?: number;
  code: string;
  plan: string;
  from: string;
  to: string;
  status: ContractStatus;
  monthlyPrice: number;
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
