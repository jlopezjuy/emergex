import { Component, computed, input } from '@angular/core';
import { LogEstadoTicketDTO, TicketAsistenciaDTO } from '../../../../../data-access/dto/ticket.dto';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';

interface TimelineEntry {
  id: string;
  estado: string;
  label: string;
  occurrenceTime?: string;
  recordedTime?: string;
  origin?: string;
  actor?: string;
  note?: string;
  isTransition: boolean;
}

const STATE_METADATA: Record<string, { label: string; color: string }> = {
  RECIBIDO: { label: 'CREACIÓN', color: 'var(--accent-red)' },
  DESPACHADO: { label: 'DESPACHO', color: 'var(--accent-blue)' },
  EN_CAMINO: { label: 'EN CAMINO', color: 'var(--accent-blue)' },
  EN_SITIO: { label: 'EN SITIO', color: 'var(--accent-amber)' },
  HOSPITALIZACION_PENDIENTE: { label: 'HOSPITALIZACIÓN PENDIENTE', color: 'var(--accent-amber)' },
  PENDIENTE_AUDITORIA_MEDICA: { label: 'PENDIENTE DE AUDITORÍA MÉDICA', color: 'var(--accent-amber)' },
  AUDITADO_OK: { label: 'AUDITORÍA APROBADA', color: 'var(--accent-emerald)' },
  OBSERVADO: { label: 'AUDITORÍA OBSERVADA', color: 'var(--accent-red)' },
  MEDICO_NO_DISPONIBLE: { label: 'MÉDICO NO DISPONIBLE', color: 'var(--accent-red)' },
  COMPLETADO: { label: 'CIERRE ASISTENCIAL', color: 'var(--text-muted)' },
  CANCELADO: { label: 'CANCELACIÓN', color: 'var(--accent-red)' },
  ENTREGA_HOSPITALARIA: { label: 'ENTREGA HOSPITALARIA ACEPTADA', color: 'var(--accent-emerald)' },
  HITO_OPERATIVO: { label: 'HITO OPERATIVO', color: 'var(--accent-cyan)' },
};

@Component({
  selector: 'app-operative-timeline',
  standalone: true,
  imports: [GlassCardComponent, EmptyStateComponent],
  templateUrl: './operative-timeline.component.html',
  styleUrl: './operative-timeline.component.scss',
})
export class OperativeTimelineComponent {
  readonly events = input<LogEstadoTicketDTO[]>([]);
  readonly ticket = input<TicketAsistenciaDTO | null>(null);

  readonly timelineEntries = computed<TimelineEntry[]>(() =>
    this.events()
      .map((event, index) => ({ entry: this.toLogEntry(event), index }))
      .sort((left, right) => this.timestamp(left.entry) - this.timestamp(right.entry) || left.index - right.index)
      .map(({ entry }) => entry)
  );

  timelineColor(estado: string): string {
    return STATE_METADATA[estado]?.color ?? 'var(--text-muted)';
  }

  formatTime(iso?: string): string {
    return iso ? DateUtils.format(iso, 'HH:mm') : '—';
  }

  private toLogEntry(event: LogEstadoTicketDTO): TimelineEntry {
    const isTransition = !!event.estadoAnterior && event.estadoAnterior !== event.estado;
    const recordedTime = this.validTimestamp(event.fecha);
    const eventTime = this.validTimestamp(event.fechaEvento);
    const occurrenceTime = eventTime ?? recordedTime;
    const milestone = !isTransition && event.estado === 'EN_SITIO';
    return {
      id: String(event.id),
      estado: milestone ? 'HITO_OPERATIVO' : event.estado,
      label: milestone ? this.milestoneLabel(occurrenceTime) : (STATE_METADATA[event.estado]?.label ?? event.estado.replaceAll('_', ' ')),
      occurrenceTime,
      recordedTime: eventTime && recordedTime && eventTime !== recordedTime ? recordedTime : undefined,
      origin: event.origenHorario,
      actor: event.operador,
      note: event.notas,
      isTransition,
    };
  }

  private milestoneLabel(occurrenceTime?: string): string {
    const ticket = this.ticket();
    if (occurrenceTime && occurrenceTime === this.validTimestamp(ticket?.horaInicioTraslado)) return 'INICIO DE TRASLADO';
    if (occurrenceTime && occurrenceTime === this.validTimestamp(ticket?.horaFinTraslado)) return 'ARRIBO HOSPITALARIO';
    return STATE_METADATA['HITO_OPERATIVO'].label;
  }

  private timestamp(entry: TimelineEntry): number {
    const value = entry.occurrenceTime ?? entry.recordedTime;
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }

  private validTimestamp(value?: string): string | undefined {
    return value && !Number.isNaN(Date.parse(value)) ? value : undefined;
  }
}
