export type EstadoDebito = 'PENDIENTE' | 'RECLAMADO' | 'ACEPTADO' | 'RECUPERADO';

export interface DebitoDocumentoDTO {
  id: number;
  documentoId: number;
  montoDebito: number;
  motivo?: string;
  causaPrincipal?: string;
  fechaDebito?: string;
  estado: EstadoDebito;
  montoRecuperado?: number;
}

export interface RegistrarDebitoRequest {
  documentoId: number;
  montoDebito: number;
  motivo?: string;
  causaPrincipal?: string;
  fechaDebito?: string;
}

export interface ActualizarEstadoDebitoRequest {
  nuevoEstado: EstadoDebito;
  montoRecuperado?: number;
}
