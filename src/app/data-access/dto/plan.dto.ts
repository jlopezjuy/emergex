export type PlanTier = 'basico' | 'medio' | 'premium';
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

export interface PlanDTO {
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
