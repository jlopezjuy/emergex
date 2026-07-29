export type EstadoContratoConvenio =
  | 'BORRADOR'
  | 'ACTIVO'
  | 'SUSPENDIDO'
  | 'VENCIDO'
  | 'RESCINDIDO'
  | 'EN_RENEGOCIACION'
  | 'FINALIZADO'
  | 'ANULADO';

/**
 * Convenio B2B entre la empresa y una obra social externa. Es un ContratoCobertura
 * (backend) con modalidadCobertura = CONVENIO_OBRA_SOCIAL — reutiliza el mismo modelo
 * y endpoint que los contratos de Área Protegida, sin institución ni plan comercial.
 */
export interface ConvenioObraSocialDTO {
  id?: number;
  codigo?: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  estadoContrato: EstadoContratoConvenio;
  condicionesParticulares?: string;
  obraSocial: { id: number; nombre?: string };
}
