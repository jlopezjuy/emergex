// MOCK — replace with real endpoint GET /api/v1/dashboard/operativo
import { DashboardOperativoDTO } from '../dto/dashboard.dto';

export const MOCK_DASHBOARD: DashboardOperativoDTO = {
  fecha: new Date().toISOString().split('T')[0],
  totalTickets: 24,
  ticketsActivos: 7,
  ticketsCriticos: 3,
  unidadesDisponibles: 5,
  totalUnidades: 12,
  slaPromedio: 87,
  tiempoRespuestaPromedio: 8.4,
  ticketsPorPrioridad: {
    CRITICA: 3,
    URGENTE: 3,
    NORMAL: 1,
  },
};
