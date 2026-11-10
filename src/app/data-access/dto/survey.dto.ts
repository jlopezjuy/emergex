export type TipoEncuesta =
  | 'SATISFACCION_GENERAL'
  | 'POST_ASISTENCIA'
  | 'CALIDAD_ATENCION'
  | 'NPS'
  | 'RECLAMOS_SUGERENCIAS'
  | 'PERSONALIZADA';

export type EstadoEncuesta = 'BORRADOR' | 'ACTIVA' | 'INACTIVA' | 'ARCHIVADA';
export type TipoRespuestaEncuesta =
  | 'TEXTO_CORTO'
  | 'TEXTO_LARGO'
  | 'NUMERICA'
  | 'ESCALA'
  | 'NPS'
  | 'SI_NO'
  | 'SELECCION_UNICA'
  | 'SELECCION_MULTIPLE'
  | 'FECHA';
export type FrecuenciaEncuesta = 'SEMANAL' | 'MENSUAL' | 'MANUAL';
export type EstrategiaSeleccionEncuesta =
  | 'ALEATORIA'
  | 'ALEATORIA_CON_ASISTENCIA_RECIENTE'
  | 'MENOS_ENCUESTADOS'
  | 'CONFIGURADA_MANUALMENTE';
export type EstadoCampaniaEncuesta = 'BORRADOR' | 'GENERADA' | 'EN_PROCESO' | 'FINALIZADA' | 'CANCELADA';
export type EstadoContactoEncuesta =
  | 'PENDIENTE'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'SIN_RESPUESTA'
  | 'RECHAZADO'
  | 'REPROGRAMADO'
  | 'TELEFONO_INVALIDO'
  | 'NO_DESEA_PARTICIPAR'
  | 'CANCELADO';
export type ResultadoIntentoEncuesta =
  | 'CONTESTADA'
  | 'SIN_RESPUESTA'
  | 'OCUPADO'
  | 'BUZON_DE_VOZ'
  | 'TELEFONO_INVALIDO'
  | 'CLIENTE_RECHAZA'
  | 'REPROGRAMADA'
  | 'COMPLETADA';
export type CanalEncuesta = 'TELEFONO' | 'PRESENCIAL' | 'WHATSAPP' | 'WEB' | 'OTRO';
export type EstadoRespuestaEncuesta = 'INICIADA' | 'COMPLETA' | 'INCOMPLETA' | 'ANULADA';

export interface PageResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
}

export interface EncuestaSummary {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo: TipoEncuesta;
  estado: EstadoEncuesta;
  versionActual?: number | null;
}

/** Entity DTO returned by the JHipster Criteria endpoint. It does not include aggregate version data. */
export interface EncuestaDTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  tipo: TipoEncuesta;
  estado: EstadoEncuesta;
  fechaCreacion: string;
  fechaActualizacion: string;
  empresa: { id: number };
}

export interface CreateEncuestaRequest {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  tipo: TipoEncuesta;
}

export interface UpdateEncuestaRequest extends CreateEncuestaRequest {
  id: number;
}

export interface EncuestaDetalle extends Omit<EncuestaSummary, 'versionActual'> {
  objetivo?: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  versionActual?: EncuestaVersionResumen | null;
}

export interface EncuestaVersionResumen {
  id: number;
  numero: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  anonima: boolean;
  permiteObservaciones: boolean;
}

export interface OpcionEncuestaDetalle {
  id: number;
  codigo: string;
  texto: string;
  valor?: string | null;
  orden: number;
  puntaje?: number | null;
  permiteTextoAdicional: boolean;
  activa: boolean;
}

export interface PreguntaEncuestaDetalle {
  id: number;
  codigo: string;
  texto: string;
  descripcionAyuda?: string | null;
  tipoRespuesta: TipoRespuestaEncuesta;
  orden: number;
  obligatoria: boolean;
  valorMinimo?: number | null;
  valorMaximo?: number | null;
  etiquetaMinima?: string | null;
  etiquetaMaxima?: string | null;
  permiteNoAplica: boolean;
  activa: boolean;
  opciones: OpcionEncuestaDetalle[];
}

