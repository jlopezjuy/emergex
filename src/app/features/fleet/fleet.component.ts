import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../data-access/api/fleet.api';
import {
  UnidadMovilDTO,
  FlotaDashboardDTO,
  FlotaMetricasDTO,
} from '../../data-access/dto/ambulancia.dto';
import { MOCK_AMBULANCIAS } from '../../data-access/mock/ambulance.mock';
import { FleetStatusDonutComponent } from '../../shared/components/fleet/fleet-status-donut/fleet-status-donut.component';
import { FleetTableComponent } from '../../shared/components/fleet/fleet-table/fleet-table.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { NewUnitModalComponent } from './new-unit-modal/new-unit-modal.component';
import { UnitScheduleModalComponent } from './unit-schedule-modal/unit-schedule-modal.component';

type FleetTab = 'TODAS' | 'DISPONIBLE' | 'EN_RUTA' | 'EN_SITIO' | 'TRASLADO' | 'MANTENIMIENTO';

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [
    FleetStatusDonutComponent,
    FleetTableComponent,
    KpiCardComponent,
    GlassCardComponent,
    LoadingStateComponent,
    NewUnitModalComponent,
    UnitScheduleModalComponent,
  ],
  template: `
    <div class="h-full flex overflow-hidden">

      <!-- Left scrollable section -->
      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        <!-- Page header -->
        <div class="flex items-center gap-4">
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
            <p class="font-mono text-xs mt-0.5" style="color:var(--text-muted);">UNIDADES MÓVILES · CDMX METRO NORTE</p>
          </div>
          <!-- Inline KPIs -->
          <div class="flex items-center gap-0 ml-4 rounded-lg overflow-hidden flex-shrink-0" style="border:1px solid var(--border-glass);background:var(--bg-elevated);">
            @for (kpi of headerKpis(); track kpi.label) {
              <div class="px-4 py-2 text-center" style="border-right:1px solid var(--border-glass);"
                [style.borderRight]="$last ? 'none' : '1px solid var(--border-glass)'">
                <div class="font-mono text-xs uppercase tracking-wider" style="color:var(--text-muted);">{{ kpi.label }}</div>
                <div class="font-mono font-bold text-lg leading-none mt-1" [style.color]="kpi.color">{{ kpi.value }}</div>
              </div>
            }
          </div>
          <div class="flex items-center gap-2 ml-auto flex-shrink-0">
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
        <div class="grid gap-6" style="grid-template-columns: 280px 1fr;">
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
              <div class="flex items-center gap-0.5">
                @for (tab of fleetTabs; track tab.id) {
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs font-medium rounded-t transition-all"
                    [style.color]="fleetTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                    [style.border-bottom]="fleetTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
                    (click)="fleetTab.set(tab.id)"
                  >{{ tab.label }} <span class="font-mono opacity-60">{{ tabCount(tab.id) }}</span></button>
                }
              </div>
            </div>
            @if (loading()) {
              <emx-loading-state />
            } @else {
              <emx-fleet-table
                [units]="filteredUnits()"
                (viewUnit)="onViewUnit($event)"
                (configUnit)="onConfigUnit($event)"
              />
            }
          </emx-glass-card>
        </div>

        <!-- Metrics strip -->
        @if (metricas()) {
          <div class="grid grid-cols-4 gap-4">
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
        <div
          class="flex flex-col overflow-y-auto flex-shrink-0"
          style="width:320px; border-left:1px solid var(--border-glass); background:var(--bg-elevated);"
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
            <div class="flex items-center gap-2">
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
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
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
                  {{ unitKmHoy(selectedUnit()!.id) }} km
                </div>
              </div>
              <div>
                <div class="eyebrow">Servicios</div>
                <div class="font-mono" style="font-size:13px;color:var(--text-primary);margin-top:3px;">
                  {{ unitServicios(selectedUnit()!.id) }} hoy
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
              @for (item of inventoryFor(selectedUnit()!.id ?? 1); track item.nombre) {
                <div>
                  <div class="flex items-center justify-between mb-0.5">
                    <span style="font-size:11px;color:var(--text-secondary);">{{ item.nombre }}</span>
                    <span class="font-mono" style="font-size:10px;"
                      [style.color]="item.pct < 30 ? 'var(--accent-red)' : 'var(--text-muted)'">
                      {{ item.pct }}%
                    </span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;border-radius:2px;transition:width 0.3s;"
                      [style.width.%]="item.pct"
                      [style.background]="item.pct < 30 ? 'var(--accent-red)' : item.pct < 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)'"></div>
                  </div>
                </div>
              }
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2">
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
      <emx-new-unit-modal
        (created)="onUnitCreated()"
        (closed)="showNewUnit.set(false)"
      />
    }

    <!-- Schedule modal -->
    @if (configuringUnit()) {
      <emx-unit-schedule-modal
        [unit]="configuringUnit()!"
        (closed)="configuringUnit.set(null)"
      />
    }
  `,
})
export class FleetComponent implements OnInit {
  private fleetApi = inject(FleetApiService);

