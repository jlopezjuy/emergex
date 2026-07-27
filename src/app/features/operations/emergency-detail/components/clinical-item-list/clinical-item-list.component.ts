import { Component, input, output } from '@angular/core';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-clinical-item-list',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './clinical-item-list.component.html',
  styleUrl: './clinical-item-list.component.scss',
})
export class ClinicalItemListComponent {
  readonly title = input.required<string>();
  readonly items = input<any[]>([]);
  readonly canEdit = input<boolean>(false);
  readonly type = input<'PROCEDIMIENTO' | 'MEDICACION'>('PROCEDIMIENTO');

  readonly add = output<void>();

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
