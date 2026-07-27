import { Component, input, output, computed } from '@angular/core';
import { SignosVitalesDTO } from '../../../../../data-access/dto/ticket.dto';
import { VitalSignsUtils } from '../../../../../core/utils/vital-signs.utils';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';
import { SparklineComponent } from '../../../../../shared/components/charts/sparkline/sparkline.component';

@Component({
  selector: 'app-vital-signs-card',
  standalone: true,
  imports: [GlassCardComponent, SparklineComponent],
  templateUrl: './vital-signs-card.component.html',
  styleUrl: './vital-signs-card.component.scss',
})
export class VitalSignsCardComponent {
  readonly signos = input<SignosVitalesDTO[]>([]);
  readonly canEdit = input<boolean>(false);
  readonly showHistory = input<boolean>(false);

  readonly addSignos = output<void>();

  readonly lastSigno = computed((): SignosVitalesDTO | null => {
    const arr = this.signos();
    return arr.length > 0 ? (arr[arr.length - 1] ?? null) : null;
  });

  readonly sparkFC = computed((): number[] =>
    this.signos().map((s) => s.frecuenciaCardiaca ?? 0).filter((v) => v > 0)
  );
  readonly sparkSpO2 = computed((): number[] =>
    this.signos().map((s) => s.saturacionO2 ?? 0).filter((v) => v > 0)
  );
  readonly sparkPAS = computed((): number[] =>
    this.signos().map((s) => s.presionSistolica ?? 0).filter((v) => v > 0)
  );
  readonly sparkTemp = computed((): number[] =>
    this.signos().map((s) => s.temperatura ?? 0).filter((v) => v > 0)
  );

  vitalColor(value: number | undefined, normalMin: number, normalMax: number): string {
    return VitalSignsUtils.vitalColor(value, normalMin, normalMax);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'dd/MM HH:mm');
  }

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
