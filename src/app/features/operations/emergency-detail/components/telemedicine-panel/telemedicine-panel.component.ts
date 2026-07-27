import { Component, input, output } from '@angular/core';
import { TelemedicinaSalaResponseDTO } from '../../../../../data-access/dto/ticket.dto';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-telemedicine-panel',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './telemedicine-panel.component.html',
  styleUrl: './telemedicine-panel.component.scss',
})
export class TelemedicinePanelComponent {
  readonly sala = input<TelemedicinaSalaResponseDTO | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly canStart = input<boolean>(false);

  readonly iniciar = output<void>();
  readonly unirse = output<void>();

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
