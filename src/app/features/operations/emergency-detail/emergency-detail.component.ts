import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import {
  TicketDetalleDTO,
  LogEstadoTicketDTO,
  CerrarTicketRequest,
  SignosVitalesDTO,
} from '../../../data-access/dto/ticket.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { GlassCardComponent } from '../../../shared/components/glass-card/glass-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DispatchModalComponent } from '../../../shared/components/emergency/dispatch-modal/dispatch-modal.component';
import { SparklineComponent } from '../../../shared/components/charts/sparkline/sparkline.component';

interface StatusStep {
  id: string;
  label: string;
}

const ALL_STEPS: StatusStep[] = [
  { id: 'RECIBIDO',   label: 'Recibido'   },
  { id: 'DESPACHADO', label: 'Despachado' },
  { id: 'EN_CAMINO',  label: 'En camino'  },
  { id: 'EN_SITIO',   label: 'En sitio'   },
  { id: 'TRASLADO',   label: 'Traslado'   },
  { id: 'ENTREGADO',  label: 'Entregado'  },
  { id: 'CERRADO',    label: 'Cerrado'    },
];

@Component({
  selector: 'app-emergency-detail',
  standalone: true,
  imports: [
    LoadingStateComponent,
    ErrorStateComponent,
    GlassCardComponent,
    EmptyStateComponent,
    DispatchModalComponent,
    SparklineComponent,
  ],
  template: `
    <div class="flex flex-col h-full overflow-hidden" style="background: var(--bg-base);">

      <!-- ── HEADER ── -->
      <div class="flex items-center justify-between flex-wrap gap-3 px-6 py-4"
           style="border-bottom: 1px solid var(--border-glass); background: var(--bg-surface);">
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
              <span class="badge font-mono text-xs px-2 py-0.5" [class]="priorityBadgeClass()">
                {{ ticket()?.prioridad }}
              </span>
            </div>
            <p class="text-xs mt-0.5" style="color: var(--text-muted);">
              {{ ticket()?.tipoEmergencia }} · {{ ticket()?.estado }}
            </p>
          </div>
        </div>

        <div class="flex gap-2">
          @if (canDispatch()) {
            <button type="button" class="btn btn--primary btn--sm" (click)="openDispatch()">Despachar</button>
          }
          @if (canClose()) {
            <button type="button" class="btn btn--ghost btn--sm" (click)="cerrar()">Cerrar</button>
            <button type="button" class="btn btn--danger btn--sm" (click)="cancelar()">Cancelar</button>
          }
        </div>
      </div>

      <!-- ── BODY ── -->
      <div class="flex-1 overflow-y-auto p-6">
        @if (loading()) {
          <emx-loading-state />
        } @else if (error()) {
          <emx-error-state [message]="error()!" (retry)="load()" />
        } @else if (detalle()) {

          <!-- 3-column grid -->
          <div class="grid gap-5 h-full" style="grid-template-columns: 340px 1fr 300px; align-items: start;">

            <!-- ══════════════════════════════════
                 COLUMNA LEFT — Paciente + Clínica
                 ══════════════════════════════════ -->
            <div class="flex flex-col gap-4">

              <!-- 1. Patient Card -->
              <emx-glass-card>
                <h2 class="section-label">Paciente</h2>

                <!-- Avatar + nombre -->
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-mono font-bold text-sm text-white"
                       style="background: linear-gradient(135deg, var(--accent-red), #b91c1c);">
                    {{ patientInitials() }}
                  </div>
                  <div>
                    <p class="font-semibold text-sm" style="color: var(--text-primary);">
                      {{ ticket()?.pacienteDescripcion ?? 'Paciente no identificado' }}
                    </p>
                    <p class="text-xs font-mono mt-0.5" style="color: var(--text-muted);">
                      ID {{ ticket()?.pacienteId ?? '—' }}
                    </p>
                  </div>
                </div>

                <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt class="text-xs" style="color: var(--text-muted);">Tipo sangre</dt>
                    <dd class="mt-0.5">
                      <!-- No existe en DTO; mostrar placeholder -->
                      <span class="text-xs" style="color: var(--text-muted);">—</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs" style="color: var(--text-muted);">Operador</dt>
                    <dd class="mt-0.5 text-xs" style="color: var(--text-primary);">{{ ticket()?.operador ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs" style="color: var(--text-muted);">Prioridad</dt>
                    <dd class="font-semibold text-xs mt-0.5" [style.color]="priorityColor()">{{ ticket()?.prioridad }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs" style="color: var(--text-muted);">Empresa</dt>
                    <dd class="font-mono text-xs mt-0.5" style="color: var(--text-muted);">{{ ticket()?.empresaId ?? '—' }}</dd>
                  </div>
                </dl>
              </emx-glass-card>

              <!-- 2. Triage / Síntomas -->
              <emx-glass-card>
                <h2 class="section-label">Triage inicial</h2>
                <p class="text-sm" style="color: var(--text-primary);">{{ ticket()?.tipoEmergencia ?? '—' }}</p>
                @if (ticket()?.direccion) {
                  <p class="text-xs mt-2" style="color: var(--text-muted);">
                    <span class="font-mono">LOC</span> {{ ticket()?.direccion }}
                  </p>
                }
                @if (ticket()?.latitud) {
                  <p class="font-mono text-xs mt-1" style="color: var(--text-muted);">
                    {{ ticket()?.latitud }}, {{ ticket()?.longitud }}
                  </p>
                }
              </emx-glass-card>

              <!-- 3. Procedimientos -->
              <emx-glass-card>
                <h2 class="section-label">Procedimientos</h2>
                @if (procedimientos().length === 0) {
                  <p class="text-xs" style="color: var(--text-muted);">Sin procedimientos registrados</p>
                } @else {
                  <ul class="flex flex-col gap-2">
                    @for (p of procedimientos(); track p.id) {
                      <li class="text-sm" style="border-top: 1px solid var(--border-glass); padding-top: 0.5rem;">
                        <p style="color: var(--text-primary);">{{ p.descripcion ?? '—' }}</p>
                        <p class="text-xs mt-0.5" style="color: var(--text-muted);">
                          {{ p.ejecutadoPor ?? '—' }} · {{ formatTime(p.timestamp) }}
                        </p>
                      </li>
                    }
                  </ul>
                }
              </emx-glass-card>

              <!-- 4. Medicación -->
              <emx-glass-card>
                <h2 class="section-label">Medicación</h2>
                @if (medicacion().length === 0) {
                  <p class="text-xs" style="color: var(--text-muted);">Sin medicación registrada</p>
                } @else {
                  <ul class="flex flex-col gap-2">
                    @for (m of medicacion(); track m.id) {
                      <li class="text-sm" style="border-top: 1px solid var(--border-glass); padding-top: 0.5rem;">
                        <p class="font-semibold" style="color: var(--text-primary);">{{ m.medicamento ?? '—' }}</p>
                        <p class="text-xs mt-0.5" style="color: var(--text-secondary);">
                          {{ m.dosis ?? '—' }} · {{ m.via ?? '—' }} · por {{ m.administradoPor ?? '—' }}
                        </p>
                      </li>
                    }
                  </ul>
                }
              </emx-glass-card>
            </div>

            <!-- ══════════════════════════════════
                 COLUMNA CENTER — Clinical data
                 ══════════════════════════════════ -->
            <div class="flex flex-col gap-4">

              <!-- 5. Status Flow Bar -->
              <emx-glass-card>
                <h2 class="section-label">Estado del incidente</h2>
                <div class="flex items-start gap-0 overflow-x-auto pb-1">
                  @for (step of statusSteps; track step.id; let i = $index) {
                    <!-- Step node -->
                    <div class="flex flex-col items-center gap-1.5 flex-shrink-0" style="min-width: 72px;">
                      <div class="flex items-center w-full">
                        <!-- Left connector line -->
                        @if (i > 0) {
                          <div class="flex-1 h-px"
                               [style.background]="stepIndex(step.id) < activeStepIndex() ? 'var(--accent-emerald)' : 'var(--border-glass)'">
                          </div>
                        }
                        <!-- Dot -->
                        <div class="w-3 h-3 rounded-full flex-shrink-0 transition-all"
                             [style.background]="stepDotColor(step.id)"
                             [class.animate-pulse]="stepIndex(step.id) === activeStepIndex()">
                        </div>
                        <!-- Right connector line -->
                        @if (i < statusSteps.length - 1) {
                          <div class="flex-1 h-px"
                               [style.background]="stepIndex(step.id) < activeStepIndex() ? 'var(--accent-emerald)' : 'var(--border-glass)'">
                          </div>
                        }
                      </div>
                      <span class="text-center font-mono text-xs leading-tight px-1"
                            [style.color]="stepIndex(step.id) === activeStepIndex() ? 'var(--text-primary)' : 'var(--text-muted)'">
                        {{ step.label }}
                      </span>
                    </div>
                  }
                </div>
              </emx-glass-card>

              <!-- 6. Vital Signs 2×2 -->
              <emx-glass-card>
                <h2 class="section-label">Signos vitales</h2>
                <div class="grid grid-cols-2 gap-3">
                  <!-- FC -->
                  <div class="rounded-lg p-3" style="background: var(--bg-glass);">
                    <p class="text-xs font-mono mb-1" style="color: var(--text-muted);">FC · bpm</p>
                    <p class="font-mono font-bold" style="font-size: 28px; line-height:1;"
                       [style.color]="vitalColor(lastSigno()?.frecuenciaCardiaca, 60, 100)">
                      {{ lastSigno()?.frecuenciaCardiaca ?? '—' }}
                    </p>
                    <emx-sparkline
                      [values]="sparkFC()"
                      [color]="vitalColor(lastSigno()?.frecuenciaCardiaca, 60, 100)"
                      [width]="120"
                      [height]="30"
                    />
                  </div>
                  <!-- SpO2 -->
                  <div class="rounded-lg p-3" style="background: var(--bg-glass);">
                    <p class="text-xs font-mono mb-1" style="color: var(--text-muted);">SpO₂ · %</p>
                    <p class="font-mono font-bold" style="font-size: 28px; line-height:1;"
                       [style.color]="vitalColor(lastSigno()?.saturacionO2, 95, 100)">
                      {{ lastSigno()?.saturacionO2 ?? '—' }}
                    </p>
                    <emx-sparkline
                      [values]="sparkSpO2()"
                      [color]="vitalColor(lastSigno()?.saturacionO2, 95, 100)"
                      [width]="120"
                      [height]="30"
                    />
                  </div>
                  <!-- PA Sistólica -->
                  <div class="rounded-lg p-3" style="background: var(--bg-glass);">
                    <p class="text-xs font-mono mb-1" style="color: var(--text-muted);">PA Sistólica · mmHg</p>
                    <p class="font-mono font-bold" style="font-size: 28px; line-height:1;"
                       [style.color]="vitalColor(lastSigno()?.presionSistolica, 90, 140)">
                      {{ lastSigno()?.presionSistolica ?? '—' }}
                    </p>
                    <emx-sparkline
                      [values]="sparkPAS()"
                      [color]="vitalColor(lastSigno()?.presionSistolica, 90, 140)"
                      [width]="120"
                      [height]="30"
                    />
                  </div>
                  <!-- Temperatura -->
                  <div class="rounded-lg p-3" style="background: var(--bg-glass);">
                    <p class="text-xs font-mono mb-1" style="color: var(--text-muted);">Temp · °C</p>
                    <p class="font-mono font-bold" style="font-size: 28px; line-height:1;"
                       [style.color]="vitalColor(lastSigno()?.temperatura, 36, 37.5)">
                      {{ lastSigno()?.temperatura ?? '—' }}
                    </p>
                    <emx-sparkline
                      [values]="sparkTemp()"
                      [color]="vitalColor(lastSigno()?.temperatura, 36, 37.5)"
                      [width]="120"
                      [height]="30"
                    />
                  </div>
                </div>
              </emx-glass-card>

              <!-- 7. Timeline -->
              <emx-glass-card>
                <h2 class="section-label">Timeline</h2>
                @if (timeline().length === 0) {
                  <emx-empty-state message="Sin eventos registrados" />
                } @else {
                  <ol class="flex flex-col gap-0">
                    @for (ev of timeline(); track ev.id; let last = $last) {
                      <li class="flex gap-3">
                        <div class="flex flex-col items-center">
                          <div class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style="background: var(--accent-cyan);"></div>
                          @if (!last) {
                            <div class="flex-1 w-px mt-1 mb-0" style="background: var(--border-glass); min-height: 24px;"></div>
                          }
                        </div>
                        <div class="pb-4">
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

              <!-- 8. Notas interactivas -->
              <emx-glass-card>
                <h2 class="section-label">Notas</h2>
                <div class="flex gap-2 mb-4">
                  <textarea
                    class="flex-1 rounded-lg px-3 py-2 text-sm resize-none"
                    rows="2"
                    placeholder="Agregar una nota..."
                    style="background: var(--bg-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
                    [value]="noteText()"
                    (input)="noteText.set($any($event.target).value)"
                  ></textarea>
                  <button
                    type="button"
                    class="btn btn--primary btn--sm self-end"
                    [disabled]="!noteText().trim()"
                  >Agregar</button>
                </div>

                @if (timelineNotes().length === 0) {
                  <p class="text-xs" style="color: var(--text-muted);">Sin notas registradas</p>
                } @else {
                  <ul class="flex flex-col gap-2">
                    @for (n of timelineNotes(); track n.id) {
                      <li class="text-xs rounded-lg px-3 py-2" style="background: var(--bg-glass);">
                        <p style="color: var(--text-primary);">{{ n.notas }}</p>
                        <p class="mt-1" style="color: var(--text-muted);">{{ formatDate(n.fecha) }} · {{ n.operador ?? '—' }}</p>
                      </li>
                    }
                  </ul>
                }
              </emx-glass-card>
            </div>

            <!-- ══════════════════════════════════
                 COLUMNA RIGHT — Logística
                 ══════════════════════════════════ -->
            <div class="flex flex-col gap-4">

              <!-- 9. Unidad asignada -->
              <emx-glass-card>
                <h2 class="section-label">Unidad asignada</h2>
                @if (ticket()?.ambulanciaId) {
                  <p class="font-mono font-semibold text-lg" style="color: var(--accent-cyan);">
                    AMB-{{ ticket()?.ambulanciaId }}
                  </p>
                  <p class="text-sm mt-0.5" style="color: var(--text-secondary);">{{ ticket()?.unidadAsignada ?? '—' }}</p>
                } @else {
                  <p class="text-sm" style="color: var(--text-muted);">Sin unidad asignada</p>
                }

                @if (detalle()?.tripulacion && detalle()!.tripulacion!.length > 0) {
                  <div class="mt-3 border-t pt-3" style="border-color: var(--border-glass);">
                    <h3 class="text-xs font-semibold mb-2" style="color: var(--text-muted);">Tripulación</h3>
                    <ul class="flex flex-col gap-1">
                      @for (m of detalle()!.tripulacion!; track m.id) {
                        <li class="text-sm flex items-center gap-2">
                          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: var(--accent-blue);"></span>
                          <span style="color: var(--text-primary);">{{ m.nombre ?? 'Prof. ' + m.id }}</span>
                          <span class="text-xs ml-auto" style="color: var(--text-muted);">{{ m.rol ?? '—' }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }
              </emx-glass-card>

              <!-- 10. Transport Card -->
              <emx-glass-card>
                <h2 class="section-label">Transporte</h2>
                <dl class="flex flex-col gap-2 text-sm">
                  <div class="flex justify-between items-baseline">
                    <dt class="text-xs" style="color: var(--text-muted);">Hospital destino</dt>
                    <dd class="font-mono text-xs" style="color: var(--text-primary);">Por determinar</dd>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <dt class="text-xs" style="color: var(--text-muted);">Partida</dt>
                    <dd class="font-mono text-xs" style="color: var(--text-primary);">{{ transportDeparture() }}</dd>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <dt class="text-xs" style="color: var(--text-muted);">ETA</dt>
                    <dd class="font-mono text-xs" style="color: var(--text-muted);">—</dd>
                  </div>
                  <div class="flex justify-between items-center">
                    <dt class="text-xs" style="color: var(--text-muted);">Pre-aviso</dt>
                    <dd>
                      <span class="badge text-xs px-2 py-0.5" style="background: rgba(245,158,11,0.15); color: var(--accent-amber);">
                        Pendiente
                      </span>
                    </dd>
                  </div>
                </dl>
              </emx-glass-card>

              <!-- 11. Mini mapa SVG -->
              <emx-glass-card>
                <h2 class="section-label">Mapa</h2>
                <svg width="100%" viewBox="0 0 280 160" style="border-radius: 8px; background: var(--bg-map, #0f172a);">
                  <!-- Grid lines -->
                  <line x1="0" y1="40" x2="280" y2="40" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                  <line x1="0" y1="80" x2="280" y2="80" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                  <line x1="0" y1="120" x2="280" y2="120" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                  <line x1="70" y1="0" x2="70" y2="160" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                  <line x1="140" y1="0" x2="140" y2="160" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                  <line x1="210" y1="0" x2="210" y2="160" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

                  <!-- Dashed line ambulance → incident (if ambulanciaId) -->
                  @if (ticket()?.ambulanciaId) {
                    <line x1="60" y1="100" x2="140" y2="80"
                          stroke="var(--accent-cyan)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
                  }

                  <!-- Incident marker -->
                  <circle cx="140" cy="80" r="14" fill="rgba(239,68,68,0.25)" stroke="var(--accent-red)" stroke-width="1.5"/>
                  <circle cx="140" cy="80" r="5" fill="var(--accent-red)"/>
                  <text x="140" y="77" text-anchor="middle" font-size="7" fill="white" font-family="monospace" dy="3">INC</text>

                  <!-- Ambulance marker -->
                  @if (ticket()?.ambulanciaId) {
                    <circle cx="60" cy="100" r="12" fill="rgba(59,130,246,0.25)" stroke="var(--accent-blue)" stroke-width="1.5"/>
                    <circle cx="60" cy="100" r="4" fill="var(--accent-blue)"/>
                    <text x="60" y="97" text-anchor="middle" font-size="7" fill="white" font-family="monospace" dy="3">AMB</text>
                  }

                  <!-- Hospital marker -->
                  <circle cx="220" cy="55" r="12" fill="rgba(16,185,129,0.2)" stroke="var(--accent-emerald)" stroke-width="1.5"/>
                  <text x="220" y="52" text-anchor="middle" font-size="7" fill="var(--accent-emerald)" font-family="monospace" dy="3">HSP</text>
                </svg>
              </emx-glass-card>

              <!-- 12. Evidence Card -->
              <emx-glass-card>
                <h2 class="section-label">Evidencia</h2>

                <!-- Photo grid placeholder -->
                <div class="grid grid-cols-2 gap-2 mb-4">
                  @for (i of [0,1,2,3]; track i) {
                    <div class="rounded-lg aspect-square"
                         style="background: repeating-linear-gradient(
                           45deg,
                           var(--bg-glass) 0px,
                           var(--bg-glass) 6px,
                           var(--border-glass) 6px,
                           var(--border-glass) 8px
                         );">
                    </div>
                  }
                </div>
                <p class="text-xs mb-4" style="color: var(--text-muted);">Sin evidencia fotográfica</p>

                <!-- Firma rows -->
                <div class="flex flex-col gap-2">
                  @for (firma of firmas; track firma.rol) {
                    <div class="flex items-center justify-between">
                      <span class="text-xs" style="color: var(--text-muted);">{{ firma.rol }}</span>
                      <span class="badge text-xs px-2 py-0.5" style="background: rgba(245,158,11,0.12); color: var(--accent-amber);">
                        Pendiente
                      </span>
                    </div>
                  }
                </div>
              </emx-glass-card>
            </div>

          </div>
        }
      </div>
    </div>

    <!-- Dispatch modal -->
    @if (showDispatch() && ticket()) {
      <emx-dispatch-modal
        [emergency]="ticket()!"
        (dispatched)="onDispatched()"
        (closed)="showDispatch.set(false)"
      />
    }
  `,
  styles: [`
    .section-label {
      font-family: monospace;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
  `],
})
export class EmergencyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emergencyApi = inject(EmergencyApiService);

  // ── Core signals ──────────────────────────────────────────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detalle = signal<TicketDetalleDTO | null>(null);
  readonly timeline = signal<LogEstadoTicketDTO[]>([]);
  readonly showDispatch = signal(false);
  readonly noteText = signal('');

  // ── Derived data ──────────────────────────────────────────────
  readonly ticket = computed(() => this.detalle()?.ticket ?? null);
  readonly signos = computed(() => this.detalle()?.signos ?? []);
  readonly procedimientos = computed(() => this.detalle()?.procedimientos ?? []);
  readonly medicacion = computed(() => this.detalle()?.medicacion ?? []);

  readonly lastSigno = computed((): SignosVitalesDTO | null => {
    const arr = this.signos();
    return arr.length > 0 ? (arr[arr.length - 1] ?? null) : null;
  });

  // Notas del timeline (entries with notas text)
  readonly timelineNotes = computed(() =>
    this.timeline().filter((e) => !!e.notas)
  );

  // ── Patient initials ──────────────────────────────────────────
  readonly patientInitials = computed((): string => {
    const desc = this.ticket()?.pacienteDescripcion;
    if (!desc) return '??';
    const parts = desc.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase() || '??';
  });

  // ── Status flow ───────────────────────────────────────────────
  readonly statusSteps: StatusStep[] = ALL_STEPS;

  readonly activeStepIndex = computed((): number => {
    const estado = this.ticket()?.estado ?? '';
    const idx = ALL_STEPS.findIndex((s) => s.id === estado);
    return idx >= 0 ? idx : 0;
  });

  stepIndex(stepId: string): number {
    return ALL_STEPS.findIndex((s) => s.id === stepId);
  }

  stepDotColor(stepId: string): string {
    const i = this.stepIndex(stepId);
    const active = this.activeStepIndex();
    if (i < active) return 'var(--accent-emerald)';
    if (i === active) return 'var(--accent-red)';
    return 'var(--border-glass)';
  }

  // ── Action guards ─────────────────────────────────────────────
  readonly canDispatch = computed(() => {
    const estado = this.ticket()?.estado;
    return estado === 'RECIBIDO' || estado === 'EN_ESPERA';
  });

  readonly canClose = computed(() => {
    const estado = this.ticket()?.estado;
    return estado !== 'CERRADO' && estado !== 'CANCELADO';
  });

  // ── Priority helpers ──────────────────────────────────────────
  readonly priorityColor = computed((): string => {
    const p = this.ticket()?.prioridad;
    if (p === 'CRITICA') return 'var(--accent-red)';
    if (p === 'URGENTE') return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  });

  readonly priorityBadgeClass = computed((): string => {
    const p = this.ticket()?.prioridad;
    if (p === 'CRITICA') return 'badge badge--critical';
    if (p === 'URGENTE') return 'badge badge--urgent';
    return 'badge badge--stable';
  });

  // ── Sparklines ────────────────────────────────────────────────
  readonly sparkFC = computed((): number[] =>
    this.signos().map((s) => s.frecuenciaCardiaca ?? 0).filter((v) => v > 0)
  );
  readonly sparkSpO2 = computed((): number[] =>
    this.signos().map((s) => s.saturacionO2 ?? 0).filter((v) => v > 0)
  );
  readonly sparkPAS = computed((): number[] =>
    this.signos().map((s) => s.presionSistolica ?? 0).filter((v) => v > 0)
  );
  readonly sparkTemp = computed((): number[] =>
    this.signos().map((s) => s.temperatura ?? 0).filter((v) => v > 0)
  );

  // ── Vital color (normal=emerald, alto=amber, crítico=rojo) ────
  vitalColor(value: number | undefined, normalMin: number, normalMax: number): string {
    if (value === undefined) return 'var(--text-muted)';
    if (value >= normalMin && value <= normalMax) return 'var(--accent-emerald)';
    const criticalDelta = (normalMax - normalMin) * 0.3;
    if (value < normalMin - criticalDelta || value > normalMax + criticalDelta) return 'var(--accent-red)';
    return 'var(--accent-amber)';
  }

  // ── Transport departure ───────────────────────────────────────
  readonly transportDeparture = computed((): string => {
    const ev = this.timeline().find((e) => e.estado === 'EN_CAMINO');
    return ev ? this.formatDate(ev.fecha) : '—';
  });

  // ── Firma rows (static) ───────────────────────────────────────
  readonly firmas: { rol: string }[] = [
    { rol: 'Operador' },
    { rol: 'Médico de campo' },
    { rol: 'Receptor' },
  ];

  // ── Route helper ──────────────────────────────────────────────
  private get ticketId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  // ── Lifecycle ─────────────────────────────────────────────────
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
  }

  onDispatched(): void {
    this.showDispatch.set(false);
    this.load();
  }

  cerrar(): void {
    const req: CerrarTicketRequest = {};
    this.emergencyApi.cerrar(this.ticketId, req).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al cerrar el ticket'),
    });
  }

  cancelar(): void {
    const req: CerrarTicketRequest = {};
    this.emergencyApi.cancelar(this.ticketId, req).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al cancelar el ticket'),
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
