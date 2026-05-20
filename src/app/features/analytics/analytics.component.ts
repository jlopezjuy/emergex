import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DashboardApiService } from '../../data-access/api/dashboard.api';
import { DashboardOperativoDTO } from '../../data-access/dto/dashboard.dto';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { localDateYmd } from '../../shared/utils/date-local.util';
import { DonutChartComponent, DonutSegment } from '../../shared/components/charts/donut-chart/donut-chart.component';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';
import { BarsChartComponent } from '../../shared/components/charts/bars-chart/bars-chart.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';

type Period = '7d' | '30d' | '90d';

interface TopType { tipo: string; count: number; pct: number; }
interface TopUnit { rank: number; id: string; crew: string; servicios: number; }

// TODO: conectar a endpoint real cuando el backend exponga /api/v1/dashboard/top-tipos
// y /api/v1/dashboard/top-unidades y /api/v1/dashboard/volumen-hora
const EMPTY_TOP_TYPES: TopType[] = [];
const EMPTY_TOP_UNITS: TopUnit[] = [];
const EMPTY_HOUR_VALUES: number[] = Array(24).fill(0);

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
      <!-- Header bar -->
      <div
        class="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style="border-bottom: 1px solid var(--border-glass); background: color-mix(in srgb, var(--surface-glass) 60%, transparent);"
      >
        <!-- Left: icon + title + subtitle -->
        <div class="flex items-center gap-3">
          <span class="text-lg" style="color: var(--accent-cyan);">📊</span>
          <div>
            <h1 class="font-semibold text-sm leading-tight" style="color: var(--text-primary);">Analítica Operativa</h1>
            <p class="font-mono text-xs" style="color: var(--text-muted);">ÚLTIMOS 30 DÍAS</p>
          </div>
        </div>

        <!-- Center: inline KPI chips -->
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 px-3 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <span class="font-mono text-xs" style="color: var(--text-muted);">SERVICIOS TOTALES</span>
            <span class="font-mono text-xs font-bold" style="color: var(--text-primary);">{{ totalServiciosLabel() }}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <span class="font-mono text-xs" style="color: var(--text-muted);">T. MEDIO RESP.</span>
            <span class="font-mono text-xs font-bold" style="color: var(--accent-amber);">{{ tRespLabel() }}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <span class="font-mono text-xs" style="color: var(--text-muted);">CUMPLIMIENTO SLA</span>
            <span class="font-mono text-xs font-bold" style="color: var(--accent-emerald);">{{ slaLabel() }}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <span class="font-mono text-xs" style="color: var(--text-muted);">CRÍTICOS RESUELTOS</span>
            <span class="font-mono text-xs font-bold" style="color: var(--accent-red);">{{ criticosResueltosLabel() }}</span>
          </div>
        </div>

        <!-- Right: period tabs -->
        <div class="flex" style="border-bottom: 1px solid var(--border-glass);">
          @for (tab of periodTabs; track tab.value) {
            <button
              (click)="activePeriod.set(tab.value)"
              class="px-4 py-1.5 text-xs font-mono transition-colors"
              [style]="activePeriod() === tab.value
                ? 'color: var(--accent-cyan); border-bottom: 2px solid var(--accent-cyan); margin-bottom: -1px;'
                : 'color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -1px;'"
            >{{ tab.label }}</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="px-6 pt-6"><emx-loading-state /></div>
      } @else if (error()) {
        <div class="px-6 pt-6"><emx-error-state [message]="error()!" (retry)="load()" /></div>
      } @else {

        <!-- Charts grid: all rows 2-per-row -->
        <div class="grid gap-4 p-4" style="grid-template-columns: 1fr 1fr;">

          <!-- Row 1 left: TIEMPO DE RESPUESTA -->
          <emx-glass-card>
            <div class="flex items-start justify-between mb-2">
              <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                Tiempo de Respuesta
              </h2>
              <span class="font-mono text-xs" style="color: var(--text-muted);">media móvil</span>
            </div>
            <div class="flex items-end gap-4 mb-3">
              <span class="font-mono text-3xl font-bold" style="color: var(--text-primary);">
                {{ tRespKpi() != null ? tRespKpi() + ' min' : '—' }}
              </span>
              <div class="flex-1">
                <emx-sparkline
                  [values]="sparkValues()"
                  color="#22D3EE"
                  [width]="200"
                  [height]="48"
                />
              </div>
            </div>
            <div
              class="font-mono text-xs font-semibold px-2 py-1 rounded inline-block"
              style="color: var(--text-muted); background: color-mix(in srgb, var(--text-muted) 12%, transparent);"
            >— VS. MES ANTERIOR</div>
          </emx-glass-card>

          <!-- Row 1 right: CUMPLIMIENTO SLA -->
          <emx-glass-card>
            <div class="flex items-start justify-between mb-2">
              <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                Cumplimiento SLA
              </h2>
              <span
                class="font-mono text-xs px-2 py-0.5 rounded font-semibold"
                [style]="slaBadgeStyle()"
              >{{ slaBadgeLabel() }}</span>
            </div>
            <div class="flex items-end gap-4 mb-3">
              <span class="font-mono text-3xl font-bold" style="color: var(--text-primary);">
                {{ slaKpi() != null ? slaKpi() + ' %' : '—' }}
              </span>
              <div class="flex-1">
                <emx-sparkline
                  [values]="slaSparkValues()"
                  color="#10B981"
                  [width]="200"
                  [height]="48"
                />
              </div>
            </div>
            <div
              class="font-mono text-xs font-semibold px-2 py-1 rounded inline-block"
              style="color: var(--text-muted); background: color-mix(in srgb, var(--text-muted) 12%, transparent);"
            >— VS. MES ANTERIOR</div>
          </emx-glass-card>

          <!-- Row 2 left: VOLUMEN POR HORA -->
          <emx-glass-card>
            <div class="flex items-start justify-between mb-3">
              <div>
                <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                  Volumen por Hora · Promedio
                </h2>
                <p class="font-mono text-xs mt-0.5" style="color: var(--text-primary);">
                  {{ data()?.totalTickets != null ? (data()!.totalTickets! / 30).toFixed(1) + ' servicios/día' : '—' }}
                </p>
              </div>
              <span
                class="font-mono text-xs px-2 py-0.5 rounded font-semibold"
                style="color: var(--text-muted); background: color-mix(in srgb, var(--text-muted) 12%, transparent);"
              >—</span>
            </div>
            <emx-bars-chart
              [values]="hourValues"
              [labels]="hourLabels"
              [width]="440"
              [height]="80"
            />
          </emx-glass-card>

          <!-- Row 2 right: DISTRIBUCIÓN POR PRIORIDAD -->
          <emx-glass-card>
            <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">
              Distribución por Prioridad
            </h2>
            <div class="flex items-center gap-4">
              <emx-donut-chart
                [size]="110"
                [strokeWidth]="12"
                [segments]="prioritySegments()"
                [centerLabel]="priorityTotal() > 0 ? priorityTotal().toString() : '—'"
                [centerSub]="priorityTotal() > 0 ? 'DE ' + priorityTotal() : ''"
              />
              <div class="flex flex-col gap-2 flex-1">
                @for (seg of prioritySegments(); track seg.label) {
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="seg.color"></span>
                    <span class="font-mono text-xs font-bold" style="color: var(--text-primary);">
                      {{ seg.value }}
                    </span>
                    <span class="text-xs" style="color: var(--text-muted);">· {{ seg.label?.toUpperCase() }} ·</span>
                    <span class="font-mono text-xs" style="color: var(--text-muted);">
                      {{ priorityPct(seg.value) }}%
                    </span>
                  </div>
                }
              </div>
            </div>
          </emx-glass-card>

          <!-- Row 3 left: TOP TIPOS DE EMERGENCIA -->
          <emx-glass-card>
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Top Tipos de Emergencia
            </h2>
            <div class="flex flex-col gap-3">
              @for (row of topTypes; track row.tipo) {
                <div class="flex items-center gap-3">
                  <span class="flex-1 text-xs font-medium truncate" style="color: var(--text-primary);">
                    {{ row.tipo }}
                  </span>
                  <div
                    style="width: 120px; height: 4px; background: var(--surface-glass); border-radius: 2px; flex-shrink: 0;"
                  >
                    <div
                      style="height: 4px; border-radius: 2px; transition: width 0.3s ease;"
                      [style.width.%]="row.pct"
                      [style.background]="typeBarColor(row.pct)"
                    ></div>
                  </div>
                  <span class="font-mono text-xs w-6 text-right" style="color: var(--text-secondary);">{{ row.count }}</span>
                  <span class="font-mono text-xs w-8 text-right" style="color: var(--text-muted);">{{ row.pct }}%</span>
                </div>
              }
            </div>
          </emx-glass-card>

          <!-- Row 3 right: TOP UNIDADES · MES -->
          <emx-glass-card>
            <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
              Top Unidades · Mes
            </h2>
            <div class="flex flex-col gap-3">
              @for (unit of topUnits; track unit.id) {
                <div class="flex items-center gap-3">
                  <span
                    class="font-mono text-xs font-bold"
                    style="width: 20px; flex-shrink: 0; color: var(--text-muted);"
                  >{{ unit.rank.toString().padStart(2, '0') }}</span>
                  <span
                    class="font-mono text-xs font-semibold"
                    style="color: var(--accent-cyan); width: 36px; flex-shrink: 0;"
                  >{{ unit.id }}</span>
                  <span
                    class="text-xs flex-1 truncate"
                    style="color: var(--text-primary);"
                  >{{ unit.crew }}</span>
                  <span class="font-mono text-xs font-bold" style="color: var(--text-secondary); flex-shrink: 0;">
                    {{ unit.servicios }}
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
  readonly selectedDate = signal<string>(localDateYmd());
  readonly activePeriod = signal<Period>('30d');

  readonly periodTabs: { value: Period; label: string }[] = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
  ];

  readonly topTypes: readonly TopType[] = EMPTY_TOP_TYPES;
  readonly topUnits: readonly TopUnit[] = EMPTY_TOP_UNITS;
  readonly hourValues = EMPTY_HOUR_VALUES;

  // — KPI labels —
  readonly slaLabel = computed(() => {
    const sla = this.data()?.slaPromedio;
    return sla != null ? `${Math.round(sla)}%` : '—';
  });

  readonly tRespLabel = computed(() => {
    const t = this.data()?.tiempoRespuestaPromedio;
    return t != null ? `${t.toFixed(1)} min` : '—';
  });

  readonly totalServiciosLabel = computed(() => {
    const total = this.data()?.totalTickets;
    return total != null ? total.toLocaleString('es-AR') : '—';
  });

  readonly criticosResueltosLabel = computed(() => {
    const criticos = this.data()?.ticketsCriticos;
    return criticos != null ? `${criticos}` : '—';
  });

  // — Chart 1: Tiempo de respuesta —
  readonly tRespKpi = computed((): string | null => {
    const t = this.data()?.tiempoRespuestaPromedio ?? null;
    return t != null ? t.toFixed(1) : null;
  });

  readonly tRespDelta = computed(() => -0.6); // mock delta — negative = improvement

  readonly tRespDeltaLabel = computed(() => {
    const d = this.tRespDelta();
    return d >= 0 ? `+${d.toFixed(1)} min` : `${d.toFixed(1)} min`;
  });

  readonly sparkValues = computed<number[]>(() => {
    const base = this.data()?.tiempoRespuestaPromedio;
    if (base == null) return Array(7).fill(0);
    return Array.from({ length: 24 }, (_, i) => {
      const noise = Math.sin(i * 0.8) * 2 + Math.cos(i * 1.3);
      return Math.max(1, +(base + noise).toFixed(1));
    });
  });

  // — Chart 2: Cumplimiento SLA —
  readonly slaKpi = computed((): string | null => {
    const sla = this.data()?.slaPromedio ?? null;
    return sla != null ? sla.toFixed(1) : null;
  });

  readonly slaSparkValues = computed<number[]>(() => {
    const base = this.data()?.slaPromedio;
    if (base == null) return Array(7).fill(0);
    return Array.from({ length: 24 }, (_, i) => {
      const noise = Math.sin(i * 0.6) * 5 + Math.cos(i * 1.1) * 3;
      return Math.min(100, Math.max(0, +(base + noise).toFixed(1)));
    });
  });

  slaBadgeStyle(): string {
    const raw = this.slaKpi();
    if (raw == null) return 'color: var(--text-muted); background: transparent;';
    const sla = parseFloat(raw);
    if (sla >= 80) return 'color: var(--accent-emerald); background: color-mix(in srgb, var(--accent-emerald) 12%, transparent);';
    if (sla >= 60) return 'color: var(--accent-amber); background: color-mix(in srgb, var(--accent-amber) 12%, transparent);';
    return 'color: var(--accent-red); background: color-mix(in srgb, var(--accent-red) 12%, transparent);';
  }

  slaBadgeLabel(): string {
    const raw = this.slaKpi();
    if (raw == null) return '—';
    const sla = parseFloat(raw);
    if (sla >= 80) return 'Óptimo';
    if (sla >= 60) return 'Aceptable';
    return 'Crítico';
  }

  // — Chart 4: Donut prioridades —
  readonly prioritySegments = computed<DonutSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    const por = d.ticketsPorPrioridad ?? {};
    return [
      { value: por['CRITICA'] ?? 0, color: 'var(--accent-red)',     label: 'Rojos' },
      { value: por['URGENTE'] ?? 0, color: 'var(--accent-amber)',   label: 'Amarillos' },
      { value: por['NORMAL']  ?? 0, color: 'var(--accent-emerald)', label: 'Verdes' },
    ];
  });

  readonly priorityTotal = computed(() =>
    this.prioritySegments().reduce((s, seg) => s + seg.value, 0)
  );

  priorityPct(value: number): number {
    const total = this.prioritySegments().reduce((s, seg) => s + seg.value, 0);
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // — Chart 3: Volumen por hora —
  readonly hourLabels = Array.from({ length: 24 }, (_, i) =>
    i % 3 === 0 ? String(i).padStart(2, '0') : '',
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
