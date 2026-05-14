import { Component } from '@angular/core';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { DonutChartComponent } from '../../shared/components/charts/donut-chart/donut-chart.component';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';
import { BarsChartComponent } from '../../shared/components/charts/bars-chart/bars-chart.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    GlassCardComponent,
    DonutChartComponent,
    SparklineComponent,
    BarsChartComponent,
    KpiCardComponent,
  ],
  template: `
    <div class="p-6 flex flex-col gap-6 overflow-y-auto h-full">
      <div>
        <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Analítica Operativa</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-muted);">Métricas del centro de operaciones</p>
      </div>

      <!-- KPIs row -->
      <div class="grid grid-cols-4 gap-4">
        <emx-kpi-card label="Total tickets" [value]="24" />
        <emx-kpi-card label="SLA cumplido" [value]="'87%'" accentColor="emerald" />
        <emx-kpi-card label="T. resp. prom." [value]="'8.4m'" accentColor="amber" />
        <emx-kpi-card label="Km recorridos" [value]="342" accentColor="blue" />
      </div>

      <!-- Charts grid -->
      <div class="grid grid-cols-3 gap-6">
        <!-- Donut: prioridades -->
        <emx-glass-card>
          <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">Por prioridad</h2>
          <emx-donut-chart
            [size]="120"
            [strokeWidth]="12"
            [segments]="[
              { value: 3, color: '#EF4444', label: 'Crítica' },
              { value: 3, color: '#F59E0B', label: 'Urgente' },
              { value: 1, color: '#10B981', label: 'Normal' }
            ]"
            centerLabel="7"
            centerSub="activas"
          />
        </emx-glass-card>

        <!-- Sparkline: tendencia -->
        <emx-glass-card>
          <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">Tendencia (7 días)</h2>
          <emx-sparkline
            [values]="[12, 8, 15, 11, 19, 14, 24]"
            color="#22D3EE"
            [width]="200"
            [height]="60"
          />
          <div class="flex justify-between mt-2">
            @for (day of days; track day) {
              <span class="font-mono text-xs" style="color: var(--text-muted);">{{ day }}</span>
            }
          </div>
        </emx-glass-card>

        <!-- Bars: por hora -->
        <emx-glass-card>
          <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">Distribución horaria</h2>
          <emx-bars-chart
            [values]="[2, 1, 0, 1, 3, 5, 8, 12, 10, 9, 7, 6, 8, 11, 10, 9, 12, 15, 13, 9, 7, 5, 3, 2]"
            [labels]="hourLabels"
            [width]="200"
            [height]="80"
          />
        </emx-glass-card>
      </div>
    </div>
  `,
})
export class AnalyticsComponent {
  readonly days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly hourLabels = Array.from({ length: 24 }, (_, i) =>
    i % 6 === 0 ? `${String(i).padStart(2, '0')}` : '',
  );
}
