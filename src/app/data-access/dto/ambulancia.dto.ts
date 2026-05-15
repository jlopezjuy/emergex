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
  tipo?: 'ALS' | 'BLS';
  estado?: 'DISPONIBLE' | 'EN_RUTA' | 'EN_SITIO' | 'TRASLADO' | 'MANTENIMIENTO';
  tripulacion?: string;
  bateria?: number;
  combustible?: number;
  latitud?: number;
  longitud?: number;
  eta?: number;
  ticketActivo?: number;
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
  fechaInicio: string;
  fechaFin: string;
  tipo?: string;
  activo?: boolean;
  tripulacion?: TripulacionMovilDTO[];
}

export interface TripulacionMovilDTO {
  id?: number;
  turnoId?: number;
  profesionalId: number;
  rol?: string;
  nombre?: string;
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
  notas?: string;
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
