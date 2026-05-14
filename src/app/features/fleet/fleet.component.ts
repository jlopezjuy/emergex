import { Component, inject, signal, OnInit } from '@angular/core';
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
    <div class="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      <!-- Page header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Gestión de Flota</h1>
          <p class="text-sm mt-0.5" style="color: var(--text-muted);">Estado operativo de unidades móviles</p>
        </div>
        <button class="btn btn--primary btn--sm" (click)="showNewUnit.set(true)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 1v10M1 6h10"/>
          </svg>
          Nueva unidad
        </button>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-4 gap-4">
        <emx-kpi-card label="Total" [value]="fleetDashboard()?.totalUnidades" />
        <emx-kpi-card label="Disponibles" [value]="fleetDashboard()?.disponibles" accentColor="emerald" />
        <emx-kpi-card label="En ruta" [value]="fleetDashboard()?.enRuta" accentColor="blue" />
        <emx-kpi-card label="Mantenim." [value]="fleetDashboard()?.mantenimiento" accentColor="red" />
      </div>

      <!-- Status donut + table -->
      <div class="grid gap-6" style="grid-template-columns: 280px 1fr;">
        <!-- Donut -->
        <emx-glass-card>
          <h2 class="font-mono text-xs uppercase tracking-wider mb-4" style="color: var(--text-muted);">
            Distribución de estado
          </h2>
          <emx-fleet-status-donut [dashboard]="fleetDashboard()" />
        </emx-glass-card>

        <!-- Table -->
        <emx-glass-card extraClass="!p-0 overflow-hidden">
          <div class="px-4 pt-4 pb-2 border-b" style="border-color: var(--border-glass);">
            <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
              Unidades móviles
            </h2>
          </div>
          @if (loading()) {
            <emx-loading-state />
          } @else {
            <emx-fleet-table
              [units]="ambulancias()"
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
    // Navigate to detail — kept simple: highlight the row inline
    // A full /fleet/:id route is not defined in requirements; config opens modal
    this.configuringUnit.set(unit);
  }

  onConfigUnit(unit: UnidadMovilDTO): void {
    this.configuringUnit.set(unit);
  }

  onUnitCreated(): void {
    this.showNewUnit.set(false);
    this.loadAll();
  }
}
