import { Component, input, output } from '@angular/core';
import { ClinicalEvent } from '../../models/clinical-event.model';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { ClinicalUtils } from '../../../../../core/utils/clinical.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-clinical-evolution-timeline',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './clinical-evolution-timeline.component.html',
  styleUrl: './clinical-evolution-timeline.component.scss',
})
export class ClinicalEvolutionTimelineComponent {
  readonly events = input<ClinicalEvent[]>([]);

  readonly viewDocument = output<any>();

  descargarDocumento(rawData: any): void {
    ClinicalUtils.abrirDocumentoFirmado(rawData);
    this.viewDocument.emit(rawData);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'dd/MM');
  }

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
