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
  status: 'activa' | 'inactiva';
  plan: string;
  email?: string;
  phone?: string;
  adminContact?: string;
  opsContact?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  members?: number;
  sinceMonth?: string;
  contract?: ContractDTO;
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
