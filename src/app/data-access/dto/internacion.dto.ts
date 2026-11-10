/**
 * DTOs for Internacion Domiciliaria module.
 * Backend: /api/v1/internaciones (42 endpoints, Chunks H–E)
 */

/* ──────────────── Core Entities ──────────────── */

export interface InternacionDomiciliariaDTO {
  id: number;
  fechaInicio: string;
  fechaFin?: string;
  diagnosticoPrincipal: string;
  estado: EstadoInternacion;
  motivoAlta?: string;
  direccionInternacion: string;
  coordenadasUbicacion?: string;
  familiarResponsable: string;
  telefonoEmergencia: string;
  seguridadZona?: number;
  observacionLogistica?: string;
  paciente?: PacienteRef;
  medicoSolicitante?: ProfesionalRef;
  ticketOrigen?: TicketRef;
  coordinador?: ProfesionalRef;
  evaluacion?: EvaluacionDomiciliariaDTO;
  planCuidado?: PlanCuidadoDTO;
  equipoTratantes?: EquipoTratanteDTO[];
  visitaProgramadas?: VisitaProgramadaDTO[];
  diagnostico?: DiagnosticoRef;
  empresa?: EmpresaRef;
}

export interface PacienteRef {
  id: number;
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
}

export interface ProfesionalRef {
  id: number;
  nombre?: string;
  apellido?: string;
  telefono?: string;
}

export interface TicketRef {
  id: number;
  descripcionSintomas?: string;
  nivelUrgencia?: string;
  fechaCreacion?: string;
}

export interface DiagnosticoRef {
  id: number;
  nombre?: string;
  codigoCIE10?: string;
}

export interface EmpresaRef {
  id: number;
  nombre?: string;
}

export type EstadoInternacion =
  | 'SOLICITADA'
  | 'ADMITIDA'
  | 'EVALUADA'
  | 'EVALUACION_PENDIENTE'
  | 'RECHAZADA'
  | 'APROBADA'
  | 'ACTIVA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'SUSPENDIDA_TEMPORALMENTE'
  | 'SUSPENDIDA_POR_TRASLADO';

/* ──────────────── DTOs de entrada ──────────────── */

export interface IniciarInternacionDTO {
  ticketId: number;
  diagnosticoPrincipal: string;
  direccionInternacion: string;
  familiarResponsable: string;
  telefonoEmergencia: string;
  diagnosticoId?: number;
  observaciones?: string;
}

export interface ResumenAltaDTO {
  fechaAlta: string;
  diagnosticoEgreso: string;
  resumenEvolucion: string;
  indicacionesAlta: string;
  motivoAlta?: string;
}

export interface RechazoInternacionDTO {
  motivo: string;
}

export interface AsignarEquipoDTO {
  profesionalId: number;
  rol: string;
  disciplina?: string;
  disponibilidad24x7?: boolean;
  contactoEmergencia?: string;
  observacionRol?: string;
}

export interface FinalizarVisitaDTO {
  observacion?: string;
}

/* ──────────────── Evaluación ──────────────── */

export interface EvaluacionDomiciliariaDTO {
  id?: number;
  fechaEvaluacion?: string;
  resultado?: string;
  observacionEntorno?: string;
  soporteFamiliar?: string;
  accesibilidadDomicilio?: number;
  condicionesHigiene?: number;
  seguridadZona?: number;
  servicioBasico?: boolean;
  espacioAdecuado?: boolean;
  familiarResponsable?: string;
  telefonoFamiliar?: string;
  direccionExacta?: string;
  referenciaUbicacion?: string;
  evaluador?: { id: number };
}

/* ──────────────── Plan de Cuidado ──────────────── */

export interface PlanCuidadoDTO {
  id?: number;
  objetivo?: string;
  descripcionGeneral?: string;
  fechaCreacion?: string;
  frecuenciaVisitas?: string;
  duracionEstimada?: number;
  medicamentoIncluido?: string;
  equipamientoRequerido?: string;
  cuidadoresNecesarios?: number;
  costoDiario?: number;
  observacionFamilia?: string;
}

/* ──────────────── Equipo Tratante ──────────────── */

export interface EquipoTratanteDTO {
  id?: number;
  rol: string;
  disciplina?: DisciplinaSalud;
  fechaAsignacion: string;
  fechaFinAsignacion?: string;
  disponibilidad24x7?: boolean;
  contactoEmergencia?: string;
  observacionRol?: string;
  profesional?: ProfesionalRef;
  internacionDomiciliaria?: { id: number };
}

export type DisciplinaSalud =
  | 'MEDICINA'
  | 'ENFERMERIA'
  | 'KINESIOLOGIA'
  | 'FONOAUDIOLOGIA'
  | 'NUTRICION'
  | 'PSICOLOGIA'
  | 'TRABAJO_SOCIAL'
  | 'CUIDADOS_PALIATIVOS';

/* ──────────────── Visitas ──────────────── */

export interface VisitaProgramadaDTO {
  id?: number;
  fechaHoraProgramada: string;
  tipoVisita: TipoVisita;
  estado: EstadoVisita;
  duracionEstimada?: number;
  direccionVisita?: string;
  coordenadasGPS?: string;
  contactoEnSitio?: string;
  telefonoContacto?: string;
  observacionLogistica?: string;
  costo?: number;
  profesionalAsignado?: ProfesionalRef;
  internacionDomiciliaria?: { id: number };
}

