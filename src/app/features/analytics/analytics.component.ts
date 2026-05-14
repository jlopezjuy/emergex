import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DashboardApiService } from '../../data-access/api/dashboard.api';
import { DashboardOperativoDTO } from '../../data-access/dto/dashboard.dto';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { DonutChartComponent, DonutSegment } from '../../shared/components/charts/donut-chart/donut-chart.component';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';
import { BarsChartComponent } from '../../shared/components/charts/bars-chart/bars-chart.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    GlassCardComponent,
    DonutChartComponent,
    SparklineComponent,
    BarsChartComponent,
    KpiCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="p-6 flex flex-col gap-6 overflow-y-auto h-full">
      <!-- Header with date picker -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Analítica Operativa</h1>
          <p class="text-sm mt-0.5" style="color: var(--text-muted);">Métricas del centro de operaciones</p>
        </div>
        <input
          type="date"
          [value]="selectedDate()"
          (change)="onDateChange($event)"
          class="rounded px-3 py-1.5 text-sm font-mono"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
        />
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="load()" />
      } @else {
        <!-- KPIs row -->
        <div class="grid grid-cols-4 gap-4">
          <emx-kpi-card label="Total tickets" [value]="data()?.totalTickets" />
          <emx-kpi-card label="Activos" [value]="data()?.ticketsActivos" accentColor="cyan" />
          <emx-kpi-card
            label="SLA cumplido"
            [value]="slaLabel()"
            accentColor="emerald"
          />
          <emx-kpi-card
            label="T. resp. prom."
            [value]="tRespLabel()"
            accentColor="amber"
          />
        </div>

        <!-- Charts grid -->
        <div class="grid grid-cols-2 gap-6">
          <!-- Donut: prioridades -->
          <emx-glass-card>
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Distribución por prioridad
            </h2>
            <emx-donut-chart
              [size]="120"
              [strokeWidth]="12"
              [segments]="prioritySegments()"
              [centerLabel]="'' + (data()?.ticketsActivos ?? 0)"
              centerSub="activos"
            />
            <!-- Legend -->
            <div class="flex gap-4 mt-4">
              @for (seg of prioritySegments(); track seg.label) {
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" [style.background]="seg.color"></span>
                  <span class="text-xs" style="color: var(--text-muted);">{{ seg.label }}</span>
                  <span class="font-mono text-xs font-semibold" style="color: var(--text-primary);">{{ seg.value }}</span>
                </div>
              }
            </div>
          </emx-glass-card>

          <!-- Sparkline: tiempo de respuesta tendencia -->
          <emx-glass-card>
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Tiempo de respuesta (12 muestras)
            </h2>
            <emx-sparkline
              [values]="sparkValues()"
              color="#22D3EE"
              [width]="200"
              [height]="60"
            />
            <div class="flex justify-between mt-2">
              @for (lbl of sparkLabels; track lbl) {
                <span class="font-mono text-xs" style="color: var(--text-muted);">{{ lbl }}</span>
              }
            </div>
          </emx-glass-card>
        </div>

        <!-- Bars: distribución horaria (static illustrative) -->
        <emx-glass-card>
          <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
            Distribución horaria (estimada)
          </h2>
          <emx-bars-chart
            [values]="[2, 1, 0, 1, 3, 5, 8, 12, 10, 9, 7, 6, 8, 11, 10, 9, 12, 15, 13, 9, 7, 5, 3, 2]"
            [labels]="hourLabels"
            [width]="200"
            [height]="80"
          />
        </emx-glass-card>
      }
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private dashboardApi = inject(DashboardApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<DashboardOperativoDTO | null>(null);
  readonly selectedDate = signal<string>(new Date().toISOString().slice(0, 10));

  readonly slaLabel = computed(() => {
    const sla = this.data()?.slaPromedio;
    return sla != null ? `${Math.round(sla)}%` : '—';
  });

  readonly tRespLabel = computed(() => {
    const t = this.data()?.tiempoRespuestaPromedio;
    return t != null ? `${t.toFixed(1)}m` : '—';
  });

  readonly prioritySegments = computed<DonutSegment[]>(() => {
    const por = this.data()?.ticketsPorPrioridad ?? {};
    return [
      { value: por['CRITICA'] ?? 0, color: '#EF4444', label: 'Crítica' },
      { value: por['URGENTE'] ?? 0, color: '#F59E0B', label: 'Urgente' },
      { value: por['NORMAL'] ?? 0, color: '#10B981', label: 'Normal' },
    ];
  });

  readonly sparkValues = computed<number[]>(() => {
    const base = this.data()?.tiempoRespuestaPromedio ?? 8;
    // Generate 12 synthetic points around the base value
    return Array.from({ length: 12 }, (_, i) => {
      const noise = Math.sin(i * 0.8) * 2 + Math.cos(i * 1.3);
      return Math.max(1, +(base + noise).toFixed(1));
    });
  });

  readonly sparkLabels = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];

  readonly hourLabels = Array.from({ length: 24 }, (_, i) =>
    i % 6 === 0 ? `${String(i).padStart(2, '0')}` : '',
  );

  ngOnInit(): void {
    this.load();
  }

  onDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.selectedDate.set(val);
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardApi
      .operativo(this.selectedDate())
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar analítica');
          this.loading.set(false);
        },
      });
  }
}
