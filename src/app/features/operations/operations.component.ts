import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { EmergencyStore } from '../../core/stores/emergency.store';
import { FleetStore } from '../../core/stores/fleet.store';
import { WebsocketService } from '../../core/websocket/websocket.service';
import { AuthService } from '../../core/auth/auth.service';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { DashboardApiService } from '../../data-access/api/dashboard.api';
import { DashboardOperativoDTO } from '../../data-access/dto/dashboard.dto';
import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';
import { OperationsMapComponent } from '../../shared/components/map/operations-map/operations-map.component';
import { EmergencyListItemComponent } from '../../shared/components/emergency/emergency-list-item/emergency-list-item.component';
import { TelemetryBarComponent } from '../../shared/components/telemetry-bar/telemetry-bar.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { DispatchModalComponent } from '../../shared/components/emergency/dispatch-modal/dispatch-modal.component';
import { FormsModule } from '@angular/forms';

type FeedTab = 'TODAS' | 'SIN_ASIGNAR' | 'CRITICAS';

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
    DispatchModalComponent,
    FormsModule,
  ],
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- Main 2-column area -->
      <div class="flex-1 grid overflow-hidden" style="grid-template-columns: 1fr 340px;">

        <!-- Map (center/left) -->
        <div class="relative overflow-hidden">
          <!-- Map header overlay -->
          <div class="ops-map-header absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style="pointer-events: none;">
            <div class="flex items-center gap-2" style="pointer-events: none;">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                <path d="M8.5 1l-3.5 1.5-3.5-1.5v10l3.5 1.5 3.5-1.5 3.5 1.5V2.5L8.5 1z"/>
                <path d="M5 2.5v10M8.5 1v10.5"/>
              </svg>
              <span class="font-mono text-xs font-semibold" style="color: var(--text-primary);">Mapa Operacional</span>
              <span class="font-mono text-xs" style="color: var(--text-muted);">SSJ · VISTA MAESTRA</span>
            </div>
            <div class="flex items-center gap-1.5" style="pointer-events: auto;">
              <button type="button" class="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs"
                style="background: rgba(239,68,68,0.12); color: var(--accent-red); border: 1px solid rgba(239,68,68,0.25);">
                <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-red);display:inline-block;"></span>ROJO
              </button>
              <button type="button" class="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs"
                style="background: rgba(245,158,11,0.12); color: var(--accent-amber); border: 1px solid rgba(245,158,11,0.25);">
                <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-amber);display:inline-block;"></span>AMARILLO
              </button>
              <button type="button" class="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs"
                style="background: rgba(16,185,129,0.12); color: var(--accent-emerald); border: 1px solid rgba(16,185,129,0.25);">
                <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-emerald);display:inline-block;"></span>VERDE
              </button>
              <button type="button" class="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs"
                style="background: rgba(59,130,246,0.12); color: var(--accent-blue); border: 1px solid rgba(59,130,246,0.25);">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="1" y="4" width="10" height="5" rx="1"/><path d="M3 4V3a2 2 0 014 0v1"/>
                </svg>UNIDADES
              </button>
            </div>
          </div>
          <emx-operations-map
            [ambulances]="fleetStore.ambulances()"
            [emergencies]="emergencyStore.emergencies()"
            [selectedEmergencyId]="emergencyStore.selectedId()"
            [focusRequest]="mapFocusRequest()"
            [autoFit]="true"
            (selectEmergency)="emergencyStore.selectEmergency($event)"
            (selectAmbulance)="onSelectAmbulance($event)"
          />
        </div>

        <!-- Feed panel (right) -->
        <div
          class="ops-feed-panel flex flex-col overflow-hidden border-l"
        >
          <!-- Feed panel title -->
          <div class="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
            style="border-color: var(--border-glass);">
            <div class="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent-red)" stroke-width="1.5">
                <path d="M7 1c0 3-4 4-4 7a4 4 0 008 0c0-3-4-4-4-7z"/>
              </svg>
              <span class="font-semibold text-sm" style="color: var(--text-primary);">Feed de Emergencias</span>
              <span class="font-mono text-xs px-1.5 py-0.5 rounded"
                style="background: rgba(239,68,68,0.15); color: var(--accent-red);">
                {{ emergencyStore.emergencies().length }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 font-mono text-xs" style="color: var(--accent-emerald);">
              <span class="w-1.5 h-1.5 rounded-full" style="background: var(--accent-emerald);"></span>
              LIVE
            </div>
          </div>

          <!-- Panel header: tabs -->
          <div class="flex flex-col flex-shrink-0 border-b" style="border-color: var(--border-glass);">
            <div class="flex items-center px-2 pt-2 gap-0.5">
              @for (tab of feedTabs; track tab.id) {
                <button
                  type="button"
                  class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-t transition-all"
                  [style.color]="activeTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                  [style.border-bottom]="activeTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
                  (click)="activeTab.set(tab.id)"
                >
                  {{ tab.label }}
                  <span
                    class="font-mono text-xs px-1 rounded"
                    [style.background]="activeTab() === tab.id ? 'rgba(6,182,212,0.15)' : 'var(--surface-glass)'"
                    [style.color]="activeTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                  >{{ tab.count() }}</span>
                </button>
              }
            </div>
            <!-- Search -->
            <div class="px-2 pb-2 pt-1.5">
              <input
                type="text"
                [(ngModel)]="feedSearch"
                placeholder="Buscar por tipo o dirección..."
                class="w-full rounded-btn px-2.5 py-1.5 text-xs"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
              />
            </div>
          </div>

          <!-- List -->
          <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            @if (emergencyStore.loading()) {
              <emx-loading-state />
            } @else if (filteredEmergencies().length === 0) {
              <emx-empty-state message="Sin emergencias en esta vista" />
            } @else {
              @for (e of filteredEmergencies(); track e.id) {
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

    <!-- Call modal -->
    @if (callTicket()) {
      <emx-modal-shell title="Llamada de emergencia" (closed)="closeCall()">
        <div class="flex flex-col gap-4 py-1">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style="background: var(--accent-red-dim); border: 1px solid rgba(239,68,68,0.3);">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"
                style="color: var(--accent-red);">
                <path d="M3 3.5C3 9.85 9.15 16 15.5 16c.47 0 .83-.36.83-.83v-3.34a.83.83 0 00-.83-.83c-1.33 0-2.62-.21-3.82-.6a.83.83 0 00-.85.2L9.72 11.72a12.59 12.59 0 01-5.77-5.77l2.12-2.12a.83.83 0 00.2-.85A10.64 10.64 0 015.67 1a.83.83 0 00-.83-.83H1.5A.83.83 0 00.67 1C.67 2 1 3.5 3 5"/>
              </svg>
            </div>
            <div>
              <p class="font-mono font-semibold" style="color: var(--accent-cyan);">
                {{ callTicket()?.codigo ?? '#' + callTicket()?.id }}
              </p>
              <p class="text-sm mt-0.5" style="color: var(--text-secondary);">
                {{ callTicket()?.tipoEmergencia }} · {{ callTicket()?.direccion }}
              </p>
            </div>
          </div>
          <div class="glass rounded-panel px-4 py-3 flex flex-col gap-1">
            <p class="text-xs" style="color: var(--text-muted);">Protocolo de llamada</p>
            <p class="text-sm" style="color: var(--text-primary);">
              1. Confirmar identidad del solicitante<br>
              2. Verificar dirección exacta y punto de referencia<br>
              3. Estado actual del paciente<br>
              4. Confirmar unidad en camino
            </p>
          </div>
        </div>
        <div footer class="flex gap-2">
          <button type="button" class="btn btn--ghost btn--sm" (click)="closeCall()">Cerrar</button>
          <a
            [href]="'tel:+54'"
            class="btn btn--primary btn--sm"
            style="background: var(--accent-emerald);"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 2.5C2 6.09 5.91 10 9.5 10c.28 0 .5-.22.5-.5v-2A.5.5 0 009.5 7c-.8 0-1.57-.13-2.29-.36a.5.5 0 00-.51.12L5.43 7.93A7.55 7.55 0 012.07 5l1.27-1.27a.5.5 0 00.12-.51C3.13 2.57 3 1.8 3 1A.5.5 0 002.5.5h-2A.5.5 0 000 1C0 2 .5 3.5 2 5"/>
            </svg>
            Iniciar llamada
          </a>
        </div>
      </emx-modal-shell>
    }

    <!-- Dispatch modal -->
    @if (showDispatchModal() && dispatchingEmergency()) {
      <emx-dispatch-modal
        [emergency]="dispatchingEmergency()!"
        (dispatched)="onDispatched()"
        (closed)="closeDispatch()"
      />
    }
  `,
  styles: [`
    .ops-map-header {
      background: linear-gradient(to bottom, rgba(248, 250, 252, 0.92) 0%, rgba(248, 250, 252, 0.76) 58%, transparent 100%);
      border-bottom: 1px solid rgba(15, 23, 42, 0.07);
      backdrop-filter: blur(10px);
    }

    .ops-feed-panel {
      border-color: var(--border-glass);
      background:
        radial-gradient(700px 420px at 50% 110%, rgba(59, 130, 246, 0.06), transparent 65%),
        var(--bg-deep);
    }

    :host-context([data-theme="dark"]) .ops-map-header {
      background: linear-gradient(to bottom, rgba(2, 6, 23, 0.88) 0%, rgba(2, 6, 23, 0.68) 58%, transparent 100%);
      border-bottom-color: rgba(255, 255, 255, 0.06);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    }

    :host-context([data-theme="light"]) .ops-feed-panel {
      background:
        radial-gradient(650px 420px at 50% 105%, rgba(59, 130, 246, 0.08), transparent 65%),
        linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.94));
    }
  `],
})
export class OperationsComponent implements OnInit {
  readonly emergencyStore = inject(EmergencyStore);
  readonly fleetStore = inject(FleetStore);
  private ws = inject(WebsocketService);
  private auth = inject(AuthService);
  private fleetApi = inject(FleetApiService);
  private dashboardApi = inject(DashboardApiService);

  readonly dashboard = signal<DashboardOperativoDTO | null>(null);
  readonly selectedAmbulanceId = signal<number | null>(null);
  readonly mapFocusRequest = signal(0);

  readonly activeTab = signal<FeedTab>('TODAS');
  feedSearch = '';

  readonly filteredEmergencies = computed(() => {
    const all = this.emergencyStore.emergencies();
    const tab = this.activeTab();
    const q = this.feedSearch.toLowerCase().trim();

    let list = all;
    if (tab === 'SIN_ASIGNAR') list = all.filter((e) => !e.ambulanciaId);
    else if (tab === 'CRITICAS') list = all.filter((e) => e.prioridad === 'CRITICA');

    if (q) {
      list = list.filter(
        (e) =>
          e.tipoEmergencia?.toLowerCase().includes(q) ||
          e.direccion?.toLowerCase().includes(q),
      );
    }

    const prioOrder: Record<string, number> = { CRITICA: 0, URGENTE: 1, NORMAL: 2 };
    return [...list].sort((a, b) => {
      const pd = (prioOrder[a.prioridad ?? ''] ?? 3) - (prioOrder[b.prioridad ?? ''] ?? 3);
      if (pd !== 0) return pd;
      return (b.elapsedSeconds ?? 0) - (a.elapsedSeconds ?? 0);
    });
  });

  readonly feedTabs: { id: FeedTab; label: string; count: () => number }[] = [
    { id: 'TODAS', label: 'Activas', count: () => this.emergencyStore.emergencies().length },
    {
      id: 'SIN_ASIGNAR',
      label: 'Sin asignar',
      count: () => this.emergencyStore.emergencies().filter((e) => !e.ambulanciaId).length,
    },
    {
      id: 'CRITICAS',
      label: 'Críticas',
      count: () => this.emergencyStore.emergencies().filter((e) => e.prioridad === 'CRITICA').length,
    },
  ];

  // Call modal state
  readonly callTicket = signal<TicketAsistenciaDTO | null>(null);

  // Dispatch modal state
  readonly showDispatchModal = signal(false);
  readonly dispatchingEmergency = signal<TicketAsistenciaDTO | null>(null);

  ngOnInit(): void {
    this.emergencyStore.loadActivos();
    this.emergencyStore.startTicker();

    this.fleetApi.ambulancias().subscribe({
      next: (data) => this.fleetStore.setAmbulances(data),
    });

    this.dashboardApi.operativo().subscribe({
      next: (data) => this.dashboard.set(data),
    });

    const token = this.auth.getToken();
    if (token) {
      this.ws.connect(token);
      this.fleetStore.startLocationTracking();
      this.emergencyStore.startTicketTracking();
    }
  }

  onSelectAmbulance(id: number): void {
    this.selectedAmbulanceId.set(id);
  }

  onAssign(emergency: TicketAsistenciaDTO): void {
    this.dispatchingEmergency.set(emergency);
    this.showDispatchModal.set(true);
  }

  closeDispatch(): void {
    this.showDispatchModal.set(false);
    this.dispatchingEmergency.set(null);
  }

  onDispatched(): void {
    this.closeDispatch();
    this.emergencyStore.loadActivos();
  }

  onLocate(emergency: TicketAsistenciaDTO): void {
    this.emergencyStore.selectEmergency(emergency.id);
    this.mapFocusRequest.update((value) => value + 1);
  }

  onCall(emergency: TicketAsistenciaDTO): void {
    this.callTicket.set(emergency);
  }

  closeCall(): void {
    this.callTicket.set(null);
  }
}
