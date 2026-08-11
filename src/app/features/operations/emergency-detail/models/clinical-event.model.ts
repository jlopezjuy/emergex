export interface ClinicalEvent {
  type: 'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION' | 'CONSENTIMIENTO' | 'RESOLUCION' | string;
  date: string;
  title: string;
  description?: string;
  details?: string[];
  badgeClass?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: any;
}
