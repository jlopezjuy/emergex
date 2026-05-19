export interface DashboardOperativoDTO {
  fecha?: string;
  totalTickets?: number;
  ticketsActivos?: number;
  ticketsCriticos?: number;
  unidadesDisponibles?: number;
  totalUnidades?: number;
  slaPromedio?: number;
  ticketsPorPrioridad?: Record<string, number>;
  tiempoRespuestaPromedio?: number;
  tiemposRespuestaHistorico?: number[];
  cargaPorHora?: Record<string, number>;
}
