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
  tipoAsistencia: 'EMERGENCIA_DOMICILIARIA' | 'ORIENTACION_TELEFONICA' | 'ENFERMERIA_DOMICILIARIA' | 'CONTROL_MEDICO_DOMICILIARIO' | 'TRASLADO_PROGRAMADO' | 'VISITA_DOMICILIARIA';
  nivelUrgencia: 'ROJO' | 'AMARILLO' | 'VERDE' | 'AZUL';
  descripcionSintomas: string;
  direccion?: string;
  notaDireccion?: string;
  pacienteId?: number;
  noAfiliado?: boolean;
  pacienteNombre?: string;
  pacienteApellido?: string;
  pacienteDni?: string;
  pacienteTelefono?: string;
  ambulanciaId?: number;
  notaOperador?: string;
}

export interface CancelarTicketRequest {
  motivo: string;
  notas?: string;
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
