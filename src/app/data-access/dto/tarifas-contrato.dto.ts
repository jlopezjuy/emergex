export interface TarifaContratoDTO {
  id?: number;
  version?: number;
  contratoCobertura: { id: number; nombre?: string };
  prestacion: { id: number; nombre?: string; codigo?: string };
  zona?: { id: number; nombre?: string };
  importe: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
}
