export interface ClinicalEvent {
  type: 'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION' | 'CONSENTIMIENTO' | 'RESOLUCION' | string;
  date: string;
  title: string;
  description?: string;
  details?: string[];
  badgeClass?: string;
  rawData?: any;
}
