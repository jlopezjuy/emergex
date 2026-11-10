import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { catchError, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FleetApiService } from '../../data-access/api/fleet.api';
import {
  UnidadMovilDTO,
  FlotaDashboardDTO,
  FlotaMetricasDTO,
  GuardiaDTO,
  LogTurnoDTO,
} from '../../data-access/dto/ambulancia.dto';
import { FleetStatusDonutComponent } from '../../shared/components/fleet/fleet-status-donut/fleet-status-donut.component';
import { FleetTableComponent } from '../../shared/components/fleet/fleet-table/fleet-table.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { NewUnitWizardModalComponent } from './new-unit-wizard-modal/new-unit-wizard-modal.component';
import { UnitScheduleModalComponent } from './unit-schedule-modal/unit-schedule-modal.component';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

type FleetTab = 'TODAS' | 'DISPONIBLE' | 'SIN_COBERTURA' | 'EN_SERVICIO' | 'MANTENIMIENTO';

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [
    CommonModule,
    FleetStatusDonutComponent,
    FleetTableComponent,
    KpiCardComponent,
    GlassCardComponent,
    LoadingStateComponent,
    NewUnitWizardModalComponent,
    UnitScheduleModalComponent,
  ],
  template: `
    <div class="h-full flex flex-col xl:flex-row overflow-hidden">

      <!-- Left scrollable section -->
      <div class="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">

        <!-- Page header -->
        <div class="flex flex-wrap items-start gap-3 sm:gap-4">
          <!-- Icon + title -->
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,211,238,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5">
              <rect x="1" y="7" width="14" height="6" rx="1"/><path d="M3 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>
              <circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/>
              <path d="M1 10h14M7 4h2"/>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Gestión de Flota</h1>
            <p class="font-mono text-xs mt-0.5" style="color:var(--text-muted);">UNIDADES MÓVILES</p>
          </div>
          <!-- Inline KPIs -->
          <div class="order-3 lg:order-none w-full lg:w-auto flex items-center gap-0 rounded-lg overflow-x-auto flex-shrink-0" style="border:1px solid var(--border-glass);background:var(--bg-elevated);">
            @for (kpi of headerKpis(); track kpi.label) {
              <div class="px-3 sm:px-4 py-2 text-center min-w-[96px]" style="border-right:1px solid var(--border-glass);"
                [style.borderRight]="$last ? 'none' : '1px solid var(--border-glass)'">
                <div class="font-mono text-xs uppercase tracking-wider" style="color:var(--text-muted);">{{ kpi.label }}</div>
                <div class="font-mono font-bold text-lg leading-none mt-1" [style.color]="kpi.color">{{ kpi.value }}</div>
              </div>
            }
          </div>
          <div class="ml-auto w-full sm:w-auto flex items-center justify-end gap-2 flex-shrink-0">
            <button type="button" class="btn btn--ghost btn--sm">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8v2a1 1 0 001 1h6a1 1 0 001-1V8M6 1v6M3.5 5L6 7.5 8.5 5"/></svg>
              Exportar CSV
            </button>
            <button class="btn btn--primary btn--sm" (click)="showNewUnit.set(true)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 1v10M1 6h10"/></svg>
              Nueva unidad
            </button>
          </div>
        </div>

        <!-- Status donut + table -->
        <div class="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
          <!-- Left panel: donut + health metrics -->
          <div class="flex flex-col gap-4">
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
                Distribución de estado
              </h2>
              <emx-fleet-status-donut [dashboard]="fleetDashboard()" />
            </emx-glass-card>

            <!-- Salud Operativa -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">
                Salud Operativa
              </h2>
              <div class="flex flex-col gap-3">
                @for (metric of healthMetrics(); track metric.label) {
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs" style="color: var(--text-secondary);">{{ metric.label }}</span>
                      <span class="font-mono text-xs" [style.color]="levelColor(metric.value)">{{ metric.value }}%</span>
                    </div>
                    <div style="height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden;">
                      <div style="height: 100%; border-radius: 2px; transition: width 0.4s;"
                        [style.width.%]="metric.value"
                        [style.background]="levelColor(metric.value)"></div>
                    </div>
                  </div>
                }
              </div>
            </emx-glass-card>
          </div>

          <!-- Table -->
          <emx-glass-card extraClass="!p-0 overflow-hidden">
            <div class="px-4 pt-4 pb-2 border-b" style="border-color: var(--border-glass);">
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">
                Unidades móviles
              </h2>
              <!-- Fleet tabs -->
              <div class="flex items-center gap-0.5 overflow-x-auto">
                @for (tab of fleetTabs; track tab.id) {
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs font-medium rounded-t transition-all whitespace-nowrap"
                    [style.color]="fleetTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                    [style.border-bottom]="fleetTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
                    (click)="fleetTab.set(tab.id); page.set(0)"
                  >{{ tab.label }} <span class="font-mono opacity-60">{{ tabCount(tab.id) }}</span></button>
                }
              </div>
            </div>
            @if (loading()) {
              <emx-loading-state />
            } @else {
              <emx-fleet-table
                [units]="paginatedUnits()"
                (viewUnit)="onViewUnit($event)"
                (configUnit)="onConfigUnit($event)"
              />
              @if (filteredUnits().length > 0) {
                <div class="flex flex-wrap items-center justify-between gap-2 mt-4 px-2 pt-3" style="border-top:1px solid var(--border-glass)">
                  <div class="font-mono text-xs" style="color:var(--text-muted)">
                    Mostrando {{ page() * pageSize() + 1 }} - {{ getMin((page() + 1) * pageSize(), filteredUnits().length) }} de {{ filteredUnits().length }} unidades
                  </div>
                  <div class="flex items-center gap-2">
                    <button type="button" class="btn btn--ghost btn--sm" [disabled]="page() === 0" (click)="page.set(page() - 1)">
                      ‹ Anterior
                    </button>
                    <span class="font-mono text-xs px-2" style="color:var(--text-primary)">
                      Pág. {{ page() + 1 }} de {{ totalPages() }}
                    </span>
                    <button type="button" class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages() - 1" (click)="page.set(page() + 1)">
                      Siguiente ›
                    </button>
                  </div>
                </div>
              }
            }
          </emx-glass-card>
        </div>

        <!-- Metrics strip -->
        @if (metricas()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
            <emx-kpi-card
              label="T. Resp. prom."
              [value]="tRespLabel()"
              accentColor="amber"
            />
            <emx-kpi-card
              label="Tickets atendidos"
              [value]="metricas()?.ticketsAtendidos"
              accentColor="cyan"
            />
            <emx-kpi-card
              label="Km recorridos"
              [value]="metricas()?.distanciaRecorrida"
              accentColor="blue"
            />
            <emx-kpi-card
              label="Eficiencia"
              [value]="eficienciaLabel()"
              accentColor="emerald"
            />
          </div>
        }
      </div>

      <!-- Right detail panel -->
      @if (selectedUnit()) {
        <button
          type="button"
          class="fixed inset-0 z-30 2xl:hidden"
          style="background: rgba(2,6,23,0.45); backdrop-filter: blur(2px);"
          (click)="selectedUnit.set(null)"
          aria-label="Cerrar detalle de unidad"
        ></button>
        <div
          class="fixed inset-y-0 right-0 z-40 flex flex-col overflow-y-auto flex-shrink-0 w-[380px] max-w-[92vw] border-l 2xl:static 2xl:inset-auto 2xl:right-auto 2xl:z-auto 2xl:w-[320px] 2xl:max-w-none"
          style="border-color:var(--border-glass); background:var(--bg-elevated);"
        >
          <!-- Panel header -->
          <div class="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style="border-color:var(--border-glass);">
            <div class="flex items-center gap-3">
              <!-- Avatar: ambulance icon circle -->
              <div style="width:40px;height:40px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-blue)" stroke-width="1.5">
                  <rect x="1" y="6" width="16" height="8" rx="2"/>
                  <path d="M4 6V5a2 2 0 012-2h6a2 2 0 012 2v1"/>
                  <circle cx="4.5" cy="14" r="1.5"/><circle cx="13.5" cy="14" r="1.5"/>
                  <path d="M8 8h2M8 11h2"/>
                </svg>
              </div>
              <div>
                <div class="font-mono font-bold" style="font-size:16px;color:var(--text-primary);">
                  {{ selectedUnit()!.identificador ?? (selectedUnit()!.id != null ? 'U-' + selectedUnit()!.id : 'AMB') }}
                </div>
                <div style="font-size:11px;color:var(--text-muted);">
                  {{ selectedUnit()!.tipo ?? 'ALS' }}
                </div>
              </div>
            </div>
            <!-- Close + Estado badge -->
            <div class="flex items-center gap-2 flex-wrap justify-end">
              <span
                class="badge"
                [class]="unitEstadoBadge(selectedUnit()!.estado)"
              >{{ selectedUnit()!.estado?.replace('_', ' ') }}</span>
              <button type="button"
                (click)="selectedUnit.set(null)"
                style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:transparent;border:none;color:var(--text-muted);cursor:pointer;">✕</button>
            </div>
          </div>

          <!-- Scrollable body -->
          <div class="flex flex-col gap-4 p-4">

            <!-- Info grid -->
            <div class="grid grid-cols-2 gap-[10px]">
              <div>
                <div class="eyebrow">Sede</div>
                <div class="font-mono font-semibold" style="font-size:12px;color:var(--text-primary);margin-top:3px;">BASE 04 · NORTE</div>
              </div>
              <div>
                <div class="eyebrow">Turno</div>
                <div class="font-mono" style="font-size:12px;color:var(--text-primary);margin-top:3px;">06:00 → 18:00</div>
              </div>
              <div>
                <div class="eyebrow">Km hoy</div>
                <div class="font-mono font-semibold" style="font-size:13px;color:var(--text-primary);margin-top:3px;">
                  {{ unitKmHoy(selectedUnit()) }}
                </div>
              </div>
              <div>
                <div class="eyebrow">Servicios</div>
                <div class="font-mono" style="font-size:13px;color:var(--text-primary);margin-top:3px;">
                  {{ unitServicios(selectedUnit()) }}
                </div>
              </div>
              <div>
                <div class="eyebrow">Próx. mant.</div>
                <div class="font-mono" style="font-size:12px;margin-top:3px;"
                  [style.color]="(selectedUnit()!.bateria ?? 75) < 30 ? 'var(--accent-amber)' : 'var(--text-muted)'">
                  14 días
                </div>
              </div>
              <div>
                <div class="eyebrow">Última conex.</div>
                <div class="font-mono" style="font-size:12px;color:var(--accent-emerald);margin-top:3px;">● 3s</div>
              </div>
            </div>

            <!-- Expiration Badges -->
            <div class="grid grid-cols-2 gap-[10px]">
              <div>
                <div class="eyebrow">VTV</div>
                <div class="font-mono mt-1">
                  @if (selectedUnit()!.vtvVencimiento) {
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium"
                          [style.background]="isExpired(selectedUnit()!.vtvVencimiento!) ? 'var(--accent-red)' : 'var(--accent-emerald)'"
                          style="color: white">
                      {{ selectedUnit()!.vtvVencimiento | date:'shortDate' }}
                    </span>
                  } @else {
                    <span class="text-[11px]" style="color: var(--text-muted)">Sin datos</span>
                  }
                </div>
              </div>
              <div>
                <div class="eyebrow">Seguro</div>
                <div class="font-mono mt-1">
                  @if (selectedUnit()!.seguroVencimiento) {
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium"
                          [style.background]="isExpired(selectedUnit()!.seguroVencimiento!) ? 'var(--accent-red)' : 'var(--accent-emerald)'"
                          style="color: white">
                      {{ selectedUnit()!.seguroVencimiento | date:'shortDate' }}
                    </span>
                  } @else {
                    <span class="text-[11px]" style="color: var(--text-muted)">Sin datos</span>
                  }
                </div>
              </div>
            </div>

            <!-- Battery + Fuel bars -->
            <div class="flex flex-col gap-2">
              <div class="eyebrow">Sistemas</div>
              <div class="flex flex-col gap-2">
                <!-- Battery -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span style="font-size:11px;color:var(--text-secondary);">Batería</span>
                    <span class="font-mono" style="font-size:11px;"
                      [style.color]="levelColor(selectedUnit()!.bateria ?? 75)">
                      {{ selectedUnit()!.bateria ?? 75 }}%
                    </span>
                  </div>
                  <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;border-radius:2px;transition:width 0.3s;"
                      [style.width.%]="selectedUnit()!.bateria ?? 75"
                      [style.background]="levelColor(selectedUnit()!.bateria ?? 75)"></div>
                  </div>
                </div>
                <!-- Fuel -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span style="font-size:11px;color:var(--text-secondary);">Combustible</span>
                    <span class="font-mono" style="font-size:11px;"
                      [style.color]="levelColor(selectedUnit()!.combustible ?? 60)">
                      {{ selectedUnit()!.combustible ?? 60 }}%
                    </span>
                  </div>
                  <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;border-radius:2px;transition:width 0.3s;"
                      [style.width.%]="selectedUnit()!.combustible ?? 60"
                      [style.background]="levelColor(selectedUnit()!.combustible ?? 60)"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Inventory bars -->
            <div class="flex flex-col gap-2">
              <div class="eyebrow">Inventario crítico</div>
              @for (item of inventoryFor(selectedUnit()!); track item.nombre) {
                <div>
                  <div class="flex items-center justify-between mb-0.5">
                    <span style="font-size:11px;color:var(--text-secondary);">{{ item.nombre }}</span>
                    <span class="font-mono" style="font-size:10px;"
                      [style.color]="item.pct != null && item.pct < 30 ? 'var(--accent-red)' : 'var(--text-muted)'">
                      {{ item.pct != null ? item.pct + '%' : '—' }}
                    </span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;border-radius:2px;transition:width 0.3s;"
                      [style.width.%]="item.pct ?? 0"
                      [style.background]="item.pct == null ? 'var(--border-glass)' : item.pct < 30 ? 'var(--accent-red)' : item.pct < 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)'"></div>
                  </div>
                </div>
              }
            </div>

            <!-- Guardias activas -->
            @if (unitGuardias().length > 0) {
              <div class="flex flex-col gap-2">
                <div class="eyebrow">Guardias activas</div>
                @for (g of unitGuardias(); track g.id) {
                  <div class="flex items-center justify-between"
                    style="padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);">
                    <div>
                      <div style="font-size:11px;color:var(--text-primary);">{{ g.diaSemana ?? '—' }}</div>
                      <div style="font-size:10px;color:var(--text-muted);">{{ g.horaInicio ?? '—' }} → {{ g.horaFin ?? '—' }}</div>
                    </div>
                    <span style="font-size:10px;padding:2px 6px;border-radius:4px;"
                      [style.background]="g.estado === 'ACTIVA' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)'"
                      [style.color]="g.estado === 'ACTIVA' ? 'var(--accent-emerald)' : 'var(--text-muted)'">
                      {{ g.estado ?? '—' }}
                    </span>
                  </div>
                }
              </div>
            }

            <!-- Últimos eventos -->
            @if (unitLogs().length > 0) {
              <div class="flex flex-col gap-1.5">
                <div class="eyebrow">Últimos eventos</div>
                @for (log of unitLogs().slice(0, 5); track log.id) {
                  <div style="font-size:10px;padding:4px 8px;border-left:2px solid var(--border-glass);">
                    <span style="color:var(--text-muted);">{{ log.fecha ? log.fecha.substring(0, 16).replace('T', ' ') : '—' }}</span>
                    <span style="color:var(--text-secondary);margin-left:6px;">{{ log.evento ?? '—' }}</span>
                  </div>
                }
              </div>
            }

            <!-- Action buttons -->
            <div class="flex items-center gap-2 flex-wrap">
              <button type="button" class="btn btn--primary btn--sm" style="flex:1;justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h8M7 3l3 3-3 3"/></svg>
                Despachar
              </button>
              <button type="button" class="btn btn--ghost btn--sm" style="flex:1;justify-content:center;"
                (click)="onConfigUnit(selectedUnit()!)">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="1.5"/><path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M9.5 2.5l-.7.7M3.2 8.8l-.7.7"/></svg>
                Configurar
              </button>
              <button type="button" class="btn btn--ghost btn--sm" style="width:32px;padding:0;justify-content:center;">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 8.5l-2-2-1.5 1.5C6.5 7.5 5.5 6.5 5 5L6.5 3.5l-2-2L3 3c0 4 3 7 6.5 7.5l2-2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- New unit modal -->
    @if (showNewUnit()) {
      <emx-new-unit-wizard-modal
        (created)="onUnitCreated()"
        (closed)="showNewUnit.set(false)"
      />
    }

    <!-- Schedule modal -->
    @if (configuringUnit()) {
      <emx-unit-schedule-modal
        [unit]="configuringUnit()!"
        (saved)="onScheduleSaved()"
        (closed)="configuringUnit.set(null)"
      />
    }
  `,
})
export class FleetComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  private fleetApi = inject(FleetApiService);

  readonly ambulancias = signal<UnidadMovilDTO[]>([]);
  readonly fleetDashboard = signal<FlotaDashboardDTO | null>(null);
  readonly metricas = signal<FlotaMetricasDTO | null>(null);
  readonly loading = signal(false);
  readonly showNewUnit = signal(false);
  readonly configuringUnit = signal<UnidadMovilDTO | null>(null);
  readonly selectedUnit = signal<UnidadMovilDTO | null>(null);
  readonly fleetTab = signal<FleetTab>('TODAS');
  readonly unitGuardias = signal<GuardiaDTO[]>([]);
  readonly unitLogs = signal<LogTurnoDTO[]>([]);
  readonly detailLoading = signal(false);
  readonly page = signal(0);
  readonly pageSize = signal(10);

  readonly paginatedUnits = computed(() => {
    const units = this.filteredUnits();
    const start = this.page() * this.pageSize();
    return units.slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUnits().length / this.pageSize())));

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  readonly fleetTabs: { id: FleetTab; label: string }[] = [
    { id: 'TODAS', label: 'Todas' },
    { id: 'DISPONIBLE', label: 'Disponibles' },
    { id: 'SIN_COBERTURA', label: 'Sin cobertura' },
    { id: 'EN_SERVICIO', label: 'En servicio' },
    { id: 'MANTENIMIENTO', label: 'Mantenimiento' },
  ];

  readonly filteredUnits = computed(() => {
    const tab = this.fleetTab();
    const all = this.ambulancias();
    if (tab === 'TODAS') return all;
    if (tab === 'DISPONIBLE') return all.filter((u) => u.disponibleParaDespacho === true);
    if (tab === 'SIN_COBERTURA') return all.filter((u) => u.estado === 'DISPONIBLE' && u.disponibleParaDespacho !== true);
    if (tab === 'EN_SERVICIO') return all.filter((u) => u.estado === 'EN_SERVICIO');
    if (tab === 'MANTENIMIENTO') return all.filter((u) => u.estado === 'EN_TALLER' || u.estado === 'FUERA_SERVICIO' || u.estado === 'MANTENIMIENTO');
    return all;
  });

  readonly healthMetrics = computed(() => {
    const units = this.ambulancias();
    const avg = (values: (number | undefined)[]) => {
      const valid = values.filter((v): v is number => v != null);
      return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    };
    return [
      { label: 'Batería promedio',    value: avg(units.map((u) => u.bateria)) || 78 },
      { label: 'Combustible promedio', value: avg(units.map((u) => u.combustible)) || 65 },
      { label: 'Kit médico',           value: 92 },
      { label: 'Inspección al día',    value: 88 },
    ];
  });

  readonly headerKpis = computed(() => {
    const d = this.fleetDashboard();
    const activas = (d?.enRuta ?? 0) + (d?.enSitio ?? 0) + (d?.traslado ?? 0);
    return [
      { label: 'Flota total',   value: d?.totalUnidades ?? '—',  color: 'var(--text-primary)' },
      { label: 'Activas',       value: activas || '—',            color: 'var(--accent-cyan)' },
      { label: 'En servicio',   value: d?.disponibles ?? '—',     color: 'var(--accent-emerald)' },
      { label: 'Mantenim.',     value: d?.mantenimiento ?? '—',   color: 'var(--accent-red)' },
    ];
  });

  unitKmHoy(unit: UnidadMovilDTO | null): string {
    if (!unit) return '—';
    return unit.kmHoy != null ? `${unit.kmHoy} km` : '—';
  }
  unitServicios(unit: UnidadMovilDTO | null): string {
    if (!unit) return '—';
    return unit.serviciosHoy != null ? `${unit.serviciosHoy}` : '—';
  }

  tabCount(tabId: FleetTab): number {
    const all = this.ambulancias();
    if (tabId === 'TODAS') return all.length;
    if (tabId === 'DISPONIBLE') return all.filter((u) => u.disponibleParaDespacho === true).length;
    if (tabId === 'SIN_COBERTURA') return all.filter((u) => u.estado === 'DISPONIBLE' && u.disponibleParaDespacho !== true).length;
    if (tabId === 'EN_SERVICIO') return all.filter((u) => u.estado === 'EN_SERVICIO').length;
    if (tabId === 'MANTENIMIENTO') return all.filter((u) => u.estado === 'EN_TALLER' || u.estado === 'FUERA_SERVICIO' || u.estado === 'MANTENIMIENTO').length;
    return 0;
  }

  tRespLabel() {
    const t = this.metricas()?.tiempoRespuestaPromedio;
    return t != null ? `${t.toFixed(1)}m` : '—';
  }

  eficienciaLabel() {
    const e = this.metricas()?.eficiencia;
    return e != null ? `${Math.round(e)}%` : '—';
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.fleetApi
      .ambulancias()
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.ambulancias.set(data);
        this.loading.set(false);
        if (this.selectedUnit()) {
          const selectedId = this.selectedUnit()!.id;
          const refreshed = data.find((u) => u.id === selectedId) ?? null;
          this.selectedUnit.set(refreshed);
          if (refreshed) {
            this.loadUnitDetail(refreshed);
          } else {
            this.unitGuardias.set([]);
            this.unitLogs.set([]);
          }
        }
        this.fleetDashboard.set({
          totalUnidades: data.length,
          disponibles: data.filter((a) => a.disponibleParaDespacho === true).length,
          enRuta: data.filter((a) => a.estado === 'EN_SERVICIO' || a.estado === 'EN_RUTA').length,
          enSitio: data.filter((a) => a.estado === 'EN_SITIO').length,
          traslado: data.filter((a) => a.estado === 'TRASLADO').length,
          mantenimiento: data.filter((a) => a.estado === 'EN_TALLER' || a.estado === 'FUERA_SERVICIO' || a.estado === 'MANTENIMIENTO').length,
        });
      });

    this.fleetApi
      .dashboard()
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data) this.fleetDashboard.set(data);
      });

    this.fleetApi
      .metricas()
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.metricas.set(data));
  }

  onViewUnit(unit: UnidadMovilDTO): void {
    this.selectedUnit.set(unit);
    this.loadUnitDetail(unit);
  }

  loadUnitDetail(unit: UnidadMovilDTO): void {
    this.detailLoading.set(true);
    this.unitGuardias.set([]);
    this.unitLogs.set([]);
    this.fleetApi
      .getGuardias(unit.id)
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((g) => this.unitGuardias.set(g));
    this.fleetApi
      .getLogsTurnos(unit.id)
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((logs) => {
        this.unitLogs.set(logs);
        this.detailLoading.set(false);
      });
  }

  onConfigUnit(unit: UnidadMovilDTO): void {
    this.configuringUnit.set(unit);
  }

  onScheduleSaved(): void {
    this.loadAll();
    const unit = this.selectedUnit();
    if (unit) {
      this.loadUnitDetail(unit);
    }
  }

  onUnitCreated(): void {
    this.showNewUnit.set(false);
    this.loadAll();
  }

  unitEstadoBadge(estado?: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'badge badge--stable';
      case 'EN_RUTA': return 'badge badge--info';
      case 'EN_SITIO': return 'badge badge--urgent';
      case 'TRASLADO': return 'badge badge--info';
      case 'MANTENIMIENTO': return 'badge badge--critical';
      default: return 'badge';
    }
  }

  levelColor(pct: number): string {
    if (pct < 25) return 'var(--accent-red)';
    if (pct < 50) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  }

  inventoryFor(unit: UnidadMovilDTO): Array<{ nombre: string; pct: number | null }> {
    return [
      { nombre: 'Oxígeno',     pct: unit.oxigenoPct      ?? null },
      { nombre: 'Adrenalina',  pct: unit.adrenalinaPct   ?? null },
      { nombre: 'Suero 0.9%',  pct: unit.sueroSalinoPct  ?? null },
      { nombre: 'DEA',         pct: unit.deaPct           ?? null },
      { nombre: 'Morfina',     pct: unit.morfinaPct       ?? null },
      { nombre: 'Tubos',       pct: unit.tuboEndotraquealPct ?? null },
    ];
  }

  isExpired(dateString: string): boolean {
    const exp = new Date(dateString);
    const today = new Date();
    return exp.getTime() < today.getTime();
  }
}
