export interface PacientePortalPerfilDTO {
  id: number;
  nombreCompleto: string;
  nombre: string;
  dni: string;
  sexo: string;
  edad: number;
  grupoSanguineo: string;
  tallaPeso: string;
  alergias: string[];
  cronicos: string[];
  coberturaPrincipal: string;
  nroCredencial: string;
  vencimientoCredencial: string;
}

export interface FamiliarPortalDTO {
  id: number;
  nombreCompleto: string;
  relacion: string;
  edad: number;
  iniciales: string;
  estado: string;
}

export interface RecetaPortalDTO {
  id: string;
  fecha: string;
  hora: string;
  profesional: string;
  matricula: string;
  medicamentos: {
    nombre: string;
    dosis: string;
    atc: string;
    via: string;
    cie10: string;
    colorSecundario?: boolean;
  }[];
  qrValidoHasta: string;
  qrHash: string;
  qrTransaccion: string;
}

export interface ActividadPortalDTO {
  id: string;
  fechaHora: string;
  tipo: 'turno' | 'factura' | 'estudio' | 'telemedicina' | 'alerta' | 'receta';
  titulo: string;
  subtitulo: string;
  montoOEstado: string;
  color?: 'blue' | 'emerald' | 'cyan' | 'amber' | 'red';
}

export interface TurnoPortalDTO {
  id: string;
  especialidad: string;
  motivo: string;
  fecha: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  doctorNombre: string;
  doctorMatricula: string;
  doctorIniciales: string;
  doctorExperiencia: string;
  consultorio: string;
  indicaciones: string[];
  cobertura: string;
  copago: number;
  tiempoRestante: string;
}

export interface PlanPortalDTO {
  nombre: string;
  descripcion: string;
  estado: string;
  proximoDebito: string;
  cuotaActual: number;
  totalCuotasCobradas: number;
  porcentajeCobrado: number;
}

export interface PacientePortalDashboardDTO {
  perfil: PacientePortalPerfilDTO;
  proximoTurno?: TurnoPortalDTO;
  recetaReciente?: RecetaPortalDTO;
  actividadReciente: ActividadPortalDTO[];
  grupoFamiliar: FamiliarPortalDTO[];
  plan: PlanPortalDTO;
}

export interface SOSRequestDTO {
  pacienteId: number;
  ubicacion: string;
}

export interface SOSResponseDTO {
  exito: boolean;
  unidadAsignada: string;
  tiempoEstimadoMinutos: number;
  baseOperativa: string;
  mensaje: string;
}
