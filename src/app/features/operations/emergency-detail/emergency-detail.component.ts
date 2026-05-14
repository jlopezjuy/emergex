import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import {
  TicketDetalleDTO,
  LogEstadoTicketDTO,
  SignosVitalesDTO,
  ProcedimientoDTO,
  MedicacionDTO,
  DespacharRequest,
  CerrarTicketRequest,
} from '../../../data-access/dto/ticket.dto';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { UnidadMovilDTO } from '../../../data-access/dto/ambulancia.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { GlassCardComponent } from '../../../shared/components/glass-card/glass-card.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-emergency-detail',
  standalone: true,
  imports: [
    LoadingStateComponent,
    ErrorStateComponent,
    GlassCardComponent,
    ModalShellComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="load()" />
      } @else if (detalle()) {
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <button type="button" class="btn btn--ghost btn--sm" (click)="goBack()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 2L4 7l5 5"/>
              </svg>
              Volver
            </button>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-semibold text-lg" style="color: var(--text-primary);">
                  {{ ticket()?.codigo ?? '#' + ticket()?.id }}
                </span>
                <span
                  class="badge font-mono text-xs px-2 py-0.5"
                  [class]="priorityBadgeClass()"
                >{{ ticket()?.prioridad }}</span>
              </div>
              <p class="text-xs mt-0.5" style="color: var(--text-muted);">
                {{ ticket()?.tipoEmergencia }} · {{ ticket()?.estado }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            @if (canDispatch()) {
              <button
                type="button"
                class="btn btn--primary btn--sm"
                (click)="openDispatch()"
              >Despachar</button>
            }
            @if (canClose()) {
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                (click)="cerrar()"
              >Cerrar</button>
              <button
                type="button"
                class="btn btn--danger btn--sm"
                (click)="cancelar()"
              >Cancelar</button>
            }
          </div>
        </div>

        <!-- Body 2-col -->
        <div class="grid gap-6" style="grid-template-columns: 1fr 1fr;">
          <!-- LEFT PANEL -->
          <div class="flex flex-col gap-4">
            <!-- Patient info -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Paciente</h2>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt class="text-xs" style="color: var(--text-muted);">ID Paciente</dt>
                  <dd class="font-mono mt-0.5" style="color: var(--text-primary);">{{ ticket()?.pacienteId ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs" style="color: var(--text-muted);">Descripción</dt>
                  <dd class="mt-0.5" style="color: var(--text-primary);">{{ ticket()?.pacienteDescripcion ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs" style="color: var(--text-muted);">Prioridad</dt>
                  <dd class="font-semibold mt-0.5" [style.color]="priorityColor()">{{ ticket()?.prioridad }}</dd>
                </div>
                <div>
                  <dt class="text-xs" style="color: var(--text-muted);">Operador</dt>
                  <dd class="mt-0.5" style="color: var(--text-primary);">{{ ticket()?.operador ?? '—' }}</dd>
                </div>
              </dl>
            </emx-glass-card>

            <!-- Location -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Ubicación</h2>
              <p class="text-sm" style="color: var(--text-primary);">{{ ticket()?.direccion ?? '—' }}</p>
              @if (ticket()?.latitud) {
                <p class="font-mono text-xs mt-1" style="color: var(--text-muted);">
                  {{ ticket()?.latitud }}, {{ ticket()?.longitud }}
                </p>
              }
            </emx-glass-card>

            <!-- Assigned unit -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Unidad asignada</h2>
              @if (ticket()?.ambulanciaId) {
                <p class="font-mono font-semibold" style="color: var(--accent-cyan);">
                  AMB-{{ ticket()?.ambulanciaId }}
                </p>
                <p class="text-sm mt-0.5" style="color: var(--text-secondary);">{{ ticket()?.unidadAsignada }}</p>
              } @else {
                <p class="text-sm" style="color: var(--text-muted);">Sin unidad asignada</p>
              }

              <!-- Crew -->
              @if (detalle()?.tripulacion && detalle()!.tripulacion!.length > 0) {
                <div class="mt-3 border-t pt-3" style="border-color: var(--border-glass);">
                  <h3 class="text-xs font-semibold mb-2" style="color: var(--text-muted);">Tripulación</h3>
                  <ul class="flex flex-col gap-1">
                    @for (m of detalle()!.tripulacion!; track m.id) {
                      <li class="text-sm flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full" style="background: var(--accent-blue);"></span>
                        <span style="color: var(--text-primary);">{{ m.nombre ?? 'Prof. ' + m.id }}</span>
                        <span class="text-xs" style="color: var(--text-muted);">{{ m.rol }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </emx-glass-card>
          </div>

          <!-- RIGHT PANEL -->
          <div class="flex flex-col gap-4">
            <!-- Timeline -->
            <emx-glass-card>
              <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Timeline</h2>
              @if (timeline().length === 0) {
                <emx-empty-state message="Sin eventos registrados" />
              } @else {
                <ol class="flex flex-col gap-3">
                  @for (ev of timeline(); track ev.id) {
                    <li class="flex gap-3">
                      <div class="flex flex-col items-center">
                        <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style="background: var(--accent-cyan);"></div>
                        <div class="flex-1 w-px mt-1" style="background: var(--border-glass);"></div>
                      </div>
                      <div class="pb-3">
                        <p class="text-xs font-mono" style="color: var(--text-muted);">{{ formatDate(ev.fecha) }}</p>
                        <p class="text-sm font-semibold mt-0.5" style="color: var(--text-primary);">{{ ev.estado }}</p>
                        @if (ev.notas) {
                          <p class="text-xs mt-0.5" style="color: var(--text-secondary);">{{ ev.notas }}</p>
                        }
                        @if (ev.operador) {
                          <p class="text-xs mt-0.5" style="color: var(--text-muted);">por {{ ev.operador }}</p>
                        }
                      </div>
                    </li>
                  }
                </ol>
              }
            </emx-glass-card>

            <!-- Signs -->
            @if (signos().length > 0) {
              <emx-glass-card>
                <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Signos vitales</h2>
                <div class="overflow-x-auto">
                  <table class="w-full text-xs font-mono">
                    <thead>
                      <tr style="color: var(--text-muted);">
                        <th class="text-left pb-2">Hora</th>
                        <th class="text-right pb-2">FC</th>
                        <th class="text-right pb-2">PA Sis</th>
                        <th class="text-right pb-2">PA Dia</th>
                        <th class="text-right pb-2">SpO₂</th>
                        <th class="text-right pb-2">Temp</th>
                        <th class="text-right pb-2">FR</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of signos(); track s.id) {
                        <tr style="border-top: 1px solid var(--border-glass);">
                          <td class="py-1.5" style="color: var(--text-muted);">{{ formatTime(s.timestamp) }}</td>
                          <td class="text-right py-1.5" style="color: var(--text-primary);">{{ s.frecuenciaCardiaca ?? '—' }}</td>
                          <td class="text-right py-1.5" style="color: var(--text-primary);">{{ s.presionSistolica ?? '—' }}</td>
                          <td class="text-right py-1.5" style="color: var(--text-primary);">{{ s.presionDiastolica ?? '—' }}</td>
                          <td class="text-right py-1.5" style="color: var(--text-primary);">{{ s.saturacionO2 ?? '—' }}</td>
                          <td class="text-right py-1.5" style="color: var(--text-primary);">{{ s.temperatura ?? '—' }}</td>
                          <td class="text-right py-1.5" style="color: var(--text-primary);">{{ s.frecuenciaRespiratoria ?? '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </emx-glass-card>
            }

            <!-- Procedures -->
            @if (procedimientos().length > 0) {
              <emx-glass-card>
                <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Procedimientos</h2>
                <ul class="flex flex-col gap-2">
                  @for (p of procedimientos(); track p.id) {
                    <li class="text-sm" style="border-top: 1px solid var(--border-glass); padding-top: 0.5rem;">
                      <p style="color: var(--text-primary);">{{ p.descripcion }}</p>
                      <p class="text-xs mt-0.5" style="color: var(--text-muted);">
                        {{ p.ejecutadoPor }} · {{ formatTime(p.timestamp) }}
                      </p>
                    </li>
                  }
                </ul>
              </emx-glass-card>
            }

            <!-- Medication -->
            @if (medicacion().length > 0) {
              <emx-glass-card>
                <h2 class="font-mono text-xs uppercase tracking-wider mb-3" style="color: var(--text-muted);">Medicación</h2>
                <ul class="flex flex-col gap-2">
                  @for (m of medicacion(); track m.id) {
                    <li class="text-sm" style="border-top: 1px solid var(--border-glass); padding-top: 0.5rem;">
                      <p class="font-semibold" style="color: var(--text-primary);">{{ m.medicamento }}</p>
                      <p class="text-xs mt-0.5" style="color: var(--text-secondary);">
                        {{ m.dosis }} · {{ m.via }} · por {{ m.administradoPor }}
                      </p>
                    </li>
                  }
                </ul>
              </emx-glass-card>
            }
          </div>
        </div>
      }
    </div>

    <!-- Dispatch modal -->
    @if (showDispatch()) {
      <emx-modal-shell title="Despachar unidad" (closed)="showDispatch.set(false)">
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
                  <input type="radio" name="unit" [value]="u.id" class="sr-only"
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
          <button type="button" class="btn btn--ghost btn--sm" (click)="showDispatch.set(false)">Cancelar</button>
          <button
            type="button"
            class="btn btn--primary btn--sm"
            [disabled]="!selectedUnitId() || dispatching()"
            (click)="despachar()"
          >{{ dispatching() ? 'Despachando…' : 'Despachar' }}</button>
        </div>
      </emx-modal-shell>
    }
  `,
})
export class EmergencyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emergencyApi = inject(EmergencyApiService);
  private fleetApi = inject(FleetApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detalle = signal<TicketDetalleDTO | null>(null);
  readonly timeline = signal<LogEstadoTicketDTO[]>([]);

  readonly showDispatch = signal(false);
  readonly loadingUnits = signal(false);
  readonly availableUnits = signal<UnidadMovilDTO[]>([]);
  readonly selectedUnitId = signal<number | null>(null);
  readonly dispatching = signal(false);

  readonly ticket = computed(() => this.detalle()?.ticket ?? null);
  readonly signos = computed(() => this.detalle()?.signos ?? []);
  readonly procedimientos = computed(() => this.detalle()?.procedimientos ?? []);
  readonly medicacion = computed(() => this.detalle()?.medicacion ?? []);

  readonly canDispatch = computed(() => {
    const estado = this.ticket()?.estado;
    return estado === 'RECIBIDO' || estado === 'EN_ESPERA';
  });

  readonly canClose = computed(() => {
    const estado = this.ticket()?.estado;
    return estado !== 'CERRADO' && estado !== 'CANCELADO';
  });

  readonly priorityColor = computed(() => {
    const p = this.ticket()?.prioridad;
    if (p === 'CRITICA') return 'var(--accent-red)';
    if (p === 'URGENTE') return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  });

  readonly priorityBadgeClass = computed(() => {
    const p = this.ticket()?.prioridad;
    if (p === 'CRITICA') return 'badge badge--critical';
    if (p === 'URGENTE') return 'badge badge--urgent';
    return 'badge badge--stable';
  });

  private get ticketId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.ticketId;
    this.loading.set(true);
    this.error.set(null);

    this.emergencyApi.getDetalle(id).subscribe({
      next: (data) => {
        this.detalle.set(data as TicketDetalleDTO);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el detalle del ticket');
        this.loading.set(false);
      },
    });

    this.emergencyApi.getTimeline(id).subscribe({
      next: (data) => this.timeline.set(data),
      error: () => this.timeline.set([]),
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  openDispatch(): void {
    this.showDispatch.set(true);
    this.selectedUnitId.set(null);
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

  despachar(): void {
    const unitId = this.selectedUnitId();
    if (!unitId) return;
    this.dispatching.set(true);
    const req: DespacharRequest = { ambulanciaId: unitId };
    this.emergencyApi.despachar(this.ticketId, req).subscribe({
      next: () => {
        this.dispatching.set(false);
        this.showDispatch.set(false);
        this.load();
      },
      error: () => this.dispatching.set(false),
    });
  }

  cerrar(): void {
    const req: CerrarTicketRequest = {};
    this.emergencyApi.cerrar(this.ticketId, req).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Error al cerrar', err),
    });
  }

  cancelar(): void {
    const req: CerrarTicketRequest = {};
    this.emergencyApi.cancelar(this.ticketId, req).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Error al cancelar', err),
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}
