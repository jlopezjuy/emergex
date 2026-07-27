export interface CrearAmbulanciaRequest {
  identificador: string;
  tipo: 'ALS' | 'BLS';
  patente?: string;
  modelo?: string;
  anio?: number;
}

export interface UnidadMovilDTO {
  id: number;
  identificador?: string;
  tipo?: string;
  estado?: 'DISPONIBLE' | 'EN_SERVICIO' | 'EN_RUTA' | 'EN_SITIO' | 'TRASLADO' | 'MANTENIMIENTO' | 'EN_TALLER' | 'FUERA_SERVICIO';
  disponibleParaDespacho?: boolean;
  motivoNoDisponible?: string | null;
  turnoActual?: string | null;
  tripulacion?: string;
  tripulacionActual?: TripulacionMovilDTO[];
  bateria?: number;
  combustible?: number;
  latitud?: number;
  longitud?: number;
  eta?: number | null;
  ticketActivo?: number;
  patente?: string;
  modelo?: string;
  // inventario real del backend
  oxigenoPct?: number | null;
  adrenalinaPct?: number | null;
  sueroSalinoPct?: number | null;
  deaPct?: number | null;
  morfinaPct?: number | null;
  tuboEndotraquealPct?: number | null;
  // operativa del backend
  kmHoy?: number | null;
  serviciosHoy?: number | null;
  ultimaConexionSegundos?: number | null;
  ultimaPosicionTimestamp?: string | null;
}


export interface FlotaDashboardDTO {
  disponibles: number;
  enRuta: number;
  enSitio: number;
  traslado: number;
  mantenimiento: number;
  totalUnidades: number;
}

export interface FlotaMetricasDTO {
  tiempoRespuestaPromedio?: number;
  distanciaRecorrida?: number;
  ticketsAtendidos?: number;
  eficiencia?: number;
}

export interface TurnoMovilDTO {
  id?: number;
  ambulanciaId: number;
  ambulanciaCodigo?: string;
  fechaInicio: string;  // ISO Instant
  fechaFin: string;     // ISO Instant
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  observacion?: string;
  // campos legacy usados en UI
  tipo?: string;
  activo?: boolean;
  tripulacion?: TripulacionMovilDTO[] | TripulacionGuardiaDTO[];
}

export interface TripulacionMovilDTO {
  id?: number;
  turnoId?: number;
  profesionalId: number;
  rol?: string;
  nombre?: string;
  profesionalNombre?: string;
}

export interface GeoPosicionDTO {
  id?: number;
  ambulanciaId: number;
  latitud: number;
  longitud: number;
  timestamp?: string;
}

export interface AsignarMovilRequestDTO {
  ambulanciaId: number;
  usarTripulacionActiva?: boolean;
  observacion?: string;
}

export type MotivoCambioMovil =
  | 'FALTA_INSUMOS'
  | 'FALLA_MECANICA'
  | 'MEJOR_EQUIPAMIENTO'
  | 'REASIGNACION_OPERATIVA'
  | 'PRIORIDAD_SUPERIOR'
  | 'OTRO';

export interface CambiarMovilRequestDTO {
  nuevaAmbulanciaId: number;
  motivoCambio: MotivoCambioMovil;
  // Obligatoria: registro auditable de por qué se cambió la unidad.
  observacion: string;
  ticketVersion: number;
  usarTripulacionActiva?: boolean;
}

export interface GuardiaMovilDTO {
  id?: number;
  ambulanciaId: number;
  diaSemana?: string;
  horaInicio?: string;
  horaFin?: string;
  activa?: boolean;
  observacion?: string;
}

export interface LogTurnoMovilDTO {
  id?: number;
  turnoId?: number;
  ambulanciaId?: number;
  evento?: string;
  fecha?: string;
  operador?: string;
}

export interface TripulacionGuardiaDTO {
  id?: number;
  profesionalId?: number;
  profesionalNombre?: string;
  nombre?: string;
  rol?: string;
  especialidad?: string | null;
  activo?: boolean;
}

export interface GuardiaDTO {
  id?: number;
  ambulanciaId?: number;
  diaSemana?: string;
  horaInicio?: string;
  horaFin?: string;
  estado?: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  tripulacion?: TripulacionGuardiaDTO[];
}

export interface LogTurnoDTO {
  id?: number;
  ambulanciaId?: number;
  evento?: string;
  fecha?: string;
  operador?: string;
}

export interface ProfesionalDisponibleDTO {
  profesionalId?: number;
  profesionalNombre?: string;
  rol?: string;
  especialidad?: string | null;
  subespecialidad?: string | null;
  telefono?: string | null;
  activo?: boolean;
  turnoMovilId?: number | null;
}
