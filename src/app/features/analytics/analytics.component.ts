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

type Period = '7d' | '30d' | '90d';

interface TopType { tipo: string; count: number; pct: number; }
interface TopUnit { id: string; tipo: string; servicios: number; pct: number; }

const TOP_TYPES: TopType[] = [
  { tipo: 'Paro cardiorrespiratorio', count: 23, pct: 100 },
  { tipo: 'Trauma craneoencefálico', count: 18, pct: 78 },
  { tipo: 'Accidente vascular cerebral', count: 14, pct: 61 },
  { tipo: 'Intoxicación aguda', count: 11, pct: 48 },
  { tipo: 'Disnea severa', count: 9, pct: 39 },
  { tipo: 'Dolor torácico', count: 7, pct: 30 },
];

const TOP_UNITS: TopUnit[] = [
  { id: 'U-07', tipo: 'ALS', servicios: 31, pct: 100 },
  { id: 'U-03', tipo: 'ALS', servicios: 27, pct: 87 },
  { id: 'U-12', tipo: 'BLS', servicios: 24, pct: 77 },
  { id: 'U-01', tipo: 'ALS', servicios: 19, pct: 61 },
  { id: 'U-09', tipo: 'BLS', servicios: 15, pct: 48 },
];

const HOUR_VALUES = [2, 1, 0, 1, 3, 5, 8, 12, 10, 9, 7, 6, 8, 11, 10, 9, 12, 15, 13, 9, 7, 5, 3, 2];

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
    <div class="flex flex-col overflow-y-auto h-full">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Analítica Operativa</h1>
          <p class="text-sm mt-0.5" style="color: var(--text-muted);">Métricas del centro de operaciones</p>
        </div>
        <div class="flex items-center gap-4">
          <!-- Period tabs -->
          <div class="flex" style="border-bottom: 1px solid var(--border-glass);">
            @for (tab of periodTabs; track tab.value) {
              <button
                (click)="activePeriod.set(tab.value)"
                class="px-4 py-2 text-sm font-mono transition-colors"
                [style]="activePeriod() === tab.value
                  ? 'color: var(--accent-cyan); border-bottom: 2px solid var(--accent-cyan); margin-bottom: -1px;'
                  : 'color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -1px;'"
              >{{ tab.label }}</button>
            }
          </div>
          <!-- Date picker -->
          <input
            type="date"
            [value]="selectedDate()"
            (change)="onDateChange($event)"
            class="rounded px-3 py-1.5 text-sm font-mono"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
          />
        </div>
      </div>

      @if (loading()) {
        <div class="px-6"><emx-loading-state /></div>
      } @else if (error()) {
        <div class="px-6"><emx-error-state [message]="error()!" (retry)="load()" /></div>
      } @else {
        <!-- KPIs row -->
        <div class="grid grid-cols-4 gap-4 px-6 pb-4">
          <emx-kpi-card label="Total tickets" [value]="data()?.totalTickets" />
          <emx-kpi-card label="Activos" [value]="data()?.ticketsActivos" accentColor="cyan" />
          <emx-kpi-card label="SLA cumplido" [value]="slaLabel()" accentColor="emerald" />
          <emx-kpi-card label="T. resp. prom." [value]="tRespLabel()" accentColor="amber" />
        </div>

        <!-- Charts grid: 2-col fixed -->
        <div class="grid gap-4 px-6 pb-6" style="grid-template-columns: repeat(2, 1fr);">

          <!-- Chart 1: Tiempo de respuesta (wide, col-span-2) -->
          <emx-glass-card class="col-span-2">
            <div class="flex items-start justify-between mb-3">
              <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                Tiempo de respuesta
              </h2>
              <span
                class="font-mono text-xs px-2 py-0.5 rounded"
                [style]="tRespDelta() >= 0
                  ? 'color: var(--accent-amber); background: color-mix(in srgb, var(--accent-amber) 12%, transparent);'
                  : 'color: var(--accent-emerald); background: color-mix(in srgb, var(--accent-emerald) 12%, transparent);'"
              >{{ tRespDeltaLabel() }}</span>
            </div>
            <div class="flex items-end gap-6">
              <span class="font-mono text-3xl font-bold" style="color: var(--text-primary);">
                {{ tRespKpi() }} min
              </span>
              <div class="flex-1">
                <emx-sparkline
                  [values]="sparkValues()"
                  color="#22D3EE"
                  [width]="400"
                  [height]="56"
                />
              </div>
            </div>
          </emx-glass-card>

          <!-- Chart 2: Cumplimiento SLA (1 col) -->
          <emx-glass-card>
            <div class="flex items-start justify-between mb-3">
              <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                Cumplimiento SLA
              </h2>
              <span
                class="font-mono text-xs px-2 py-0.5 rounded font-semibold"
                [style]="slaBadgeStyle()"
              >{{ slaBadgeLabel() }}</span>
            </div>
            <span class="font-mono text-3xl font-bold" style="color: var(--text-primary);">
              {{ slaKpi() }}%
            </span>
            <div class="mt-3">
              <emx-sparkline
                [values]="slaSparkValues()"
                color="#10B981"
                [width]="260"
                [height]="48"
              />
            </div>
          </emx-glass-card>

          <!-- Chart 4: Distribución por prioridad (1 col) -->
          <emx-glass-card>
            <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">
              Distribución por prioridad
            </h2>
            <emx-donut-chart
              [size]="110"
              [strokeWidth]="12"
              [segments]="prioritySegments()"
              [centerLabel]="'' + (data()?.ticketsActivos ?? 0)"
              centerSub="activos"
            />
            <div class="flex flex-wrap gap-3 mt-4">
              @for (seg of prioritySegments(); track seg.label) {
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="seg.color"></span>
                  <span class="text-xs" style="color: var(--text-muted);">{{ seg.label }}</span>
                  <span class="font-mono text-xs font-semibold" style="color: var(--text-primary);">
                    {{ seg.value }}
                    <span class="font-normal" style="color: var(--text-muted);">
                      ({{ priorityPct(seg.value) }}%)
                    </span>
                  </span>
                </div>
              }
            </div>
          </emx-glass-card>

          <!-- Chart 3: Volumen por hora (wide, col-span-2) -->
          <emx-glass-card class="col-span-2">
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Volumen por hora (18–21hs peak)
            </h2>
            <emx-bars-chart
              [values]="hourValues"
              [labels]="hourLabels"
              [width]="700"
              [height]="90"
            />
          </emx-glass-card>

          <!-- Chart 5: Top tipos de emergencia (wide, col-span-2) -->
          <emx-glass-card class="col-span-2">
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Top tipos de emergencia
            </h2>
            <div class="flex flex-col gap-3">
              @for (row of topTypes; track row.tipo) {
                <div class="flex items-center gap-3">
                  <span class="flex-1 text-sm font-medium truncate" style="color: var(--text-primary);">
                    {{ row.tipo }}
                  </span>
                  <div
                    style="width: 160px; height: 4px; background: var(--surface-glass); border-radius: 2px; flex-shrink: 0;"
                  >
                    <div
                      style="height: 4px; border-radius: 2px; transition: width 0.3s ease;"
                      [style.width.%]="row.pct"
                      [style.background]="typeBarColor(row.pct)"
                    ></div>
                  </div>
                  <span class="font-mono text-sm w-6 text-right" style="color: var(--text-secondary);">
                    {{ row.count }}
                  </span>
                  <span class="font-mono text-xs w-10 text-right" style="color: var(--text-muted);">
                    {{ row.pct }}%
                  </span>
                </div>
              }
            </div>
          </emx-glass-card>

          <!-- Chart 6: Top unidades operativas (1 col) -->
          <emx-glass-card class="col-span-2">
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Top unidades operativas
            </h2>
            <div class="flex flex-col gap-3">
              @for (unit of topUnits; track unit.id; let i = $index) {
                <div class="flex items-center gap-3">
                  <span
                    class="font-mono text-base font-bold"
                    style="width: 28px; flex-shrink: 0; color: var(--text-muted);"
                  >#{{ i + 1 }}</span>
                  <span
                    class="font-mono font-semibold text-sm"
                    style="color: var(--accent-cyan); width: 40px; flex-shrink: 0;"
                  >{{ unit.id }}</span>
                  <span
                    class="font-mono text-xs px-1.5 py-0.5 rounded"
                    style="background: var(--surface-glass); color: var(--text-muted); flex-shrink: 0;"
                  >{{ unit.tipo }}</span>
                  <div
                    style="flex: 1; height: 4px; background: var(--surface-glass); border-radius: 2px;"
                  >
                    <div
                      style="height: 4px; border-radius: 2px; background: var(--accent-cyan); transition: width 0.3s ease;"
                      [style.width.%]="unit.pct"
                    ></div>
                  </div>
                  <span class="font-mono text-sm" style="color: var(--text-secondary); flex-shrink: 0;">
                    {{ unit.servicios }} servicios
                  </span>
                </div>
              }
            </div>
          </emx-glass-card>

        </div>
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
  readonly activePeriod = signal<Period>('30d');

  readonly periodTabs: { value: Period; label: string }[] = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
  ];

  readonly topTypes: readonly TopType[] = TOP_TYPES;
  readonly topUnits: readonly TopUnit[] = TOP_UNITS;
  readonly hourValues = HOUR_VALUES;

  // — KPI labels —
  readonly slaLabel = computed(() => {
    const sla = this.data()?.slaPromedio;
    return sla != null ? `${Math.round(sla)}%` : '—';
  });

  readonly tRespLabel = computed(() => {
    const t = this.data()?.tiempoRespuestaPromedio;
    return t != null ? `${t.toFixed(1)}m` : '—';
  });

  // — Chart 1: Tiempo de respuesta —
  readonly tRespKpi = computed(() => {
    const t = this.data()?.tiempoRespuestaPromedio ?? 8.3;
    return t.toFixed(1);
  });

  readonly tRespDelta = computed(() => 0.4); // mock delta

  readonly tRespDeltaLabel = computed(() => {
    const d = this.tRespDelta();
    return d >= 0 ? `+${d.toFixed(1)} min` : `${d.toFixed(1)} min`;
  });

  readonly sparkValues = computed<number[]>(() => {
    const base = this.data()?.tiempoRespuestaPromedio ?? 8.3;
    return Array.from({ length: 24 }, (_, i) => {
      const noise = Math.sin(i * 0.8) * 2 + Math.cos(i * 1.3);
      return Math.max(1, +(base + noise).toFixed(1));
    });
  });

  // — Chart 2: Cumplimiento SLA —
  readonly slaKpi = computed(() => {
    const sla = this.data()?.slaPromedio ?? 87.2;
    return sla.toFixed(1);
  });

  readonly slaSparkValues = computed<number[]>(() => {
    const base = this.data()?.slaPromedio ?? 87.2;
    return Array.from({ length: 24 }, (_, i) => {
      const noise = Math.sin(i * 0.6) * 5 + Math.cos(i * 1.1) * 3;
      return Math.min(100, Math.max(0, +(base + noise).toFixed(1)));
    });
  });

  slaBadgeStyle(): string {
    const sla = parseFloat(this.slaKpi());
    if (sla >= 80) return 'color: var(--accent-emerald); background: color-mix(in srgb, var(--accent-emerald) 12%, transparent);';
    if (sla >= 60) return 'color: var(--accent-amber); background: color-mix(in srgb, var(--accent-amber) 12%, transparent);';
    return 'color: var(--accent-red); background: color-mix(in srgb, var(--accent-red) 12%, transparent);';
  }

  slaBadgeLabel(): string {
    const sla = parseFloat(this.slaKpi());
    if (sla >= 80) return 'Óptimo';
    if (sla >= 60) return 'Aceptable';
    return 'Crítico';
  }

  // — Chart 4: Donut prioridades —
  readonly prioritySegments = computed<DonutSegment[]>(() => {
    const por = this.data()?.ticketsPorPrioridad ?? {};
    return [
      { value: por['CRITICA'] ?? 8,  color: 'var(--accent-red)',     label: 'Crítica' },
      { value: por['URGENTE'] ?? 15, color: 'var(--accent-amber)',   label: 'Urgente' },
      { value: por['NORMAL'] ?? 21,  color: 'var(--accent-emerald)', label: 'Normal' },
    ];
  });

  priorityPct(value: number): number {
    const total = this.prioritySegments().reduce((s, seg) => s + seg.value, 0);
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // — Chart 3: Volumen por hora —
  readonly hourLabels = Array.from({ length: 24 }, (_, i) =>
    i % 6 === 0 ? String(i).padStart(2, '0') : '',
  );

  // — Chart 5: Top tipos —
  typeBarColor(pct: number): string {
    if (pct >= 70) return 'var(--accent-red)';
    if (pct >= 40) return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  }

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
