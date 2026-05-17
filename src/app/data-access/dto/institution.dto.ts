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
