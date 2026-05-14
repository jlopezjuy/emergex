import { Component, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { UnidadMovilDTO, FlotaDashboardDTO } from '../../data-access/dto/ambulancia.dto';
import { MOCK_AMBULANCIAS } from '../../data-access/mock/ambulance.mock';
import { FleetStatusDonutComponent } from '../../shared/components/fleet/fleet-status-donut/fleet-status-donut.component';
import { FleetTableComponent } from '../../shared/components/fleet/fleet-table/fleet-table.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [
    FleetStatusDonutComponent,
    FleetTableComponent,
    KpiCardComponent,
    GlassCardComponent,
    LoadingStateComponent,
  ],
  template: `
    <div class="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      <!-- Page header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Gestión de Flota</h1>
          <p class="text-sm mt-0.5" style="color: var(--text-muted);">Estado operativo de unidades móviles</p>
        </div>
        <button class="btn btn--primary btn--sm">
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

      <!-- Selected unit detail -->
      @if (selectedUnit()) {
        <emx-glass-card>
          <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">
            Detalle: {{ selectedUnit()!.identificador }}
          </h2>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span style="color: var(--text-muted);">Tipo</span>
              <p class="font-semibold mt-0.5" style="color: var(--text-primary);">{{ selectedUnit()!.tipo }}</p>
            </div>
            <div>
              <span style="color: var(--text-muted);">Tripulación</span>
              <p class="font-semibold mt-0.5" style="color: var(--text-primary);">{{ selectedUnit()!.tripulacion ?? '—' }}</p>
            </div>
            <div>
              <span style="color: var(--text-muted);">Ticket activo</span>
              <p class="font-mono font-semibold mt-0.5" style="color: var(--accent-cyan);">
                {{ selectedUnit()!.ticketActivo ?? '—' }}
              </p>
            </div>
          </div>
        </emx-glass-card>
      }
    </div>
  `,
})
export class FleetComponent implements OnInit {
  private fleetApi = inject(FleetApiService);

  readonly ambulancias = signal<UnidadMovilDTO[]>([]);
  readonly fleetDashboard = signal<FlotaDashboardDTO | null>(null);
  readonly loading = signal(false);
  readonly selectedUnit = signal<UnidadMovilDTO | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.fleetApi
      .ambulancias()
      .pipe(catchError(() => of(MOCK_AMBULANCIAS)))
      .subscribe((data) => {
        this.ambulancias.set(data);
        this.loading.set(false);
        // Compute dashboard from data
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
  }

  onViewUnit(unit: UnidadMovilDTO): void {
    this.selectedUnit.set(unit);
  }

  onConfigUnit(unit: UnidadMovilDTO): void {
    console.log('Config unit', unit.id);
  }
}
