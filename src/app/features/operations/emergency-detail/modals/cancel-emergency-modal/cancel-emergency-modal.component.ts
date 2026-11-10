import { Component, input, output, signal } from '@angular/core';
import { EmergencyApiService } from '../../../../../data-access/api/emergency.api';
import { CancelarTicketRequest } from '../../../../../data-access/dto/ticket.dto';

@Component({
  selector: 'app-cancel-emergency-modal',
  standalone: true,
  templateUrl: './cancel-emergency-modal.component.html',
  styleUrl: './cancel-emergency-modal.component.scss',
})
export class CancelEmergencyModalComponent {
  readonly ticketId = input.required<number>();

  readonly confirmed = output<void>();
  readonly closed = output<void>();

  readonly cancelMotivo = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private emergencyApi: EmergencyApiService) {}

  confirmarCancelacion(): void {
    const motivo = this.cancelMotivo().trim();
    if (!motivo) return;

    this.submitting.set(true);
    this.error.set(null);

    const req: CancelarTicketRequest = { motivo };
    this.emergencyApi.cancelar(this.ticketId(), req).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmed.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Error al cancelar el ticket');
      },
    });
  }

  onCancelKeydown(event: Event): void {
    const kEvent = event as KeyboardEvent;
    if (kEvent.key === 'Enter') {
      kEvent.preventDefault();
      if (this.cancelMotivo().trim()) {
        this.confirmarCancelacion();
      }
    }
  }
}
