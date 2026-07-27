import { Component, input, output, computed } from '@angular/core';
import { TicketAsistenciaDTO, TelemedicinaSalaResponseDTO } from '../../../../../data-access/dto/ticket.dto';

@Component({
  selector: 'app-emergency-header',
  standalone: true,
  templateUrl: './emergency-header.component.html',
  styleUrl: './emergency-header.component.scss',
})
export class EmergencyHeaderComponent {
  readonly ticket = input<TicketAsistenciaDTO | null>(null);
  readonly canDispatch = input<boolean>(false);
  readonly canMarkEnCamino = input<boolean>(false);
  readonly canMarkEnSitio = input<boolean>(false);
  readonly canStartTransfer = input<boolean>(false);
  readonly canFinishTransfer = input<boolean>(false);
  readonly canClose = input<boolean>(false);
  readonly canStartTelemedicine = input<boolean>(false);
  readonly telemedicinaSala = input<TelemedicinaSalaResponseDTO | null>(null);
  readonly iniciandoTelemedicina = input<boolean>(false);

  readonly dispatch = output<void>();
  readonly enCamino = output<void>();
  readonly enSitio = output<void>();
  readonly iniciarTraslado = output<void>();
  readonly finalizarTraslado = output<void>();
  readonly cerrar = output<void>();
  readonly cancelar = output<void>();
  readonly iniciarTeleconsulta = output<void>();
  readonly abrirSala = output<void>();
  readonly goBack = output<void>();

  readonly priorityBadgeClass = computed((): string => {
    const p = this.ticket()?.prioridad;
    if (p === 'CRITICA') return 'badge badge--critical';
    if (p === 'URGENTE') return 'badge badge--urgent';
    return 'badge badge--stable';
  });
}
