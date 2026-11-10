export interface TurnoResumenDTO {
  id: number;
  fechaHora: string; // ISO Instant String (UTC)
  estado: 'RESERVADO' | 'CONFIRMADO' | 'EN_SESION' | 'COMPLETADO' | 'CANCELADO' | 'AUSENTE' | 'OVERLAP';
  tipoTurno: 'PRESENCIAL' | 'VIRTUAL' | 'DOMICILIARIO';
  motivo?: string;
  pacienteId: number;
  pacienteNombre: string;
  pacienteDni: string;
  profesionalId: number;
  profesionalNombre: string;
  profesionalMatricula?: string;
  confirmacionAsistencia?: boolean;
  tiempoEsperaEstimado?: number;
  tiempoEsperaReal?: number;
  numeroOrdenAtencion?: number;
  costoEstimado?: number;
  copagoPaciente?: number;
  pacienteSexo?: string;
  pacienteFechaNacimiento?: string;
  pacienteEdad?: number;
  duracionMinutos: number;
  consultorioNombre?: string;
  observacionRecepcionista?: string;
}

export interface TurnoDetalleDTO extends TurnoResumenDTO {
  notaAdicional?: string;
  motivoCancelacion?: string;
  reprogramacionAutomatica?: boolean;
  linkVideoConsulta?: string;
  requiereAyuno?: boolean;
  requiereAcompanante?: boolean;
  instruccionEspecial?: string;
  requiereAutorizacion?: boolean;
  numeroAutorizacion?: string;
  encuestaSatisfaccion?: number;
  comentarioPaciente?: string;
}

export interface CrearTurnoRequest {
  pacienteId: number;
  profesionalId: number;
  fechaHora: string; // ISO Instant String (UTC)
  tipoTurno: 'PRESENCIAL' | 'VIRTUAL' | 'DOMICILIARIO';
  motivo?: string;
  notaAdicional?: string;
  requiereAyuno?: boolean;
  requiereAcompanante?: boolean;
  instruccionEspecial?: string;
  confirmacionDirecta?: boolean;
  requiereAutorizacion?: boolean;
  numeroAutorizacion?: string;
}

export interface SlotDisponibleDTO {
  horaInicio: string; // ISO Instant String
  horaFin: string;
  disponible: boolean;
  turnoIdOcupante?: number;
  pacienteNombreOcupante?: string;
}

export interface CancelarTurnoRequest {
  motivo: string;
  reprogramar?: boolean;
}

export interface ReagendarTurnoRequest {
  nuevaFechaHora: string; // ISO Instant String
  motivo?: string;
}

export interface CheckInTurnoRequest {
  observaciones?: string;
}

export interface ReagendarTurnoResponseDTO {
  id: number;
  anteriorFechaHora: string;
  nuevaFechaHora: string;
  reprogramadoPor?: string;
}
