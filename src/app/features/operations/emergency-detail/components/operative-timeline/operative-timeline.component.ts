import { Component, input } from '@angular/core';
import { LogEstadoTicketDTO } from '../../../../../data-access/dto/ticket.dto';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-operative-timeline',
  standalone: true,
  imports: [GlassCardComponent, EmptyStateComponent],
  templateUrl: './operative-timeline.component.html',
  styleUrl: './operative-timeline.component.scss',
})
export class OperativeTimelineComponent {
  readonly events = input<LogEstadoTicketDTO[]>([]);

  timelineColor(estado: string): string {
    const map: Record<string, string> = {
      'RECIBIDO':   'var(--accent-red)',
      'DESPACHADO': 'var(--accent-blue)',
      'EN_CAMINO':  'var(--accent-blue)',
      'EN_SITIO':   'var(--accent-amber)',
      'TRASLADO':   'var(--accent-cyan)',
      'ENTREGADO':  'var(--accent-emerald)',
      'COMPLETADO': 'var(--text-muted)',
      'CERRADO':    'var(--text-muted)',
      'CANCELADO':  'var(--accent-red)',
    };
    return map[estado] ?? 'var(--text-muted)';
  }

  timelineLabel(estado: string): string {
    const map: Record<string, string> = {
      'RECIBIDO':   'CREACIÓN',
      'DESPACHADO': 'DESPACHO',
      'EN_CAMINO':  'EN RUTA',
      'EN_SITIO':   'EN SITIO',
      'TRASLADO':   'TRASLADO',
      'ENTREGADO':  'ENTREGADO',
      'COMPLETADO': 'CIERRE',
      'CERRADO':    'CIERRE',
      'CANCELADO':  'CANCELADO',
    };
    return map[estado] ?? estado;
  }

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
