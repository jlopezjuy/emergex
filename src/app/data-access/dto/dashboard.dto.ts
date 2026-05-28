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

export interface DashboardComercialDTO {
  totalAfiliadosActivos: number;
  altasMesActual: number;
  ingresosMesActual: number;
  institucionesActivas: number;
  afiliadosPorPlan: Record<string, number>;
  facturasImpagas: number;
  facturasCobradas: number;
  moraFacturas: number;
}