export interface EncuestaVersionDetalle extends EncuestaVersionResumen {
  creadaEn: string;
  creadaPorId?: number | null;
  preguntas: PreguntaEncuestaDetalle[];
}

export interface OpcionRequest {
  codigo: string;
  texto: string;
  valor?: string | null;
  orden: number;
  puntaje?: number | null;
  permiteTextoAdicional: boolean;
}

export interface PreguntaRequest {
  codigo: string;
  texto: string;
  descripcionAyuda?: string | null;
  tipoRespuesta: TipoRespuestaEncuesta;
  orden: number;
  obligatoria: boolean;
  valorMinimo?: number | null;
  valorMaximo?: number | null;
  etiquetaMinima?: string | null;
  etiquetaMaxima?: string | null;
  permiteNoAplica: boolean;
  opciones: OpcionRequest[];
}

export interface VersionRequest {
  fechaInicio?: string | null;
  fechaFin?: string | null;
  anonima: boolean;
  permiteObservaciones: boolean;
  preguntas: PreguntaRequest[];
}

export interface PlanSummary {
  id: number;
  nombre: string;
  activo: boolean;
  frecuencia: FrecuenciaEncuesta;
  cantidadClientes: number;
  diasSinRepetirCliente: number;
  estrategiaSeleccion: EstrategiaSeleccionEncuesta;
  encuestaId: number;
}

export interface PlanRequest extends Omit<PlanSummary, 'id'> {
  id: number | null;
  diaSemana?: number | null;
  diaMes?: number | null;
  soloClientesConTelefono: boolean;
  soloClientesActivos: boolean;
  requiereAsistenciaPrevia: boolean;
  diasDesdeUltimaAsistencia?: number | null;
}

export interface PlanEncuestaDTO extends Omit<PlanRequest, 'encuestaId'> {
  fechaProximaEjecucion?: string | null;
  fechaUltimaEjecucion?: string | null;
  encuesta: { id: number; nombre?: string | null };
}

export interface CampaniaSummary {
  id: number;
  codigo: string;
  nombre: string;
  fechaDesde: string;
  fechaHasta: string;
  estado: EstadoCampaniaEncuesta;
  cantidadObjetivo: number;
  cantidadSeleccionada: number;
  encuestaId: number;
  version: number;
}

export interface CampaniaEncuestaDetalle extends CampaniaSummary {
  fechaGeneracion: string;
  semillaSeleccion?: string | null;
  encuestaNombre: string;
  encuestaVersionId: number;
  encuestaVersion: number;
  planId?: number | null;
  planNombre?: string | null;
  pendientes: number;
  completados: number;
  sinRespuesta: number;
  rechazados: number;
  reprogramados: number;
}

export interface CampaniaGenerationSummary {
  campaniaId: number;
  alreadyExisted: boolean;
  requested: number;
  selected: number;
  warning?: string | null;
  seed: string;
}

export interface MetricasCampania {
  seleccionados: number;
  intentos: number;
  completadas: number;
  rechazados: number;
  tasaRespuesta: number;
  tasaRechazo: number;
  promedioIntentos: number;
  nps?: number | null;
}

export interface ContactoCampaniaResumen {
  id: number;
  sujetoClave: string;
  nombre: string;
  telefono: string;
  estado: EstadoContactoEncuesta;
  cantidadIntentos: number;
  fechaUltimoIntento?: string | null;
  fechaProximoIntento?: string | null;
  fechaFinalizacion?: string | null;
  prioridad: number;
  observaciones?: string | null;
  motivoNoRealizada?: string | null;
  operadorAsignadoId?: number | null;
  operadorAsignadoLogin?: string | null;
}

export interface ContactoSummary {
  id: number;
  estado: EstadoContactoEncuesta;
  nombre: string;
  telefono: string;
  cantidadIntentos: number;
  fechaProximoIntento?: string | null;
  sujetoClave: string;
  operadorAsignadoId?: number | null;
}

