import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DashboardApiService } from '../../data-access/api/dashboard.api';
import { DashboardOperativoDTO } from '../../data-access/dto/dashboard.dto';
import { ReportesApiService, ReporteComercialDTO } from '../../data-access/api/reportes.api';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { localDateYmd } from '../../shared/utils/date-local.util';
import { DonutChartComponent, DonutSegment } from '../../shared/components/charts/donut-chart/donut-chart.component';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';
import { BarsChartComponent } from '../../shared/components/charts/bars-chart/bars-chart.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CurrencyPipe, DecimalPipe, KeyValuePipe } from '@angular/common';

type Period = '7d' | '30d' | '90d';

interface TopType { tipo: string; count: number; pct: number; }
interface TopUnit { rank: number; id: string; crew: string; servicios: number; }

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
    CurrencyPipe,
    DecimalPipe,
    KeyValuePipe,
  ],
  template: `
    <div class="flex flex-col overflow-y-auto h-full">
      <!-- Header bar -->
      <div
        class="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 gap-4 flex-shrink-0"
        style="border-bottom: 1px solid var(--border-glass); background: color-mix(in srgb, var(--surface-glass) 60%, transparent);"
      >
        <!-- Left: icon + title + subtitle -->
        <div class="flex items-center gap-3">
          <span class="text-xl" style="color: var(--accent-cyan);">📊</span>
          <div>
            <h1 class="font-semibold text-base leading-tight" style="color: var(--text-primary);">Analítica Operativa & Comercial</h1>
            <div class="flex gap-2 mt-1">
              <button
                (click)="activeView.set('operativo'); load()"
                class="px-2.5 py-0.5 rounded text-[10px] font-mono transition-all font-semibold uppercase tracking-wider"
                [style]="activeView() === 'operativo'
                  ? 'background: var(--accent-cyan); color: #000;'
                  : 'background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-muted);'"
              >Operativo</button>
              <button
                (click)="activeView.set('comercial'); load()"
                class="px-2.5 py-0.5 rounded text-[10px] font-mono transition-all font-semibold uppercase tracking-wider"
                [style]="activeView() === 'comercial'
                  ? 'background: var(--accent-emerald); color: #000;'
                  : 'background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-muted);'"
              >Comercial (Sprint 4)</button>
            </div>
          </div>
        </div>

        <!-- Center: inline KPI chips (dynamic based on view mode) -->
        <div class="flex items-center flex-wrap gap-2">
          @if (activeView() === 'operativo') {
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
          } @else {
            <div class="flex items-center gap-1.5 px-3 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
              <span class="font-mono text-xs" style="color: var(--text-muted);">SUSCRIPCIONES</span>
              <span class="font-mono text-xs font-bold" style="color: var(--accent-cyan);">{{ comData()?.totalSuscripciones ?? 0 }}</span>
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
              <span class="font-mono text-xs" style="color: var(--text-muted);">FACTURADO</span>
              <span class="font-mono text-xs font-bold" style="color: var(--accent-emerald);">{{ (comData()?.totalFacturado ?? 0) | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
            </div>
          }
        </div>

        <!-- Right: period tabs -->
        <div class="flex" style="border-bottom: 1px solid var(--border-glass);">
          @for (tab of periodTabs; track tab.value) {
            <button
              (click)="activePeriod.set(tab.value); load()"
              class="px-4 py-1.5 text-xs font-mono transition-colors"
              [style]="activePeriod() === tab.value
                ? (activeView() === 'operativo'
                  ? 'color: var(--accent-cyan); border-bottom: 2px solid var(--accent-cyan); margin-bottom: -1px;'
                  : 'color: var(--accent-emerald); border-bottom: 2px solid var(--accent-emerald); margin-bottom: -1px;')
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

        <!-- ────────────────── VISTA OPERATIVA ────────────────── -->
        @if (activeView() === 'operativo') {
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
            @if (hourValues.some(v => v > 0)) {
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
            }

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
            @if (topTypes.length > 0) {
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
            }

            <!-- Row 3 right: TOP UNIDADES · MES -->
            @if (topUnits.length > 0) {
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
            }

          </div>
        }

        <!-- ────────────────── VISTA COMERCIAL ────────────────── -->
        @if (activeView() === 'comercial') {
          <div class="grid gap-4 p-4" style="grid-template-columns: 1fr 1fr;">

            <!-- KPI Card: Total Suscripciones Activas -->
            <emx-glass-card>
              <div class="flex items-start justify-between mb-2">
                <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                  Suscripciones Activas
                </h2>
                <span class="font-mono text-xs" style="color: var(--accent-cyan);">SaaS Tenant</span>
              </div>
              <div class="flex items-end justify-between mb-3">
                <span class="font-mono text-4xl font-bold" style="color: var(--text-primary);">
                  {{ comData()?.totalSuscripciones ?? 0 }}
                </span>
                <div class="text-right">
                  <p class="text-xs font-semibold" style="color: var(--accent-cyan);">Clientes Activos</p>
                  <p class="font-mono text-[10px]" style="color: var(--text-muted);">Bajo Cobertura Vigente</p>
                </div>
              </div>
              <div class="h-1.5 w-full rounded" style="background: var(--surface-glass); overflow: hidden;">
                <div class="h-full bg-cyan-400"
                  [style.width.%]="comSuscripcionesPct()"
                  style="border-radius: 99px; transition: width 0.4s ease;"></div>
              </div>
            </emx-glass-card>

            <!-- KPI Card: Total Facturado/Consumido -->
            <emx-glass-card>
              <div class="flex items-start justify-between mb-2">
                <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                  Ingresos por Copagos / Prestaciones
                </h2>
                <span class="font-mono text-xs" style="color: var(--accent-emerald);">Facturación Real</span>
              </div>
              <div class="flex items-end justify-between mb-3">
                <span class="font-mono text-4xl font-bold" style="color: var(--accent-emerald);">
                  {{ (comData()?.totalFacturado ?? 0) | currency:'USD':'symbol-narrow':'1.0-0' }}
                </span>
                <div class="text-right">
                  <p class="text-xs font-semibold" style="color: var(--accent-emerald);">Cierre de Tickets</p>
                  <p class="font-mono text-[10px]" style="color: var(--text-muted);">Multitenant Consolidado</p>
                </div>
              </div>
              <div class="h-1.5 w-full rounded" style="background: var(--surface-glass); overflow: hidden;">
                <div class="h-full bg-emerald-400"
                  [style.width.%]="comFacturadoPct()"
                  style="border-radius: 99px; transition: width 0.4s ease;"></div>
              </div>
            </emx-glass-card>

            <!-- Suscripciones por Plan (Donut) -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
                Suscripciones por Plan Comercial
              </h2>
              @if (planSegments().length > 0) {
                <div class="flex items-center gap-6">
                  <emx-donut-chart
                    [size]="130"
                    [strokeWidth]="14"
                    [segments]="planSegments()"
                    [centerLabel]="(comData()?.totalSuscripciones ?? 0).toString()"
                    centerSub="AFILIADOS"
                  />
                  <div class="flex flex-col gap-2 flex-1">
                    @for (seg of planSegments(); track seg.label) {
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full flex-shrink-0" [style.background]="seg.color"></span>
                        <span class="font-mono text-xs font-bold" style="color: var(--text-primary);">
                          {{ seg.value }}
                        </span>
                        <span class="text-xs" style="color: var(--text-secondary);">{{ seg.label }}</span>
                        <span class="font-mono text-xs ml-auto" style="color: var(--text-muted);">
                          {{ ((seg.value / (comData()?.totalSuscripciones || 1)) * 100) | number:'1.0-1' }}%
                        </span>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center py-6">
                  <span class="text-2xl mb-2">📁</span>
                  <p class="text-xs font-mono" style="color: var(--text-muted);">No hay suscripciones registradas en este período.</p>
                </div>
              }
            </emx-glass-card>

            <!-- Consumos y Facturación por Prestación Médica -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">
                Consumos & Ingresos por Prestación
              </h2>
              <div class="overflow-x-auto">
                <table class="w-full text-left font-mono text-xs">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-glass);">
                      <th class="py-2" style="color: var(--text-muted);">PRESTACIÓN</th>
                      <th class="py-2 text-center" style="color: var(--text-muted);">USOS</th>
                      <th class="py-2 text-right" style="color: var(--text-muted);">RECAUDACIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of tableData(); track item.name) {
                      <tr style="border-bottom: 1px solid color-mix(in srgb, var(--border-glass) 50%, transparent);">
                        <td class="py-2.5 font-sans font-medium" style="color: var(--text-primary);">{{ item.name }}</td>
                        <td class="py-2.5 text-center font-bold" style="color: var(--accent-cyan);">{{ item.uses }}</td>
                        <td class="py-2.5 text-right font-bold" style="color: var(--accent-emerald);">
                          {{ item.revenue | currency:'USD':'symbol-narrow':'1.0-0' }}
                        </td>
                      </tr>
                    }
                    @if (tableData().length === 0) {
                      <tr>
                        <td colspan="3" class="py-6 text-center text-xs" style="color: var(--text-muted);">
                          Sin consumos registrados en el rango seleccionado.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </emx-glass-card>

            <!-- KPI: Altas del mes -->
            <emx-glass-card>
              <div class="flex items-start justify-between mb-2">
                <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                  Altas del Mes
                </h2>
                <span class="font-mono text-xs" style="color: var(--accent-cyan);">Mes Actual</span>
              </div>
              <div class="flex items-end justify-between mb-3">
                <span class="font-mono text-4xl font-bold" style="color: var(--accent-cyan);">
                  {{ comData()?.altasMes ?? 0 }}
                </span>
                <div class="text-right">
                  <p class="text-xs font-semibold" style="color: var(--accent-cyan);">Nuevas coberturas</p>
                  <p class="font-mono text-[10px]" style="color: var(--text-muted);">Mes calendario vigente</p>
                </div>
              </div>
            </emx-glass-card>

            <!-- KPI: Coberturas por vencer -->
            <emx-glass-card>
              <div class="flex items-start justify-between mb-2">
                <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                  Coberturas por Vencer
                </h2>
                <span class="font-mono text-xs px-1.5 py-0.5 rounded"
                  [style]="(comData()?.coberturasPorVencer ?? 0) > 0
                    ? 'background: rgba(245,158,11,0.15); color: var(--accent-amber);'
                    : 'background: rgba(16,185,129,0.12); color: var(--accent-emerald);'"
                >{{ (comData()?.coberturasPorVencer ?? 0) > 0 ? 'ALERTA' : 'OK' }}</span>
              </div>
              <div class="flex items-end justify-between mb-3">
                <span class="font-mono text-4xl font-bold"
                  [style]="(comData()?.coberturasPorVencer ?? 0) > 0
                    ? 'color: var(--accent-amber);'
                    : 'color: var(--accent-emerald);'"
                >
                  {{ comData()?.coberturasPorVencer ?? 0 }}
                </span>
                <div class="text-right">
                  <p class="text-xs font-semibold" style="color: var(--text-muted);">Próximos 30 días</p>
                  <p class="font-mono text-[10px]" style="color: var(--text-muted);">Vigencia próxima a expirar</p>
                </div>
              </div>
            </emx-glass-card>

            <!-- Tendencia de altas (barra mensual) -->
            @if (altaSerieValues().length > 0) {
              <emx-glass-card>
                <div class="flex items-start justify-between mb-3">
                  <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                    Tendencia de Altas · Últimos 6 Meses
                  </h2>
                </div>
                <emx-bars-chart
                  [values]="altaSerieValues()"
                  [labels]="altaSerieLabels()"
                  [width]="440"
                  [height]="80"
                />
              </emx-glass-card>
            }

            <!-- Afiliados por institución -->
            @if ((comData()?.afiliadosPorInstitucion | keyvalue)?.length) {
              <emx-glass-card>
                <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
                  Afiliados por Institución (B2B)
                </h2>
                <div class="flex flex-col gap-3">
                  @for (entry of (comData()!.afiliadosPorInstitucion! | keyvalue); track entry.key) {
                    <div class="flex items-center gap-3">
                      <span class="flex-1 text-xs font-medium truncate" style="color: var(--text-primary);">{{ entry.key }}</span>
                      <span class="font-mono text-xs font-bold" style="color: var(--accent-blue);">{{ entry.value }}</span>
                    </div>
                  }
                </div>
              </emx-glass-card>
            }

          </div>
        }

      }
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardApi = inject(DashboardApiService);
  private reportesApi = inject(ReportesApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<DashboardOperativoDTO | null>(null);
  readonly comData = signal<ReporteComercialDTO | null>(null);
  readonly selectedDate = signal<string>(localDateYmd());
  readonly activePeriod = signal<Period>('30d');
  readonly activeView = signal<'operativo' | 'comercial'>('operativo');

  readonly periodTabs: { value: Period; label: string }[] = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
  ];

  readonly topTypes: readonly TopType[] = EMPTY_TOP_TYPES;
  readonly topUnits: readonly TopUnit[] = EMPTY_TOP_UNITS;

  // Derived from real backend cargaPorHora map {"0":3,"1":0,...,"23":7}
  private readonly _hourValues = computed<number[]>(() => {
    const cph = this.data()?.cargaPorHora;
    if (!cph || Object.keys(cph).length === 0) return EMPTY_HOUR_VALUES;
    return Array.from({ length: 24 }, (_, i) => Number(cph[String(i)] ?? 0));
  });

  get hourValues(): number[] { return this._hourValues(); }

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

  // No delta histórico disponible en el backend aún — mostramos "—"
  readonly tRespDelta = computed((): number | null => null);

  readonly tRespDeltaLabel = computed(() => {
    const d = this.tRespDelta();
    if (d == null) return '—';
    return d >= 0 ? `+${d.toFixed(1)} min` : `${d.toFixed(1)} min`;
  });

  // Usa tiemposRespuestaHistorico del backend cuando está disponible
  readonly sparkValues = computed<number[]>(() => {
    const hist = this.data()?.tiemposRespuestaHistorico;
    if (hist && hist.length > 0) return hist;
    const base = this.data()?.tiempoRespuestaPromedio;
    return base != null ? Array(24).fill(+base.toFixed(1)) : Array(24).fill(0);
  });

  // — Chart 2: Cumplimiento SLA —
  readonly slaKpi = computed((): string | null => {
    const sla = this.data()?.slaPromedio ?? null;
    return sla != null ? sla.toFixed(1) : null;
  });

  // Sin histórico de SLA en el backend aún — línea plana con el valor actual
  readonly slaSparkValues = computed<number[]>(() => {
    const base = this.data()?.slaPromedio;
    return base != null ? Array(24).fill(+base.toFixed(1)) : Array(24).fill(0);
  });

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

  // ────────────────── COMERCIAL COMPUTED DATA ──────────────────

  readonly planSegments = computed<DonutSegment[]>(() => {
    const cd = this.comData();
    if (!cd || !cd.suscripcionesPorPlan) return [];
    const colors = ['var(--accent-cyan)', 'var(--accent-blue)', 'var(--accent-emerald)', 'var(--accent-amber)', 'var(--accent-red)'];
    return Object.entries(cd.suscripcionesPorPlan).map(([plan, count], idx) => ({
      value: count,
      label: plan,
      color: colors[idx % colors.length]
    }));
  });

  readonly altaSerieValues = computed<number[]>(() => {
    const serie = this.comData()?.altasSerie;
    if (!serie) return [];
    return Object.values(serie).map(Number);
  });

  readonly altaSerieLabels = computed<string[]>(() => {
    const serie = this.comData()?.altasSerie;
    if (!serie) return [];
    return Object.keys(serie).map(k => {
      const [year, month] = k.split('-');
      const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return months[parseInt(month) - 1] ?? k;
    });
  });

  // Progress bar pct: suscripciones activas / total conocido (cap 100)
  comSuscripcionesPct(): number {
    const total = this.comData()?.totalSuscripciones ?? 0;
    if (total === 0) return 0;
    const planMap = this.comData()?.suscripcionesPorPlan ?? {};
    const maxPlan = Math.max(...Object.values(planMap), 1);
    return Math.min(100, Math.round((total / (total + maxPlan)) * 100 + 40));
  }

  // Progress bar pct: facturación relativa a suscripciones × precio medio estimado
  comFacturadoPct(): number {
    const facturado = this.comData()?.totalFacturado ?? 0;
    const suscripciones = this.comData()?.totalSuscripciones ?? 0;
    if (facturado === 0 || suscripciones === 0) return 0;
    const avg = facturado / suscripciones;
    // Normalise: 100% ≈ avg × 1.5 (representa target mensual)
    return Math.min(100, Math.round((facturado / (avg * suscripciones * 1.5)) * 100));
  }

  readonly tableData = computed(() => {
    const cd = this.comData();
    if (!cd || !cd.consumosPorPrestacion) return [];
    return Object.entries(cd.consumosPorPrestacion).map(([name, uses]) => {
      const revenue = cd.ingresosPorPrestacion?.[name] ?? 0;
      return { name, uses, revenue };
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // Mapeo de período a fechas ISO
    const now = new Date();
    const parsedHasta = now.toISOString();
    let days = 30;
    if (this.activePeriod() === '7d') days = 7;
    if (this.activePeriod() === '90d') days = 90;
    
    const sinceDate = new Date();
    sinceDate.setDate(now.getDate() - days);
    const parsedDesde = sinceDate.toISOString();

    if (this.activeView() === 'operativo') {
      this.dashboardApi
        .operativo(this.selectedDate())
        .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (d) => {
            this.data.set(d);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Error al cargar analítica operativa');
            this.loading.set(false);
          },
        });
    } else {
      this.reportesApi
        .comercial(parsedDesde, parsedHasta)
        .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (d) => {
            this.comData.set(d);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Error al cargar analítica comercial');
            this.loading.set(false);
          },
        });
    }
  }
}
