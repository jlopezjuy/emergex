export interface TicketAsistenciaDTO {
  id: number;
  codigo?: string;
  tipoEmergencia?: string;
  prioridad?: 'CRITICA' | 'URGENTE' | 'NORMAL';
  estado?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  pacienteId?: number;
  ambulanciaId?: number;
  empresaId?: number;
  fechaCreacion?: string;
  elapsedSeconds?: number;
  slaSeg?: number;
  operador?: string;
  unidadAsignada?: string;
  pacienteDescripcion?: string;
}

export interface CrearTicketRequest {
  tipoEmergencia: string;
  prioridad: string;
  direccion: string;
  sector?: string;
  pacienteId?: number;
  notas?: string;
  empresaId?: number;
}

export interface DespacharRequest {
  ambulanciaId: number;
  notas?: string;
}

export interface CerrarTicketRequest {
  notas?: string;
  resultado?: string;
}

export interface LogEstadoTicketDTO {
  id: number;
  estado: string;
  fecha: string;
  operador?: string;
  notas?: string;
}

export interface SignosVitalesDTO {
  id?: number;
  frecuenciaCardiaca?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  saturacionO2?: number;
  temperatura?: number;
  frecuenciaRespiratoria?: number;
  timestamp?: string;
}

export interface ProcedimientoDTO {
  id?: number;
  descripcion?: string;
  ejecutadoPor?: string;
  timestamp?: string;
}

export interface MedicacionDTO {
  id?: number;
  medicamento?: string;
  dosis?: string;
  via?: string;
  administradoPor?: string;
  timestamp?: string;
}

export interface TicketDetalleDTO {
  ticket?: TicketAsistenciaDTO;
  timeline?: LogEstadoTicketDTO[];
  tripulacion?: TripulacionDetalleDTO[];
  signos?: SignosVitalesDTO[];
  procedimientos?: ProcedimientoDTO[];
  medicacion?: MedicacionDTO[];
}

export interface TripulacionDetalleDTO {
  id?: number;
  nombre?: string;
  rol?: string;
}
