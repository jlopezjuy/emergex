import { Component, inject, signal, OnInit } from '@angular/core';
import { EmergencyStore } from '../../core/stores/emergency.store';
import { FleetStore } from '../../core/stores/fleet.store';
import { WebsocketService } from '../../core/websocket/websocket.service';
import { AuthService } from '../../core/auth/auth.service';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { DashboardApiService } from '../../data-access/api/dashboard.api';
import { DashboardOperativoDTO } from '../../data-access/dto/dashboard.dto';
import { TicketAsistenciaDTO, DespacharRequest } from '../../data-access/dto/ticket.dto';
import { UnidadMovilDTO } from '../../data-access/dto/ambulancia.dto';
import { OperationsMapComponent } from '../../shared/components/map/operations-map/operations-map.component';
import { EmergencyListItemComponent } from '../../shared/components/emergency/emergency-list-item/emergency-list-item.component';
import { TelemetryBarComponent } from '../../shared/components/telemetry-bar/telemetry-bar.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [
    OperationsMapComponent,
    EmergencyListItemComponent,
    TelemetryBarComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ModalShellComponent,
  ],
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- Main 2-column area -->
      <div class="flex-1 grid overflow-hidden" style="grid-template-columns: 1fr 340px;">

        <!-- Map (center/left) -->
        <div class="relative overflow-hidden p-3">
          <emx-operations-map
            [ambulances]="fleetStore.ambulances()"
            [emergencies]="emergencyStore.emergencies()"
            [selectedEmergencyId]="emergencyStore.selectedId()"
            (selectEmergency)="emergencyStore.selectEmergency($event)"
            (selectAmbulance)="onSelectAmbulance($event)"
          />
        </div>

        <!-- Feed panel (right) -->
        <div
          class="flex flex-col overflow-hidden border-l"
          style="border-color: var(--border-glass);"
        >
          <!-- Panel header -->
          <div
            class="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
            style="border-color: var(--border-glass);"
          >
            <span class="font-mono text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">
              Emergencias activas
            </span>
            <span class="badge badge--info font-mono">{{ emergencyStore.emergencies().length }}</span>
          </div>

          <!-- List -->
          <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            @if (emergencyStore.loading()) {
              <emx-loading-state />
            } @else if (emergencyStore.emergencies().length === 0) {
              <emx-empty-state message="Sin emergencias activas" />
            } @else {
              @for (e of emergencyStore.emergencies(); track e.id) {
                <emx-emergency-list-item
                  [emergency]="e"
                  [selected]="emergencyStore.selectedId() === e.id"
                  (assign)="onAssign($event)"
                  (locate)="onLocate($event)"
                  (call)="onCall($event)"
                />
              }
            }
          </div>
        </div>
      </div>

      <!-- Telemetry bar (bottom) -->
      <div
        class="px-4 py-3 border-t flex-shrink-0"
        style="height: 110px; border-color: var(--border-glass); background: var(--bg-elevated);"
      >
        <emx-telemetry-bar
          [ambulances]="fleetStore.ambulances()"
          [dashboard]="dashboard()"
        />
      </div>
    </div>

    <!-- Dispatch modal -->
    @if (showDispatchModal()) {
      <emx-modal-shell title="Despachar unidad" (closed)="closeDispatch()">
        @if (loadingUnits()) {
          <emx-loading-state />
        } @else if (availableUnits().length === 0) {
          <emx-empty-state message="Sin unidades disponibles" />
        } @else {
          <ul class="flex flex-col gap-2">
            @for (u of availableUnits(); track u.id) {
              <li>
                <label
                  class="flex items-center gap-3 px-3 py-2 rounded cursor-pointer"
                  style="border: 1px solid var(--border-glass); background: var(--surface-glass);"
                  [style.border-color]="selectedUnitId() === u.id ? 'var(--accent-cyan)' : 'var(--border-glass)'"
                >
                  <input type="radio" name="dispatchUnit" [value]="u.id" class="sr-only"
                    (change)="selectedUnitId.set(u.id)" />
                  <div class="flex-1">
                    <p class="font-mono font-semibold text-sm" style="color: var(--text-primary);">
                      {{ u.identificador ?? 'AMB-' + u.id }}
                    </p>
                    <p class="text-xs" style="color: var(--text-muted);">{{ u.tipo }}</p>
                  </div>
                  @if (selectedUnitId() === u.id) {
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"
                      style="color: var(--accent-cyan);">
                      <path d="M2 7l4 4 6-6"/>
                    </svg>
                  }
                </label>
              </li>
            }
          </ul>
        }

        <div footer class="flex gap-2">
          <button type="button" class="btn btn--ghost btn--sm" (click)="closeDispatch()">Cancelar</button>
          <button
            type="button"
            class="btn btn--primary btn--sm"
            [disabled]="!selectedUnitId() || dispatching()"
            (click)="confirmDispatch()"
          >{{ dispatching() ? 'Despachando…' : 'Despachar' }}</button>
        </div>
      </emx-modal-shell>
    }
  `,
})
export class OperationsComponent implements OnInit {
  readonly emergencyStore = inject(EmergencyStore);
  readonly fleetStore = inject(FleetStore);
  private ws = inject(WebsocketService);
  private auth = inject(AuthService);
  private fleetApi = inject(FleetApiService);
  private emergencyApi = inject(EmergencyApiService);
  private dashboardApi = inject(DashboardApiService);

  readonly dashboard = signal<DashboardOperativoDTO | null>(null);
  readonly selectedAmbulanceId = signal<number | null>(null);

  // Dispatch modal state
  readonly showDispatchModal = signal(false);
  readonly dispatchingTicket = signal<TicketAsistenciaDTO | null>(null);
  readonly availableUnits = signal<UnidadMovilDTO[]>([]);
  readonly selectedUnitId = signal<number | null>(null);
  readonly dispatching = signal(false);
  readonly loadingUnits = signal(false);

  ngOnInit(): void {
    // Load emergencies (falls back to mock on error)
    this.emergencyStore.loadActivos();
    this.emergencyStore.startTicker();

    // Load fleet
    this.fleetApi.ambulancias().subscribe({
      next: (data) => this.fleetStore.setAmbulances(data),
      error: (err) => console.error('[Operations] Fleet load error', err),
    });

    // Load dashboard
    this.dashboardApi.operativo().subscribe({
      next: (data) => this.dashboard.set(data),
      error: (err) => console.error('[Operations] Dashboard load error', err),
    });

    // WebSocket
    const token = this.auth.getToken();
    if (token) {
      this.ws.connect(token);
      this.fleetStore.startLocationTracking();
    }
  }

  onSelectAmbulance(id: number): void {
    this.selectedAmbulanceId.set(id);
  }

  onAssign(emergency: TicketAsistenciaDTO): void {
    this.dispatchingTicket.set(emergency);
    this.selectedUnitId.set(null);
    this.showDispatchModal.set(true);
    this.loadingUnits.set(true);
    this.fleetApi.ambulanciasDisponibles().subscribe({
      next: (data) => {
        this.availableUnits.set(data);
        this.loadingUnits.set(false);
      },
      error: () => {
        this.availableUnits.set([]);
        this.loadingUnits.set(false);
      },
    });
  }

  closeDispatch(): void {
    this.showDispatchModal.set(false);
    this.dispatchingTicket.set(null);
    this.selectedUnitId.set(null);
  }

  confirmDispatch(): void {
    const ticket = this.dispatchingTicket();
    const unitId = this.selectedUnitId();
    if (!ticket || !unitId) return;
    this.dispatching.set(true);
    const req: DespacharRequest = { ambulanciaId: unitId };
    this.emergencyApi.despachar(ticket.id, req).subscribe({
      next: () => {
        this.dispatching.set(false);
        this.closeDispatch();
        this.emergencyStore.loadActivos();
      },
      error: () => this.dispatching.set(false),
    });
  }

  onLocate(emergency: TicketAsistenciaDTO): void {
    this.emergencyStore.selectEmergency(emergency.id);
  }

  onCall(emergency: TicketAsistenciaDTO): void {
    console.log('Call for', emergency.id);
  }
}
