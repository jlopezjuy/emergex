export type PlanTier = 'basico' | 'medio' | 'premium';
export type TipoCargo = 'SIN_CARGO' | 'CARGO_MINIMO' | 'CON_PRESUPUESTO' | 'SEGUN_ZONA' | 'NO_INCLUIDA';
export type PlanModality = 'individual' | 'familiar' | 'institucional';
export type PlanAudience = 'particulares' | 'corporativos';

export interface PlanCoverages {
  emergency: boolean;
  homeVisit: boolean;
  phoneOrientation: boolean;
  homeNursing: boolean;
  monthlyControl: boolean;
  scheduledTransport: boolean;
  interurbanTransport: boolean;
}

export interface PlanPrestacionDTO {
  id?: number;
  tipoCargo: TipoCargo;
  cargoMinimo?: number | null;
  limiteMensual?: number | null;
  requiereOrdenMedica: boolean;
  planComercial: { id: number };
  prestacion: { id: number; nombre?: string; codigo?: string; tipoAsistencia?: string };
  empresa: { id: number };
}

export interface PlanComercialDTO {
  id: string;
  name: string;
  description?: string;
  tier: PlanTier;
  modality: PlanModality;
  audience: PlanAudience;
  pricing: {
    monthly: number;
    quarterly: number;
    annual: number;
    perDependent: number;
    discountPct: number;
  };
  limits: {
    monthlyCap: number;
    freeIncluded: number;
    carencyDays: number;
  };
  coverages: PlanCoverages;
  active: boolean;
}
