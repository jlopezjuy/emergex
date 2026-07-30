/**
 * Vista mínima de un contrato de cobertura activo, para selectores (alta rápida,
 * etc.). `nombre` ya viene resuelto server-side (ver ContratoCoberturaMapper) —
 * "CONVENIO: <obra social>" para convenios, el nombre del área/institución para
 * el resto — así el frontend no necesita resolver ninguna relación por su cuenta.
 */
export interface ContratoActivoDTO {
  id: number;
  nombre: string;
  modalidadCobertura: 'INDIVIDUAL_PLAN' | 'AREA_PROTEGIDA' | 'EVENTO' | 'PARTICULAR' | 'CONVENIO_OBRA_SOCIAL';
  obraSocialId?: number;
}
