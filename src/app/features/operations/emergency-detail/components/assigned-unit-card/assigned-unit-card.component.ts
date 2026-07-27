import { Component, input, output } from '@angular/core';
import { TicketAsistenciaDTO } from '../../../../../data-access/dto/ticket.dto';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-assigned-unit-card',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './assigned-unit-card.component.html',
  styleUrl: './assigned-unit-card.component.scss',
})
export class AssignedUnitCardComponent {
  readonly ticket = input<TicketAsistenciaDTO | null>(null);
  readonly tripulacion = input<any[]>([]);
  readonly canDispatch = input<boolean>(false);
  readonly canChangeUnit = input<boolean>(false);

  readonly dispatch = output<void>();
  readonly changeUnit = output<void>();

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
