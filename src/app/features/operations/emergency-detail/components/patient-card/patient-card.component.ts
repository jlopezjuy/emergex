import { Component, input, output, computed } from '@angular/core';
import { TicketAsistenciaDTO, EpisodioClinicoDTO } from '../../../../../data-access/dto/ticket.dto';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-patient-card',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './patient-card.component.html',
  styleUrl: './patient-card.component.scss',
})
export class PatientCardComponent {
  readonly ticket = input<TicketAsistenciaDTO | null>(null);
  readonly episodios = input<EpisodioClinicoDTO[]>([]);
  readonly canIdentify = input<boolean>(false);

  readonly identify = output<void>();

  readonly isClosedOrCancelled = computed(() => {
    const estado = this.ticket()?.estado;
    return estado === 'CERRADO' || estado === 'CANCELADO' || estado === 'COMPLETADO';
  });

  readonly patientName = computed((): string => {
    const t = this.ticket();
    if (this.isClosedOrCancelled() && t?.pacienteNombreSnapshot) {
      return t.pacienteNombreSnapshot;
    }
    return t?.pacienteDescripcion ?? 'Paciente no identificado';
  });

  readonly patientDni = computed((): string => {
    const t = this.ticket();
    if (this.isClosedOrCancelled() && t?.pacienteDniSnapshot) {
      return t.pacienteDniSnapshot;
    }
    return t?.pacienteDni ?? '—';
  });

  readonly patientInitials = computed((): string => {
    const desc = this.patientName();
    if (!desc) return '??';
    const parts = desc.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase() || '??';
  });

  readonly priorityColor = computed((): string => {
    const p = this.ticket()?.prioridad;
    if (p === 'CRITICA') return 'var(--accent-red)';
    if (p === 'URGENTE') return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  });
}