export type TipoVisita =
  | 'MEDICA'
  | 'ENFERMERIA'
  | 'KINESIOLOGIA'
  | 'PSICOLOGIA'
  | 'TRABAJO_SOCIAL'
  | 'NUTRICION'
  | 'CONTROL_EQUIPOS'
  | 'EMERGENCIA'
  | 'CONTROL_GENERAL';

export type EstadoVisita =
  | 'PROGRAMADA'
  | 'EN_CURSO'
  | 'REALIZADA'
  | 'CANCELADA_PROFESIONAL'
  | 'CANCELADA_PACIENTE'
  | 'EN_CAMINO'
  | 'REPROGRAMADA'
  | 'VENCIDA';

/* ──────────────── Prescripciones ──────────────── */

export interface PrescripcionContinuaDTO {
  id?: number;
  medicamento?: { id: number; nombreGenerico?: string };
  dosis: string;
  via: string;
  frecuencia: string;
  indicaciones?: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoPrescripcion;
  prescritoPor?: ProfesionalRef;
  administraciones?: AdministracionMedicamentoDTO[];
}

export type EstadoPrescripcion = 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA';

export interface AdministracionMedicamentoDTO {
  id?: number;
  fechaHora: string;
  observacion?: string;
  administradoPor?: ProfesionalRef;
}

/* ──────────────── Signos Vitales ──────────────── */

export interface SignosVitalesDTO {
  id?: number;
  fechaHora: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  saturacionOxigeno?: number;
  frecuenciaRespiratoria?: number;
  glucemia?: number;
  peso?: number;
  observacion?: string;
}

/* ──────────────── Eventos y Notas ──────────────── */

export interface EventoInternacionDTO {
  id?: number;
  fechaHora: string;
  tipo: TipoEventoInternacion;
  descripcion: string;
  accionesRealizadas?: string;
  internacionDomiciliaria?: { id: number };
  registradoPor?: ProfesionalRef;
  generarTicket?: boolean;
}

export type TipoEventoInternacion =
  | 'DETERIORO'
  | 'MEJORIA'
  | 'REINGRESO_EMERGENCIA'
  | 'TRASLADO'
  | 'COMPLICACION'
  | 'ALTA_VOLUNTARIA'
  | 'FALLECIMIENTO'
  | 'ESTABILIZACION'
  | 'CAMBIO_PLAN_CUIDADO'
  | 'INTERCONSULTA'
  | 'CAMBIO_ESTADO'
  | 'OTRO';

export interface NotaEvolucionInternacionDTO {
  id?: number;
  fechaHora: string;
  contenido: string;
  profesional?: ProfesionalRef;
}

/* ──────────────── Timeline ──────────────── */

export interface InternacionTimelineItemDTO {
  tipo: string;
  fecha: string;
  descripcion: string;
  profesional?: string;
  detalle?: string;
}

/* ──────────────── Insumos ──────────────── */

export interface InsumoDomiciliarioDTO {
  id?: number;
  productoId: number;
  productoNombre?: string;
  cantidadRequerida: number;
  cantidadEntregada?: number;
  cantidadConsumida?: number;
  cantidadDevuelta?: number;
  lote?: string;
  fechaVencimiento?: string;
  estado: string;
  internacionId?: number;
}

/* ──────────────── Autorizaciones ──────────────── */

export interface AutorizacionInternacionDTO {
  id?: number;
  numeroAutorizacion?: string;
  fechaEmision?: string;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta: string;
  diasAutorizados?: number;
  topeImporte?: number;
  estado: EstadoAutorizacion;
  motivoRechazo?: string;
  observaciones?: string;
  internacion?: { id: number };
  obraSocial?: { id: number; nombre?: string };
  contratoCobertura?: { id: number };
}

export type EstadoAutorizacion =
  | 'SOLICITADA'
  | 'AUTORIZADA'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'AGOTADA';

export interface AprobarAutorizacionDTO {
  numeroAutorizacion: string;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta: string;
  diasAutorizados?: number;
  topeImporte?: number;
}

export interface RechazarAutorizacionDTO {
  motivo: string;
}

/* ──────────────── Alertas ──────────────── */

export interface AlertaInternacion {
  id?: number;
  tipo: TipoAlertaInternacion;
  severidad: 'INFO' | 'ATENCION' | 'URGENTE';
  mensaje: string;
  fechaGeneracion: string;
  atendida: boolean;
  internacionDomiciliaria?: { id: number };
}

export type TipoAlertaInternacion =
  | 'VISITA_VENCIDA'
  | 'MEDICACION_NO_APLICADA'
  | 'EVENTO_CRITICO'
  | 'PLAN_VENCIDO'
  | 'AUTORIZACION_POR_VENCER'
  | 'AUTORIZACION_VENCIDA'
  | 'INSUMO_VENCIDO';

/* ──────────────── Cambio de Plan ──────────────── */

export interface CambioPlanCuidadoDTO {
  id?: number;
  fechaCambio: string;
  motivo: string;
  planAnteriorJson?: string;
  planNuevoJson?: string;
  profesional?: ProfesionalRef;
}
