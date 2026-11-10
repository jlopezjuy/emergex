import { Component, input, computed } from '@angular/core';
import { DonutChartComponent, DonutSegment } from '../../charts/donut-chart/donut-chart.component';
import { FlotaDashboardDTO } from '../../../../data-access/dto/ambulancia.dto';

@Component({
  selector: 'emx-fleet-status-donut',
  standalone: true,
  imports: [DonutChartComponent],
  template: `
    <div class="flex items-center gap-6">
      <emx-donut-chart
        [size]="140"
        [strokeWidth]="14"
        [segments]="segments()"
        [centerLabel]="centerLabel()"
        centerSub="total"
      />
      <div class="flex flex-col gap-2 text-xs">
        @for (leg of legend(); track leg.label) {
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="leg.color"></span>
            <span style="color: var(--text-secondary);">{{ leg.label }}</span>
            <span class="font-mono font-semibold ml-auto pl-4" style="color: var(--text-primary);">{{ leg.value }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class FleetStatusDonutComponent {
  dashboard = input<FlotaDashboardDTO | null>(null);

  segments = computed((): DonutSegment[] => {
    const d = this.dashboard();
    if (!d) return [];
    return [
      { value: d.disponibles, color: '#10B981', label: 'Disponible' },
      { value: d.enRuta, color: '#3B82F6', label: 'En ruta' },
      { value: d.enSitio, color: '#F59E0B', label: 'En sitio' },
      { value: d.traslado, color: '#22D3EE', label: 'Traslado' },
      { value: d.mantenimiento, color: '#64748B', label: 'Mantenim.' },
    ].filter((s) => s.value > 0);
  });

  centerLabel = computed(() => String(this.dashboard()?.totalUnidades ?? '—'));

  legend = computed(() => {
    const d = this.dashboard();
    if (!d) return [];
    return [
      { label: 'Disponible', value: d.disponibles, color: '#10B981' },
      { label: 'En ruta', value: d.enRuta, color: '#3B82F6' },
      { label: 'En sitio', value: d.enSitio, color: '#F59E0B' },
      { label: 'Traslado', value: d.traslado, color: '#22D3EE' },
      { label: 'Mantenim.', value: d.mantenimiento, color: '#64748B' },
    ];
  });
}