  readonly ambulancias = signal<UnidadMovilDTO[]>([]);
  readonly fleetDashboard = signal<FlotaDashboardDTO | null>(null);
  readonly metricas = signal<FlotaMetricasDTO | null>(null);
  readonly loading = signal(false);
  readonly showNewUnit = signal(false);
  readonly configuringUnit = signal<UnidadMovilDTO | null>(null);
  readonly selectedUnit = signal<UnidadMovilDTO | null>(null);
  readonly fleetTab = signal<FleetTab>('TODAS');

  readonly fleetTabs: { id: FleetTab; label: string }[] = [
    { id: 'TODAS', label: 'Todas' },
    { id: 'DISPONIBLE', label: 'Disponibles' },
    { id: 'EN_RUTA', label: 'En ruta' },
    { id: 'EN_SITIO', label: 'En sitio' },
    { id: 'TRASLADO', label: 'Traslado' },
    { id: 'MANTENIMIENTO', label: 'Mantenimiento' },
  ];

  readonly filteredUnits = computed(() => {
    const tab = this.fleetTab();
    const all = this.ambulancias();
    if (tab === 'TODAS') return all;
    return all.filter((u) => u.estado === tab);
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

  unitKmHoy(id: number | undefined): number { return [187, 142, 98, 211, 73, 165][(id ?? 1) % 6]; }
  unitServicios(id: number | undefined): number { return [4, 3, 7, 2, 5, 6][(id ?? 1) % 6]; }

  tabCount(tabId: FleetTab): number {
    const all = this.ambulancias();
    if (tabId === 'TODAS') return all.length;
    return all.filter((u) => u.estado === tabId).length;
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
      .pipe(catchError(() => of(MOCK_AMBULANCIAS)))
      .subscribe((data) => {
        this.ambulancias.set(data);
        this.loading.set(false);
        // Auto-select first unit so right panel is visible on load
        if (data.length > 0 && !this.selectedUnit()) {
          this.selectedUnit.set(data[0]);
        }
        this.fleetDashboard.set({
          totalUnidades: data.length,
          disponibles: data.filter((a) => a.estado === 'DISPONIBLE').length,
          enRuta: data.filter((a) => a.estado === 'EN_RUTA').length,
          enSitio: data.filter((a) => a.estado === 'EN_SITIO').length,
          traslado: data.filter((a) => a.estado === 'TRASLADO').length,
          mantenimiento: data.filter((a) => a.estado === 'MANTENIMIENTO').length,
        });
      });

    this.fleetApi
      .dashboard()
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (data) this.fleetDashboard.set(data);
      });

    this.fleetApi
      .metricas()
      .pipe(catchError(() => of(null)))
      .subscribe((data) => this.metricas.set(data));
  }

  onViewUnit(unit: UnidadMovilDTO): void {
    this.selectedUnit.set(unit);
  }

  onConfigUnit(unit: UnidadMovilDTO): void {
    this.configuringUnit.set(unit);
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

  inventoryFor(unitId: number): Array<{ nombre: string; pct: number }> {
    const seed = unitId % 5;
    return [
      { nombre: 'Oxígeno',     pct: [85, 45, 92, 20, 70][seed] },
      { nombre: 'Adrenalina',  pct: [60, 80, 35, 90, 55][seed] },
      { nombre: 'Suero 0.9%',  pct: [40, 65, 78, 50, 25][seed] },
      { nombre: 'DEA',         pct: [95, 95, 95, 95, 95][seed] },
      { nombre: 'Morfina',     pct: [30, 18, 65, 40, 82][seed] },
      { nombre: 'Tubos',       pct: [70, 50, 45, 80, 35][seed] },
    ];
  }
}
