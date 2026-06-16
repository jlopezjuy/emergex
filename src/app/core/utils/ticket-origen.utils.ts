import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';

export type OrigenAsistencia = 'INDIVIDUAL' | 'INSTITUCIONAL' | 'EVENTO' | 'PARTICULAR';

export function resolveOrigen(ticket: TicketAsistenciaDTO): OrigenAsistencia {
  const ctx = ticket.contextoCobertura;
  if (!ctx) return 'PARTICULAR';

  if (ctx.modalidadCobertura === 'EVENTO' || ctx.eventoCoberturaId != null) return 'EVENTO';
  if (
    ctx.modalidadCobertura === 'AREA_PROTEGIDA' ||
    ctx.institucionId != null ||
    ctx.miembroInstitucionId != null ||
    ctx.areaProtegidaId != null
  ) return 'INSTITUCIONAL';
  if (ctx.modalidadCobertura === 'INDIVIDUAL_PLAN' || ctx.pacienteId != null) return 'INDIVIDUAL';

  return 'PARTICULAR';
}
