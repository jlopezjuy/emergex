export interface AsistenciaDashboardHistorialRequest {
  from?: string;
  to?: string;
  estado?: string;
  prioridad?: string;
  tipoAsistencia?: string;
  ambulanciaId?: number;
  profesionalId?: number;
  pacienteQuery?: string;
  zona?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AsistenciaDashboardHistorialResponse {
  kpis: {
    totalAsistencias: number;
    asistenciasHoy: number;
    asistenciasMes: number;
    asistenciasPendientes: number;
    asistenciasEnCurso: number;
    asistenciasFinalizadas: number;
    asistenciasCriticas: number;
    asistenciasUrgentes: number;
    tiempoPromedioRespuestaMin: number;
    tiempoPromedioCierreMin: number;
    reincidenciasPacientes: number;
  };
  serieAsistencias: { fecha: string; total: number }[];
  distribucionEstados: { label: string; total: number }[];
  distribucionPrioridades: { label: string; total: number }[];
  distribucionTipos: { label: string; total: number }[];
  distribucionZonas: { label: string; total: number }[];
  rankingMoviles: { ambulanciaId?: number; movil: string; totalAsistencias: number }[];
  historial: {
    items: HistorialAsistenciaItem[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
  };
}

export interface HistorialAsistenciaItem {
  id: number;
  numeroTicket: string;
  fechaHora: string;
  paciente: string;
  antecedentes?: string;
  tipoAsistencia: string;
  prioridad: string;
  estado: string;
  ambulanciaId?: number;
  movil?: string;
  tiempoRespuestaMin?: number;
  tiempoCierreMin?: number;
  direccion?: string;
  zona?: string;
}
