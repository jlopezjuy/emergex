export interface ContextoCoberturaDTO {
  id?: number;
  modalidadCobertura?: 'INDIVIDUAL_PLAN' | 'AREA_PROTEGIDA' | 'EVENTO' | 'PARTICULAR';
  empresaId?: number;
  institucionId?: number;
  institucionNombre?: string;
  areaProtegidaId?: number;
  areaProtegidaNombre?: string;
  eventoCoberturaId?: number;
  eventoCoberturaNombre?: string;
  contratoCoberturaId?: number;
  pacienteId?: number;
  pacienteNombreCompleto?: string;
  personaAsistidaTransitoriaId?: number;
  miembroInstitucionId?: number;
  miembroInstitucionNombreCompleto?: string;
}

export interface TicketAsistenciaDTO {
  id: number;
  codigo?: string;
  tipoEmergencia?: string;
  prioridad?: 'CRITICA' | 'URGENTE' | 'NORMAL';
  nivelUrgencia?: 'ROJO' | 'AMARILLO' | 'VERDE' | 'AZUL';
  estado?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  pacienteId?: number;
  pacienteDni?: string;
  pacienteNombreSnapshot?: string;
  pacienteDniSnapshot?: string;
  ambulanciaId?: number;
  empresaId?: number;
  fechaCreacion?: string;
  elapsedSeconds?: number;
  slaSeg?: number;
  operador?: string;
  unidadAsignada?: string;
  pacienteDescripcion?: string;
  horaDespacho?: string;
  horaLlegada?: string;
  horaInicioTraslado?: string;
  horaFinTraslado?: string;
  horaCierre?: string;

  // Telemedicina
  tipoAsistencia?: string;
  canal?: string;
  empresaHabilitaTelemedicina?: boolean;
  empresaUrlTelemedicina?: string;

  // Sprint 3 Tarifas y Cargos
  presupuestoAceptado?: number;
  esperaMinutos?: number;
  costoEspera?: number;

  enTraslado?: boolean;
  trasladoFinalizado?: boolean;
  contextoCobertura?: ContextoCoberturaDTO;
  coberturaNombreSnapshot?: string;
}

export interface AltaRapidaRequest {
  tipoAsistencia: 'EMERGENCIA_DOMICILIARIA' | 'ORIENTACION_TELEFONICA' | 'ENFERMERIA_DOMICILIARIA' | 'CONTROL_MEDICO_DOMICILIARIO' | 'TRASLADO_PROGRAMADO' | 'VISITA_DOMICILIARIA';
  nivelUrgencia: 'ROJO' | 'AMARILLO' | 'VERDE' | 'AZUL';
  descripcionSintomas: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  direccionNormalizada?: string;
  geocodingProvider?: string;
  notaDireccion?: string;
  telefonoContacto?: string;
  pacienteId?: number;
  observacion?: string;
  coberturaAlMomentoId?: number | null;

  noAfiliado?: boolean;
  pacienteNombre?: string;
  pacienteApellido?: string;
  pacienteDni?: string;
  pacienteTelefono?: string;
}