export interface IntentoRequest {
  resultado: Exclude<ResultadoIntentoEncuesta, 'COMPLETADA'>;
  duracionSegundos?: number | null;
  telefonoUtilizado?: string | null;
  observaciones?: string | null;
  fechaReprogramada?: string | null;
}

export interface IntentoSummary {
  id: number;
  fechaHora: string;
  resultado: ResultadoIntentoEncuesta;
  duracionSegundos?: number | null;
  fechaReprogramada?: string | null;
}

export interface IntentoEncuestaDetalle extends IntentoSummary {
  telefonoUtilizado?: string | null;
  observaciones?: string | null;
  operadorId: number;
  operadorLogin: string;
}

export interface RespuestaItem {
  preguntaId: number;
  valorTexto?: string | null;
  valorNumerico?: number | null;
  valorBooleano?: boolean | null;
  valorFecha?: string | null;
  noAplica: boolean;
  observacion?: string | null;
  opcionIds: number[];
}

export interface GuardarRespuestasRequest {
  respuestas: RespuestaItem[];
  observacionGeneral?: string | null;
}

export interface RespuestaPreguntaDetalle extends RespuestaItem {
  id: number;
}

export interface RespuestaEncuestaDetalle {
  id: number;
  estado: EstadoRespuestaEncuesta;
  canal: CanalEncuesta;
  completada: boolean;
  fechaInicio: string;
  fechaFinalizacion?: string | null;
  puntajeTotal?: number | null;
  observacionGeneral?: string | null;
  contactoId: number;
  campaniaId: number;
  encuestaId: number;
  encuestaVersionId: number;
  operadorId: number;
  operadorLogin: string;
  respuestas: RespuestaPreguntaDetalle[];
}

export interface RespuestaSummary {
  id: number;
  estado: EstadoRespuestaEncuesta;
  completada: boolean;
  fechaInicio: string;
  fechaFinalizacion?: string | null;
  puntajeTotal?: number | null;
}

export interface ContactoEncuestaDetalle {
  contacto: ContactoCampaniaResumen;
  campania: CampaniaSummary;
  encuesta: EncuestaSummary;
  version: EncuestaVersionDetalle;
  respuesta?: RespuestaEncuestaDetalle | null;
  intentos: IntentoEncuestaDetalle[];
}

export const surveyLabels = {
  tipo: {
    SATISFACCION_GENERAL: 'Satisfacción general', POST_ASISTENCIA: 'Posterior a asistencia', CALIDAD_ATENCION: 'Calidad de atención',
    NPS: 'NPS', RECLAMOS_SUGERENCIAS: 'Reclamos y sugerencias', PERSONALIZADA: 'Personalizada',
  } satisfies Record<TipoEncuesta, string>,
  estado: { BORRADOR: 'Borrador', ACTIVA: 'Activa', INACTIVA: 'Inactiva', ARCHIVADA: 'Archivada' } satisfies Record<EstadoEncuesta, string>,
  frecuencia: { SEMANAL: 'Semanal', MENSUAL: 'Mensual', MANUAL: 'Manual' } satisfies Record<FrecuenciaEncuesta, string>,
  campania: { BORRADOR: 'Borrador', GENERADA: 'Generada', EN_PROCESO: 'En proceso', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' } satisfies Record<EstadoCampaniaEncuesta, string>,
  contacto: {
    PENDIENTE: 'Pendiente', ASIGNADO: 'Asignado', EN_PROCESO: 'En proceso', COMPLETADO: 'Completado', SIN_RESPUESTA: 'Sin respuesta',
    RECHAZADO: 'Rechazado', REPROGRAMADO: 'Reprogramado', TELEFONO_INVALIDO: 'Teléfono inválido', NO_DESEA_PARTICIPAR: 'No desea participar', CANCELADO: 'Cancelado',
  } satisfies Record<EstadoContactoEncuesta, string>,
};