export interface CrearTicketRequest {
  tipoAsistencia: 'EMERGENCIA_DOMICILIARIA' | 'ORIENTACION_TELEFONICA' | 'ENFERMERIA_DOMICILIARIA' | 'CONTROL_MEDICO_DOMICILIARIO' | 'TRASLADO_PROGRAMADO' | 'VISITA_DOMICILIARIA';
  nivelUrgencia: 'ROJO' | 'AMARILLO' | 'VERDE' | 'AZUL';
  descripcionSintomas: string;
  direccion?: string;
  notaDireccion?: string;
  latitud?: number;
  longitud?: number;
  direccionNormalizada?: string;
  geocodingProvider?: string;
  // Sujeto
  pacienteId?: number;
  miembroInstitucionId?: number;
  contextoCoberturaId?: number;
  // Cobertura institucional
  institucionId?: number;
  contratoCoberturaId?: number;
  // Persona transitoria inline
  noAfiliado?: boolean;
  pacienteNombre?: string;
  pacienteApellido?: string;
  pacienteDni?: string;
  pacienteTelefono?: string;
  // Traslado preliminar
  tipoTraslado?: 'URBANO' | 'CLINICA' | 'INTERURBANO' | 'INTRANOSOCOMIAL' | 'ALTA_MEDICA';
  // Despacho
  ambulanciaId?: number;
  profesionalId?: number;
  tripulacionIds?: number[];
  notaOperador?: string;
  canal?: 'PRESENCIAL' | 'TELEFONICA' | 'VIDEOLLAMADA';
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
  nota?: string;
  resolucion?: {
    impresionClinica: string;
    tratamientoRealizado?: string;
    requiereTraslado: boolean;
    tipoResolucion?: string;
    destinoTraslado?: string;
    consentimientoTrasladoId?: number;
    urgenciaVitalSinConsentimiento?: boolean;
    notificadoSAME107?: boolean;
    signosVitales?: {
      ta?: string;
      fc?: number;
      fr?: number;
      satO2?: number;
      temp?: number;
      glucemia?: number;
      glasgowOcular?: number;
      glasgowVerbal?: number;
      glasgowMotor?: number;
      glasgowTotal?: number;
      avpu?: 'ALERTA' | 'VOZ' | 'DOLOR' | 'INCONSCIENTE';
    };
  };
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
  glucemia?: number;
  timestamp?: string;
  glasgowOcular?: number;
  glasgowVerbal?: number;
  glasgowMotor?: number;
  glasgowTotal?: number;
  avpu?: string;
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

export interface ConsentimientoInformadoDTO {
  id?: number;
  tipoConsentimiento: 'TRASLADO_A_HOSPITAL' | 'RECHAZO_TRASLADO' | 'TELEMEDICINA' | 'USO_DATOS_PERSONALES' | string;
  fechaFirma: string;
  documentoFirmado?: string;
  estado: 'PENDIENTE' | 'FIRMADO' | 'REVOCADO' | 'VENCIDO' | 'RENOVADO' | string;
  profesionalResponsable: string;
  observacion?: string;
  firmaDigital?: string;
  testigo?: string;
  numeroActo: string;
}

export interface TicketDetalleDTO {
  ticket?: TicketAsistenciaDTO;
  timeline?: LogEstadoTicketDTO[];
  tripulacion?: TripulacionDetalleDTO[];
  signos?: SignosVitalesDTO[];
  procedimientos?: ProcedimientoDTO[];
  medicacion?: MedicacionDTO[];
  resolucion?: any;
}

export interface TripulacionDetalleDTO {
  id?: number;
  nombre?: string;
  rol?: string;
}


export interface ConsultaClinicaDTO {
  id?: number;
  fecha?: string;
  motivoConsulta?: string;
  evolucion?: string;
  procedimientoRealizado?: string;
  observacion?: string;
  tipoConsulta?: string;
}

export interface AtencionFullDTO {
  atencionId?: number;
  turnoId?: number;
  ticketId?: number;
  pacienteId?: number;
  canal?: string;
  tipo?: string;
  estado?: string;
  observaciones?: string;
  notas?: ConsultaClinicaDTO[];
  signos?: any[];
}

export interface AtencionAsistenciaItemDTO {
  atencionId: number;
  turnoId?: number;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface IniciarAtencionDesdeTicketResponse {
  ticketId: number;
  turnoId: number;
  atencionId: number;
  pacienteId?: number;
  episodioClinicoId?: number;
}

export interface TicketEstadoChangedEvent {
  type: 'TicketEstadoChanged';
  empresaId?: number;
  ticketId: number;
  estadoAnterior?: string;
  estadoNuevo: string;
  timestamp?: string;
}

export interface AsignacionEstadoChangedEvent {
  type: 'AsignacionEstadoChanged';
  empresaId?: number;
  asignacionId?: number;
  ticketId: number;
  estadoAnterior?: string;
  estadoNuevo: string;
  actorUserId?: number;
  timestamp?: string;
}

export interface HospitalDTO {
  id: number;
  nombre: string;
  cuit?: string;
  tipo?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  codigoEstablecimiento?: string;
  activo?: boolean;
}

export interface EntregaHospitalariaDTO {
  id?: number;
  ticketId?: number;
  hospitalId?: number;
  hospitalNombre?: string;
  receptorNombre: string;
  receptorMatricula?: string;
  servicioReceptor?: string;
  horaEntrega: string;
  condicionEntregaGlasgow?: number;
  condicionEntregaPa?: string;
  condicionEntregaFc?: number;
  condicionEntregaSatO2?: number;
  firmaReceptor?: string;
  archivoAdjuntoActa?: string;
}

export interface TelemedicinaSalaResponseDTO {
  urlSala: string;
  expiresAt: string;
  consentimientoRequerido: boolean;
}

export interface CoberturaAsistenciaSnapshotDTO {
  id?: number;
  pacienteNombre?: string;
  pacienteDni?: string;
  tipoCobertura?: string;
  planNombre?: string;
  institucionNombre?: string;
  contratoCodigo?: string;
  requiereAutorizacion?: boolean;
  requiereCopago?: boolean;
  montoCopago?: number;
  esFacturable?: boolean;
  prestacionesIncluidasSnapshot?: string;
  topeAtencionesMensuales?: number;
  snapshotTomadoEl?: string;
}

export interface ContactoDespachoRequestDTO {
  profesionalId?: number;
  ambulanciaId?: number;
  telefono: string;
  canal: string;
  resultado: string;
  observacion?: string;
}
