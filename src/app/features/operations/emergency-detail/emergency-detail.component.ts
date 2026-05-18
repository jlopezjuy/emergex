import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import {
  TicketDetalleDTO,
  LogEstadoTicketDTO,
  CerrarTicketRequest,
  CancelarTicketRequest,
  SignosVitalesDTO,
  AtencionFullDTO,
  HospitalDTO,
  EntregaHospitalariaDTO,
} from '../../../data-access/dto/ticket.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { GlassCardComponent } from '../../../shared/components/glass-card/glass-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DispatchModalComponent } from '../../../shared/components/emergency/dispatch-modal/dispatch-modal.component';
import { SparklineComponent } from '../../../shared/components/charts/sparkline/sparkline.component';
import { OperationsMapComponent } from '../../../shared/components/map/operations-map/operations-map.component';
import { UnidadMovilDTO } from '../../../data-access/dto/ambulancia.dto';

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
    OperationsMapComponent,
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
          @if (canMarkEnCamino()) {
            <button type="button" class="btn btn--primary btn--sm" (click)="marcarEnCamino()">En camino</button>
          }
          @if (canMarkEnSitio()) {
            <button type="button" class="btn btn--primary btn--sm" (click)="marcarEnSitio()">En sitio</button>
          }
          @if (canStartTransfer()) {
            <button type="button" class="btn btn--ghost btn--sm" (click)="iniciarTraslado()">Iniciar traslado</button>
          }
          @if (canFinishTransfer()) {
            <button type="button" class="btn btn--ghost btn--sm" (click)="finalizarTraslado()">Finalizar traslado</button>
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
                <div class="flex items-center justify-between mb-2">
                  <h2 class="section-label" style="margin:0;">Procedimientos</h2>
                  @if (canEditClinical()) {
                    <button type="button" class="btn btn--ghost btn--sm" (click)="openClinicalModal('PROCEDIMIENTO')">Agregar</button>
                  }
                </div>
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
                <div class="flex items-center justify-between mb-2">
                  <h2 class="section-label" style="margin:0;">Medicación</h2>
                  @if (canEditClinical()) {
                    <button type="button" class="btn btn--ghost btn--sm" (click)="openClinicalModal('MEDICACION')">Agregar</button>
                  }
                </div>
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
                  @for (step of statusSteps(); track step.id; let i = $index) {
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
                        @if (i < statusSteps().length - 1) {
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
                <div class="flex items-center justify-between mb-3">
                  <h2 class="section-label" style="margin:0;">Signos vitales</h2>
                  @if (canEditClinical()) {
                    <button type="button" class="btn btn--ghost btn--sm" (click)="openClinicalModal('SIGNOS')">Cargar</button>
                  }
                </div>
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
                <div class="flex items-center justify-between mb-3">
                  <h2 class="section-label" style="margin:0;">Trazabilidad operativa</h2>
                  <span class="font-mono text-xs" style="color: var(--text-muted);">{{ timeline().length }} eventos</span>
                </div>
                @if (timeline().length === 0) {
                  <emx-empty-state message="Sin eventos registrados" />
                } @else {
                  <ol class="flex flex-col gap-0">
                    @for (ev of timeline(); track ev.id; let last = $last) {
                      <li class="flex gap-3">
                        <div class="flex flex-col items-center flex-shrink-0">
                          <div class="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                               [style.background]="timelineColor(ev.estado)"
                               [style.box-shadow]="'0 0 8px ' + timelineColor(ev.estado) + '99'">
                          </div>
                          @if (!last) {
                            <div class="flex-1 w-px mt-1" style="background: var(--border-glass); min-height: 28px;"></div>
                          }
                        </div>
                        <div class="pb-4 flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap mb-0.5">
                            <span class="font-mono rounded px-1.5 py-0.5"
                                  [style.color]="timelineColor(ev.estado)"
                                  [style.background]="timelineColor(ev.estado) + '22'"
                                  style="font-size:9px; letter-spacing:0.08em; font-weight:700; border: 1px solid currentColor; opacity: 0.85;">
                              {{ timelineLabel(ev.estado) }}
                            </span>
                            @if (ev.operador) {
                              <span class="font-mono text-xs" style="color: var(--text-muted);">{{ ev.operador }}</span>
                            }
                            <span class="font-mono text-xs ml-auto" style="color: var(--text-muted);">{{ formatTime(ev.fecha) }}</span>
                          </div>
                          @if (ev.notas) {
                            <p class="text-xs" style="color: var(--text-secondary);">{{ ev.notas }}</p>
                          } @else {
                            <p class="text-xs" style="color: var(--text-secondary);">{{ ev.estado.replace('_', ' ') }}</p>
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
                    (click)="agregarNota()"
                  >Agregar</button>
                </div>
                @if (notaError()) {
                  <p class="text-xs mb-2" style="color: var(--accent-red);">{{ notaError() }}</p>
                }
                @if (notaOk()) {
                  <p class="text-xs mb-2" style="color: var(--accent-emerald);">Nota guardada correctamente</p>
                }

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
                <div class="flex items-center justify-between gap-2 mb-2">
                  <h2 class="section-label" style="margin:0;">Unidad asignada</h2>
                  @if (!ticket()?.ambulanciaId && canDispatch()) {
                    <button type="button" class="btn btn--primary btn--sm" (click)="openDispatch()">Asignar unidad</button>
                  }
                </div>
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

              <!-- 11. Mapa real -->
              <emx-glass-card style="padding: 0; overflow: hidden;">
                <div class="flex items-center justify-between px-4 py-2 flex-shrink-0"
                     style="border-bottom: 1px solid var(--border-glass);">
                  <div class="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                    <span class="eyebrow">Ruta · Tiempo real</span>
                  </div>
                  @if (ticket()?.ambulanciaId) {
                    <span class="font-mono text-xs" style="color: var(--accent-cyan);">● En movimiento</span>
                  } @else if (ticket()?.latitud) {
                    <span class="font-mono text-xs" style="color: var(--accent-amber);">● Domicilio</span>
                  }
                </div>
                @if (ticket()?.latitud || mapAmbulances().length > 0) {
                  <div style="height: 190px;">
                    <emx-operations-map
                      [ambulances]="mapAmbulances()"
                      [emergencies]="mapTickets()"
                      [selectedEmergencyId]="ticket()?.id ?? null"
                      [autoFit]="true"
                      [showLegend]="false"
                    />
                  </div>
                } @else {
                  <div class="px-4 py-8 text-center" style="background:#0a1628; color: var(--text-muted);">
                    No hay ubicación geocodificada para este domicilio.
                  </div>
                }
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

    <!-- Clinical data modal -->
    @if (clinicalModal()) {
      <div class="clinical-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="clinical-modal-card flex flex-col gap-5 w-full max-w-2xl">
          <div class="clinical-modal-header">
            <div>
              <p class="clinical-modal-kicker">Carga clínica telefónica</p>
              <h2 class="clinical-modal-title">{{ clinicalModalTitle() }}</h2>
              <p class="clinical-modal-subtitle">Carga asistida por operador/despacho. Queda vinculada a la atención y a la historia clínica.</p>
            </div>
            <button type="button" class="clinical-close" (click)="clinicalModal.set(null)">×</button>
          </div>

          @if (clinicalModal() === 'SIGNOS') {
            <div class="grid grid-cols-3 gap-2">
              <input class="clinical-input" placeholder="TA ej: 120/80" [value]="svTa()" (input)="svTa.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="FC" [value]="svFc()" (input)="svFc.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="FR" [value]="svFr()" (input)="svFr.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="SpO₂" [value]="svSatO2()" (input)="svSatO2.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="Temp" [value]="svTemp()" (input)="svTemp.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="Glucemia" [value]="svGlucemia()" (input)="svGlucemia.set($any($event.target).value)" />
              <div class="col-span-3 mt-1" style="border-top: 1px solid rgba(148,163,184,0.2); padding-top: 0.75rem;">
                <p class="clinical-field-label mb-2">Glasgow (opcional)</p>
                <div class="grid grid-cols-4 gap-2">
                  <input class="clinical-input" type="number" placeholder="Ocular (1-4)" min="1" max="4"
                         [value]="glasgowOcular()" (input)="glasgowOcular.set($any($event.target).value)" />
                  <input class="clinical-input" type="number" placeholder="Verbal (1-5)" min="1" max="5"
                         [value]="glasgowVerbal()" (input)="glasgowVerbal.set($any($event.target).value)" />
                  <input class="clinical-input" type="number" placeholder="Motor (1-6)" min="1" max="6"
                         [value]="glasgowMotor()" (input)="glasgowMotor.set($any($event.target).value)" />
                  <div class="rounded-lg px-3 py-2 flex items-center justify-center font-mono font-bold text-lg"
                       style="background: var(--bg-glass, #f1f5f9); color: #0f172a; border: 1px solid rgba(100,116,139,0.35);">
                    {{ glasgowTotal() ?? '—' }}
                  </div>
                </div>
                <select class="clinical-input mt-2"
                        [value]="avpu()" (change)="avpu.set($any($event.target).value)">
                  <option value="">AVPU (no registrado)</option>
                  <option value="ALERTA">Alerta</option>
                  <option value="VOZ">Responde a voz</option>
                  <option value="DOLOR">Responde a dolor</option>
                  <option value="INCONSCIENTE">Inconsciente</option>
                </select>
              </div>
            </div>
            <textarea rows="2" class="clinical-input" placeholder="Observación" [value]="clinicalObservacion()" (input)="clinicalObservacion.set($any($event.target).value)"></textarea>
          }

          @if (clinicalModal() === 'PROCEDIMIENTO') {
            <input class="clinical-input" placeholder="Procedimiento realizado" [value]="clinicalTitulo()" (input)="clinicalTitulo.set($any($event.target).value)" />
            <textarea rows="4" class="clinical-input" placeholder="Detalle, respuesta del paciente, observaciones" [value]="clinicalDetalle()" (input)="clinicalDetalle.set($any($event.target).value)"></textarea>
          }

          @if (clinicalModal() === 'MEDICACION') {
            <div class="grid grid-cols-3 gap-2">
              <input class="clinical-input" placeholder="Medicamento" [value]="medMedicamento()" (input)="medMedicamento.set($any($event.target).value)" />
              <input class="clinical-input" placeholder="Dosis" [value]="medDosis()" (input)="medDosis.set($any($event.target).value)" />
              <input class="clinical-input" placeholder="Vía" [value]="medVia()" (input)="medVia.set($any($event.target).value)" />
            </div>
            <textarea rows="3" class="clinical-input" placeholder="Observación / indicación telefónica" [value]="clinicalObservacion()" (input)="clinicalObservacion.set($any($event.target).value)"></textarea>
          }

          @if (clinicalError()) {
            <p class="text-xs" style="color: var(--accent-red);">{{ clinicalError() }}</p>
          }

          <div class="clinical-modal-footer">
            <button type="button" class="btn btn--ghost btn--sm" (click)="clinicalModal.set(null)">Cancelar</button>
            <button type="button" class="btn btn--primary btn--sm" [disabled]="savingClinical()" (click)="guardarClinicalModal()">
              {{ savingClinical() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Cancel dialog -->
    @if (showCancelDialog()) {
      <div class="clinical-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="clinical-modal-card cancel-modal-card flex flex-col gap-4 w-full max-w-md">
          <div class="clinical-modal-header">
            <div>
              <p class="clinical-modal-kicker cancel-modal-kicker">Acción irreversible</p>
              <h2 class="clinical-modal-title">¿Cancelar emergencia?</h2>
              <p class="clinical-modal-subtitle">Indicá el motivo para dejar trazabilidad operativa.</p>
            </div>
            <button type="button" class="clinical-close" (click)="showCancelDialog.set(false); cancelMotivo.set('')">×</button>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="clinical-field-label">
              Motivo *
            </label>
            <input
              type="text"
              class="clinical-input"
              placeholder="Ej: llamada duplicada, paciente no encontrado..."
              [value]="cancelMotivo()"
              (input)="cancelMotivo.set($any($event.target).value)"
            />
          </div>
          <div class="clinical-modal-footer">
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              (click)="showCancelDialog.set(false); cancelMotivo.set('')"
            >Volver</button>
            <button
              type="button"
              class="btn btn--danger btn--sm"
              [disabled]="!cancelMotivo().trim()"
              (click)="confirmarCancelacion()"
            >Confirmar cancelación</button>
          </div>
        </div>
      </div>
    }

    <!-- Close dialog -->
    @if (showCloseDialog()) {
      <div class="clinical-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="clinical-modal-card flex flex-col gap-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div class="clinical-modal-header">
            <div>
              <p class="clinical-modal-kicker">Cierre operativo</p>
              <h2 class="clinical-modal-title">Cerrar atención médica</h2>
              <p class="clinical-modal-subtitle">Registrá resolución, signos vitales y procedimientos antes de completar el caso.</p>
            </div>
            <button type="button" class="clinical-close" (click)="showCloseDialog.set(false)">×</button>
          </div>

          @if (trasladoEnCurso()) {
            <div class="col-span-2 rounded-lg px-4 py-3" style="background: rgba(245,158,11,0.12); border: 1px solid var(--accent-amber);">
              <p class="text-xs font-semibold" style="color: var(--accent-amber);">⚠ Traslado en curso sin finalizar</p>
              <p class="text-xs mt-1" style="color: var(--text-secondary);">El traslado fue iniciado pero no se registró la entrega hospitalaria. Completá el acta de entrega antes de cerrar para cumplir con la Ley 17.132.</p>
            </div>
          }

          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1 col-span-2">
              <span class="clinical-field-label">Impresión clínica *</span>
              <textarea rows="3" class="clinical-input" [value]="closeImpresion()" (input)="closeImpresion.set($any($event.target).value)"></textarea>
            </label>
            <label class="flex flex-col gap-1 col-span-2">
              <span class="clinical-field-label">Procedimientos / tratamiento realizado</span>
              <textarea rows="3" class="clinical-input" [value]="closeTratamiento()" (input)="closeTratamiento.set($any($event.target).value)"></textarea>
            </label>
            <label class="flex flex-col gap-1">
              <span class="clinical-field-label">Tipo resolución</span>
              <select class="clinical-input" [value]="closeTipoResolucion()" (change)="closeTipoResolucion.set($any($event.target).value)">
                <option value="RESUELTA_EN_SITIO">Resuelta en sitio</option>
                <option value="DERIVADO_HOSPITAL">Derivado a hospital</option>
                <option value="PACIENTE_RECHAZO">Paciente rechaza</option>
                <option value="SIN_RESPUESTA">Sin respuesta</option>
              </select>
            </label>
            <label class="clinical-checkbox flex items-center gap-2 mt-5">
              <input type="checkbox" [checked]="closeRequiereTraslado()" (change)="closeRequiereTraslado.set($any($event.target).checked)" />
              <span>Requiere traslado</span>
            </label>
            @if (closeRequiereTraslado()) {
              <label class="flex flex-col gap-1 col-span-2">
                <span class="clinical-field-label">Hospital destino</span>
                @if (hospitales().length > 0) {
                  <select class="clinical-input"
                          [value]="closeHospitalId() ?? ''"
                          (change)="closeHospitalId.set($any($event.target).value ? Number($any($event.target).value) : null)">
                    <option value="">Seleccionar hospital del catálogo...</option>
                    @for (h of hospitales(); track h.id) {
                      <option [value]="h.id">{{ h.nombre }}{{ h.ciudad ? ' — ' + h.ciudad : '' }}</option>
                    }
                  </select>
                } @else {
                  <input class="clinical-input" placeholder="Nombre del hospital" [value]="closeDestino()" (input)="closeDestino.set($any($event.target).value)" />
                }
              </label>
              <label class="clinical-checkbox flex items-center gap-2 col-span-2">
                <input type="checkbox" [checked]="closeUrgenciaVital()" (change)="closeUrgenciaVital.set($any($event.target).checked)" />
                <span>Urgencia vital — traslado sin consentimiento posible (Ley 26.529, art. 5)</span>
              </label>
              <label class="clinical-checkbox flex items-center gap-2 col-span-2">
                <input type="checkbox" [checked]="closeNotificadoSAME107()" (change)="closeNotificadoSAME107.set($any($event.target).checked)" />
                <span>Derivación notificada al SAME 107</span>
              </label>
            }
          </div>

          <div>
            <h3 class="clinical-field-label mb-2">Signos vitales</h3>
            <div class="grid grid-cols-3 gap-2">
              <input class="clinical-input" placeholder="TA ej: 120/80" [value]="svTa()" (input)="svTa.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="FC" [value]="svFc()" (input)="svFc.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="FR" [value]="svFr()" (input)="svFr.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="SpO₂" [value]="svSatO2()" (input)="svSatO2.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="Temp" [value]="svTemp()" (input)="svTemp.set($any($event.target).value)" />
              <input class="clinical-input" type="number" placeholder="Glucemia" [value]="svGlucemia()" (input)="svGlucemia.set($any($event.target).value)" />
              <div class="col-span-3 mt-1" style="border-top: 1px solid rgba(148,163,184,0.2); padding-top: 0.75rem;">
                <p class="clinical-field-label mb-2">Glasgow (opcional)</p>
                <div class="grid grid-cols-4 gap-2">
                  <input class="clinical-input" type="number" placeholder="Ocular (1-4)" min="1" max="4"
                         [value]="glasgowOcular()" (input)="glasgowOcular.set($any($event.target).value)" />
                  <input class="clinical-input" type="number" placeholder="Verbal (1-5)" min="1" max="5"
                         [value]="glasgowVerbal()" (input)="glasgowVerbal.set($any($event.target).value)" />
                  <input class="clinical-input" type="number" placeholder="Motor (1-6)" min="1" max="6"
                         [value]="glasgowMotor()" (input)="glasgowMotor.set($any($event.target).value)" />
                  <div class="rounded-lg px-3 py-2 flex items-center justify-center font-mono font-bold text-lg"
                       style="background: var(--bg-glass, #f1f5f9); color: #0f172a; border: 1px solid rgba(100,116,139,0.35);">
                    {{ glasgowTotal() ?? '—' }}
                  </div>
                </div>
                <select class="clinical-input mt-2"
                        [value]="avpu()" (change)="avpu.set($any($event.target).value)">
                  <option value="">AVPU (no registrado)</option>
                  <option value="ALERTA">Alerta</option>
                  <option value="VOZ">Responde a voz</option>
                  <option value="DOLOR">Responde a dolor</option>
                  <option value="INCONSCIENTE">Inconsciente</option>
                </select>
              </div>
            </div>
          </div>

          <label class="flex flex-col gap-1">
            <span class="clinical-field-label">Nota de cierre</span>
            <textarea rows="2" class="clinical-input" [value]="closeNota()" (input)="closeNota.set($any($event.target).value)"></textarea>
          </label>

          <div class="clinical-modal-footer">
            <button type="button" class="btn btn--ghost btn--sm" (click)="showCloseDialog.set(false)">Volver</button>
            <button type="button" class="btn btn--primary btn--sm" [disabled]="!closeImpresion().trim()" (click)="confirmarCierre()">Completar atención</button>
          </div>
        </div>
      </div>
    }

    <!-- Entrega Hospitalaria modal -->
    @if (showEntregaModal()) {
      <div class="clinical-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="clinical-modal-card flex flex-col gap-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="clinical-modal-header">
            <div>
              <p class="clinical-modal-kicker">Acta de entrega — Ley 17.132</p>
              <h2 class="clinical-modal-title">Entrega hospitalaria</h2>
              <p class="clinical-modal-subtitle">Registrá los datos del receptor antes de finalizar el traslado. Este acta tiene valor legal.</p>
            </div>
            <button type="button" class="clinical-close" (click)="showEntregaModal.set(false)">×</button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Hospital -->
            <label class="flex flex-col gap-1 col-span-2">
              <span class="clinical-field-label">Hospital receptor</span>
              @if (hospitales().length > 0) {
                <select class="clinical-input"
                        [value]="entregaHospitalId() ?? ''"
                        (change)="entregaHospitalId.set($any($event.target).value ? Number($any($event.target).value) : null)">
                  <option value="">Seleccionar hospital...</option>
                  @for (h of hospitales(); track h.id) {
                    <option [value]="h.id">{{ h.nombre }}{{ h.ciudad ? ' — ' + h.ciudad : '' }}</option>
                  }
                </select>
              } @else {
                <input class="clinical-input" placeholder="Hospital (cargá hospitales desde configuración)" disabled />
              }
            </label>

            <!-- Receptor -->
            <label class="flex flex-col gap-1">
              <span class="clinical-field-label">Nombre del receptor *</span>
              <input class="clinical-input" placeholder="Dr./Dra. Apellido" [value]="entregaReceptorNombre()" (input)="entregaReceptorNombre.set($any($event.target).value)" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="clinical-field-label">Matrícula del receptor</span>
              <input class="clinical-input" placeholder="MN / MP 12345" [value]="entregaReceptorMatricula()" (input)="entregaReceptorMatricula.set($any($event.target).value)" />
            </label>
            <label class="flex flex-col gap-1 col-span-2">
              <span class="clinical-field-label">Servicio receptor</span>
              <input class="clinical-input" placeholder="Ej: Guardia, UTI, Clínica Médica" [value]="entregaServicioReceptor()" (input)="entregaServicioReceptor.set($any($event.target).value)" />
            </label>

            <!-- Condición al momento de entrega -->
            <div class="col-span-2">
              <p class="clinical-field-label mb-2">Condición del paciente al momento de entrega</p>
              <div class="grid grid-cols-4 gap-2">
                <input class="clinical-input" placeholder="PA (ej: 120/80)" [value]="entregaPa()" (input)="entregaPa.set($any($event.target).value)" />
                <input class="clinical-input" type="number" placeholder="FC" [value]="entregaFc()" (input)="entregaFc.set($any($event.target).value)" />
                <input class="clinical-input" type="number" placeholder="SpO₂ %" [value]="entregaSatO2()" (input)="entregaSatO2.set($any($event.target).value)" />
                <input class="clinical-input" type="number" placeholder="Glasgow total" min="3" max="15" [value]="entregaGlasgow()" (input)="entregaGlasgow.set($any($event.target).value)" />
              </div>
            </div>

            <!-- Firma -->
            <label class="flex flex-col gap-1 col-span-2">
              <span class="clinical-field-label">Firma del receptor (texto / código)</span>
              <textarea rows="2" class="clinical-input" placeholder="Nombre completo y aclaración del receptor como constancia digital" [value]="entregaFirmaReceptor()" (input)="entregaFirmaReceptor.set($any($event.target).value)"></textarea>
            </label>
          </div>

          @if (entregaError()) {
            <p class="text-xs" style="color: #dc2626;">{{ entregaError() }}</p>
          }

          <div class="clinical-modal-footer">
            <button type="button" class="btn btn--ghost btn--sm" (click)="showEntregaModal.set(false)">Cancelar</button>
            <button type="button" class="btn btn--primary btn--sm"
                    [disabled]="entregaSaving() || !entregaReceptorNombre().trim()"
                    (click)="confirmarEntregaHospitalaria()">
              {{ entregaSaving() ? 'Registrando...' : 'Registrar entrega y finalizar traslado' }}
            </button>
          </div>
        </div>
      </div>
    }

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
    .clinical-modal-backdrop {
      background: rgba(15, 23, 42, 0.54);
      backdrop-filter: blur(10px) saturate(120%);
    }
    .clinical-modal-card {
      border-radius: 1rem;
      padding: 1.25rem;
      background: rgba(248, 250, 252, 0.98);
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
      color: #0f172a;
    }
    .clinical-modal-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.22);
    }
    .clinical-modal-kicker {
      font-family: monospace;
      font-size: 0.64rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #2563eb;
      margin: 0 0 0.25rem;
      font-weight: 700;
    }
    .clinical-modal-title {
      margin: 0;
      color: #0f172a;
      font-size: 1rem;
      font-weight: 700;
    }
    .clinical-modal-subtitle {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.85rem;
    }
    .clinical-close {
      width: 2rem;
      height: 2rem;
      border-radius: 0.65rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #475569;
      background: #fff;
      font-size: 1.25rem;
      line-height: 1;
    }
    .clinical-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.9rem;
      border-top: 1px solid rgba(148, 163, 184, 0.22);
    }
    .clinical-field-label {
      display: inline-flex;
      align-items: center;
      font-family: monospace;
      font-size: 0.68rem;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #475569;
      font-weight: 700;
      margin: 0 0 0.35rem;
    }
    .clinical-checkbox {
      color: #0f172a;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .clinical-checkbox input {
      width: 1rem;
      height: 1rem;
      accent-color: #2563eb;
    }
    .clinical-input {
      width: 100%;
      border-radius: 0.65rem;
      padding: 0.65rem 0.75rem;
      font-size: 0.875rem;
      background: #ffffff;
      border: 1px solid rgba(100, 116, 139, 0.35);
      color: #0f172a;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .clinical-input::placeholder {
      color: #94a3b8;
    }
    .clinical-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
    }
    .cancel-modal-card {
      box-shadow: 0 24px 70px rgba(127, 29, 29, 0.22), 0 12px 40px rgba(15, 23, 42, 0.25);
    }
    .cancel-modal-kicker {
      color: #dc2626;
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
  readonly tracking = signal<any | null>(null);
  readonly showDispatch = signal(false);
  readonly noteText = signal('');
  readonly notaError = signal<string | null>(null);
  readonly notaOk = signal(false);
  readonly showCancelDialog = signal(false);
  readonly cancelMotivo = signal('');
  readonly clinicalAtencion = signal<AtencionFullDTO | null>(null);
  readonly clinicalModal = signal<'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION' | null>(null);
  readonly savingClinical = signal(false);
  readonly clinicalError = signal<string | null>(null);
  readonly clinicalTitulo = signal('');
  readonly clinicalDetalle = signal('');
  readonly clinicalObservacion = signal('');
  readonly medMedicamento = signal('');
  readonly medDosis = signal('');
  readonly medVia = signal('');
  readonly showCloseDialog = signal(false);
  readonly closeImpresion = signal('');
  readonly closeTratamiento = signal('');
  readonly closeTipoResolucion = signal('RESUELTA_EN_SITIO');
  readonly closeRequiereTraslado = signal(false);
  readonly closeDestino = signal('');
  readonly closeNota = signal('');
  readonly svTa = signal('');
  readonly svFc = signal('');
  readonly svFr = signal('');
  readonly svSatO2 = signal('');
  readonly svTemp = signal('');
  readonly svGlucemia = signal('');

  // Glasgow / AVPU (both in signos modal and close dialog)
  readonly glasgowOcular = signal('');
  readonly glasgowVerbal = signal('');
  readonly glasgowMotor = signal('');
  readonly avpu = signal<'ALERTA' | 'VOZ' | 'DOLOR' | 'INCONSCIENTE' | ''>('');

  // Close dialog — regulatory fields
  readonly closeUrgenciaVital = signal(false);
  readonly closeNotificadoSAME107 = signal(false);
  readonly closeHospitalId = signal<number | null>(null);

  // Hospital catalog
  readonly hospitales = signal<HospitalDTO[]>([]);

  // EntregaHospitalaria modal
  readonly showEntregaModal = signal(false);
  readonly entregaReceptorNombre = signal('');
  readonly entregaReceptorMatricula = signal('');
  readonly entregaServicioReceptor = signal('');
  readonly entregaHospitalId = signal<number | null>(null);
  readonly entregaGlasgow = signal('');
  readonly entregaPa = signal('');
  readonly entregaFc = signal('');
  readonly entregaSatO2 = signal('');
  readonly entregaFirmaReceptor = signal('');
  readonly entregaSaving = signal(false);
  readonly entregaError = signal<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────
  readonly ticket = computed(() => this.detalle()?.ticket ?? null);
  readonly signos = computed(() => {
    const clinical = this.clinicalAtencion()?.signos ?? [];
    return clinical.length > 0 ? clinical : (this.detalle()?.signos ?? []);
  });
  readonly procedimientos = computed(() =>
    (this.clinicalAtencion()?.notas ?? [])
      .filter((n) => n.motivoConsulta === 'PROCEDIMIENTO')
      .map((n) => ({ id: n.id, descripcion: n.procedimientoRealizado ?? n.evolucion, ejecutadoPor: 'Operador', timestamp: n.fecha }))
  );
  readonly medicacion = computed(() =>
    (this.clinicalAtencion()?.notas ?? [])
      .filter((n) => n.motivoConsulta === 'MEDICACION')
      .map((n) => ({
        id: n.id,
        medicamento: this.extractMedicationPart(n.evolucion, 'Medicamento'),
        dosis: this.extractMedicationPart(n.evolucion, 'Dosis'),
        via: this.extractMedicationPart(n.evolucion, 'Vía'),
        administradoPor: 'Operador',
        timestamp: n.fecha,
      }))
  );

  readonly mapTickets = computed(() => {
    const t = this.ticket();
    return t?.latitud != null && t.longitud != null ? [t] : [];
  });

  readonly mapAmbulances = computed((): UnidadMovilDTO[] => {
    const t = this.ticket();
    const pos = this.tracking()?.ultimaPosicionAmbulancia;
    if (!t?.ambulanciaId || pos?.latitud == null || pos?.longitud == null) return [];
    return [{
      id: t.ambulanciaId,
      identificador: t.unidadAsignada ?? `AMB-${t.ambulanciaId}`,
      tipo: 'AMBULANCIA',
      estado: t.estado === 'EN_SITIO' ? 'EN_SITIO' : t.estado === 'TRASLADO' ? 'TRASLADO' : 'EN_RUTA',
      latitud: Number(pos.latitud),
      longitud: Number(pos.longitud),
      ticketActivo: t.id,
    } as UnidadMovilDTO];
  });

  readonly lastSigno = computed((): SignosVitalesDTO | null => {
    const arr = this.signos();
    return arr.length > 0 ? (arr[arr.length - 1] ?? null) : null;
  });

  readonly glasgowTotal = computed((): number | null => {
    const o = Number(this.glasgowOcular());
    const v = Number(this.glasgowVerbal());
    const m = Number(this.glasgowMotor());
    if (!o && !v && !m) return null;
    return (o || 0) + (v || 0) + (m || 0);
  });

  // Expose Number constructor for template use
  readonly Number = Number;

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
  readonly statusSteps = computed((): StatusStep[] => {
    const timelineStates = new Set(this.timeline().map((event) => event.estado));
    const ticket = this.ticket();
    const huboTraslado =
      timelineStates.has('TRASLADO') ||
      timelineStates.has('ENTREGADO') ||
      !!ticket?.horaInicioTraslado ||
      !!ticket?.horaFinTraslado;

    return ALL_STEPS.filter((step) => {
      if ((step.id === 'TRASLADO' || step.id === 'ENTREGADO') && !huboTraslado) return false;
      return true;
    });
  });

  readonly activeStepIndex = computed((): number => {
    const estado = this.ticket()?.estado ?? '';
    const steps = this.statusSteps();
    const idx = steps.findIndex((s) => s.id === estado);
    return idx >= 0 ? idx : Math.max(steps.length - 1, 0);
  });

  stepIndex(stepId: string): number {
    return this.statusSteps().findIndex((s) => s.id === stepId);
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
    const t = this.ticket();
    return !t?.ambulanciaId && (t?.estado === 'RECIBIDO' || t?.estado === 'EN_ESPERA');
  });

  readonly canMarkEnCamino = computed(() => {
    const t = this.ticket();
    return !!t?.ambulanciaId && (t.estado === 'RECIBIDO' || t.estado === 'DESPACHADO');
  });

  readonly canMarkEnSitio = computed(() => {
    const t = this.ticket();
    return !!t?.ambulanciaId && (t.estado === 'RECIBIDO' || t.estado === 'DESPACHADO' || t.estado === 'EN_CAMINO');
  });

  readonly canStartTransfer = computed(() => {
    const t = this.ticket();
    return t?.estado === 'EN_SITIO' && !t.horaInicioTraslado;
  });

  readonly canFinishTransfer = computed(() => {
    const t = this.ticket();
    return t?.estado === 'EN_SITIO' && !!t.horaInicioTraslado && !t.horaFinTraslado;
  });

  readonly canClose = computed(() => {
    const estado = this.ticket()?.estado;
    return estado !== 'CERRADO' && estado !== 'COMPLETADO' && estado !== 'CANCELADO';
  });

  readonly trasladoEnCurso = computed(() => {
    const t = this.ticket();
    return !!t?.horaInicioTraslado && !t.horaFinTraslado;
  });

  readonly canEditClinical = computed(() => {
    const estado = this.ticket()?.estado;
    return estado === 'EN_SITIO' || estado === 'EN_CAMINO' || estado === 'DESPACHADO';
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
    this.loadHospitales();
  }

  loadHospitales(): void {
    this.emergencyApi.getHospitales().subscribe({
      next: (data) => this.hospitales.set(data),
      error: () => {} // non-critical
    });
  }

  load(): void {
    const id = this.ticketId;
    this.loading.set(true);
    this.error.set(null);

    this.emergencyApi.getDetalle(id).subscribe({
      next: (data) => {
        this.detalle.set(data as TicketDetalleDTO);
        this.loadClinicalAtencion();
        this.loadTicketGeo(id);
        this.loadTracking(id);
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

  private loadTicketGeo(id: number): void {
    this.emergencyApi.getLatestGeo('TICKET', id).subscribe({
      next: (geo) => {
        this.detalle.update((current) => {
          if (!current?.ticket) return current;
          return {
            ...current,
            ticket: {
              ...current.ticket,
              latitud: geo.latitud,
              longitud: geo.longitud,
            },
          };
        });
      },
      error: () => void 0,
    });
  }

  private loadTracking(id: number): void {
    this.emergencyApi.getTracking(id).subscribe({
      next: (tracking) => this.tracking.set(tracking),
      error: () => this.tracking.set(null),
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

  loadClinicalAtencion(): void {
    this.emergencyApi.getAtencionesPorTicket(this.ticketId).subscribe({
      next: (items) => {
        const first = items?.[0];
        if (!first?.atencionId) {
          this.clinicalAtencion.set(null);
          return;
        }
        this.emergencyApi.getAtencionDetalle(first.atencionId).subscribe({
          next: (detalle) => this.clinicalAtencion.set(detalle),
          error: () => this.clinicalAtencion.set(null),
        });
      },
      error: () => this.clinicalAtencion.set(null),
    });
  }

  openClinicalModal(kind: 'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION'): void {
    this.clinicalModal.set(kind);
    this.clinicalError.set(null);
    this.clinicalTitulo.set('');
    this.clinicalDetalle.set('');
    this.clinicalObservacion.set('');
    this.medMedicamento.set('');
    this.medDosis.set('');
    this.medVia.set('');
    this.svTa.set('');
    this.svFc.set('');
    this.svFr.set('');
    this.svSatO2.set('');
    this.svTemp.set('');
    this.svGlucemia.set('');
    this.glasgowOcular.set('');
    this.glasgowVerbal.set('');
    this.glasgowMotor.set('');
    this.avpu.set('');
  }

  clinicalModalTitle(): string {
    switch (this.clinicalModal()) {
      case 'SIGNOS': return 'Cargar signos vitales';
      case 'PROCEDIMIENTO': return 'Registrar procedimiento';
      case 'MEDICACION': return 'Registrar medicación aplicada';
      default: return 'Carga clínica';
    }
  }

  guardarClinicalModal(): void {
    this.savingClinical.set(true);
    this.clinicalError.set(null);
    this.ensureClinicalAtencion().then((atencion) => {
      const updated: AtencionFullDTO = {
        ...atencion,
        tipo: atencion.tipo ?? 'URGENCIA',
        canal: atencion.canal ?? 'TELEFONICA',
        estado: atencion.estado ?? 'EN_CURSO',
        notas: [...(atencion.notas ?? [])],
        signos: [...(atencion.signos ?? [])],
      };

      const now = new Date().toISOString();
      if (this.clinicalModal() === 'SIGNOS') {
        const parsedTa = this.parseTa(this.svTa());
        const signo = {
          fechaHora: now,
          presionSistolica: parsedTa.sistolica,
          presionDiastolica: parsedTa.diastolica,
          frecuenciaCardiaca: this.toNumber(this.svFc()),
          frecuenciaRespiratoria: this.toNumber(this.svFr()),
          saturacionOxigeno: this.toNumber(this.svSatO2()),
          temperatura: this.toNumber(this.svTemp()),
          glucemia: this.toNumber(this.svGlucemia()),
          glasgowOcular: this.toNumber(this.glasgowOcular()) ?? undefined,
          glasgowVerbal: this.toNumber(this.glasgowVerbal()) ?? undefined,
          glasgowMotor: this.toNumber(this.glasgowMotor()) ?? undefined,
          glasgowTotal: this.glasgowTotal() ?? undefined,
          avpu: this.avpu() || undefined,
          observacion: this.clinicalObservacion().trim() || undefined,
        };
        this.validarSignosVitales(signo);
        updated.signos!.push(signo);
      }

      if (this.clinicalModal() === 'PROCEDIMIENTO') {
        const titulo = this.clinicalTitulo().trim();
        const detalle = this.clinicalDetalle().trim();
        if (!titulo && !detalle) throw new Error('Indicá procedimiento o detalle');
        updated.notas!.push({
          fecha: now,
          motivoConsulta: 'PROCEDIMIENTO',
          tipoConsulta: 'URGENCIA',
          procedimientoRealizado: titulo || detalle,
          evolucion: detalle || titulo,
        });
      }

      if (this.clinicalModal() === 'MEDICACION') {
        const medicamento = this.medMedicamento().trim();
        if (!medicamento) throw new Error('Indicá medicamento');
        updated.notas!.push({
          fecha: now,
          motivoConsulta: 'MEDICACION',
          tipoConsulta: 'URGENCIA',
          evolucion: `Medicamento: ${medicamento}
Dosis: ${this.medDosis().trim() || 'S/D'}
Vía: ${this.medVia().trim() || 'S/D'}
Observación: ${this.clinicalObservacion().trim() || '—'}`,
        });
      }

      this.emergencyApi.guardarAtencionCompleta(this.sanitizeClinicalPayload(updated)).subscribe({
        next: (saved) => {
          this.clinicalAtencion.set(saved);
          this.savingClinical.set(false);
          this.clinicalModal.set(null);
          this.load();
        },
        error: (error) => {
          this.savingClinical.set(false);
          this.clinicalError.set(error?.error?.title ?? error?.error?.detail ?? 'No se pudo guardar la carga clínica');
        },
      });
    }).catch((error) => {
      this.savingClinical.set(false);
      this.clinicalError.set(error?.message ?? 'No se pudo preparar la atención clínica');
    });
  }

  private ensureClinicalAtencion(): Promise<AtencionFullDTO> {
    const current = this.clinicalAtencion();
    if (current?.atencionId && current.turnoId) return Promise.resolve(current);
    return new Promise((resolve, reject) => {
      this.emergencyApi.iniciarAtencionDesdeTicket(this.ticketId).subscribe({
        next: (created) => {
          this.emergencyApi.getAtencionDetalle(created.atencionId).subscribe({
            next: resolve,
            error: reject,
          });
        },
        error: reject,
      });
    });
  }

  private parseTa(value: string): { sistolica?: number; diastolica?: number } {
    if (!value.trim()) return {};
    const parts = value.split('/');
    if (parts.length !== 2) throw new Error('Ingresá la presión arterial como sistólica/diastólica. Ej: 120/80');
    const [sistolica, diastolica] = parts.map((part) => this.toNumber(part));
    return { sistolica, diastolica };
  }

  private toNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private validarSignosVitales(signo: {
    presionSistolica?: number;
    presionDiastolica?: number;
    frecuenciaCardiaca?: number;
    frecuenciaRespiratoria?: number;
    saturacionOxigeno?: number;
    temperatura?: number;
    glucemia?: number;
  }): void {
    this.validarRango(signo.presionSistolica, 60, 300, 'PA sistólica');
    this.validarRango(signo.presionDiastolica, 30, 200, 'PA diastólica');
    this.validarRango(signo.frecuenciaCardiaca, 30, 220, 'frecuencia cardíaca');
    this.validarRango(signo.frecuenciaRespiratoria, 8, 60, 'frecuencia respiratoria');
    this.validarRango(signo.saturacionOxigeno, 70, 100, 'SpO₂');
    this.validarRango(signo.temperatura, 30, 45, 'temperatura');
    this.validarRango(signo.glucemia, 20, 600, 'glucemia');
  }

  private validarRango(value: number | undefined, min: number, max: number, label: string): void {
    if (value === undefined) return;
    if (value < min || value > max) {
      throw new Error(`${label} fuera de rango (${min}-${max}). Revisá el dato antes de guardar.`);
    }
  }

  private sanitizeClinicalPayload(atencion: AtencionFullDTO): AtencionFullDTO {
    return {
      ...atencion,
      notas: (atencion.notas ?? []).map((nota: any) => ({
        id: nota.id,
        fecha: nota.fecha,
        motivoConsulta: nota.motivoConsulta,
        tipoConsulta: nota.tipoConsulta,
        procedimientoRealizado: nota.procedimientoRealizado,
        evolucion: nota.evolucion,
        observacion: nota.observacion,
      })),
      signos: (atencion.signos ?? []).map((signo: any) => ({
        id: signo.id,
        fechaHora: signo.fechaHora ?? signo.timestamp,
        presionSistolica: signo.presionSistolica,
        presionDiastolica: signo.presionDiastolica,
        frecuenciaCardiaca: signo.frecuenciaCardiaca,
        frecuenciaRespiratoria: signo.frecuenciaRespiratoria,
        saturacionOxigeno: signo.saturacionOxigeno ?? signo.saturacionO2,
        temperatura: signo.temperatura,
        glucemia: signo.glucemia,
        glasgowOcular: signo.glasgowOcular,
        glasgowVerbal: signo.glasgowVerbal,
        glasgowMotor: signo.glasgowMotor,
        glasgowTotal: signo.glasgowTotal,
        avpu: signo.avpu,
        observacion: signo.observacion,
      })),
    };
  }

  private extractMedicationPart(text: string | undefined, label: string): string | undefined {
    if (!text) return undefined;
    const line = text.split('\n').find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return line?.split(':').slice(1).join(':').trim();
  }

  agregarNota(): void {
    const nota = this.noteText().trim();
    if (!nota) return;
    this.notaError.set(null);
    this.notaOk.set(false);
    this.emergencyApi.agregarNota(this.ticketId, nota).subscribe({
      next: () => {
        this.noteText.set('');
        this.notaOk.set(true);
        setTimeout(() => this.notaOk.set(false), 3000);
        this.load();
      },
      error: () => {
        this.notaError.set('No se pudo guardar la nota');
      },
    });
  }

  marcarEnCamino(): void {
    this.emergencyApi.enCamino(this.ticketId).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al marcar en camino'),
    });
  }

  marcarEnSitio(): void {
    this.emergencyApi.enSitio(this.ticketId).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al marcar en sitio'),
    });
  }

  iniciarTraslado(): void {
    this.emergencyApi.iniciarTraslado(this.ticketId).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al iniciar traslado'),
    });
  }

  finalizarTraslado(): void {
    // Reset entrega modal signals
    this.entregaReceptorNombre.set('');
    this.entregaReceptorMatricula.set('');
    this.entregaServicioReceptor.set('');
    this.entregaHospitalId.set(null);
    this.entregaGlasgow.set('');
    this.entregaPa.set('');
    this.entregaFc.set('');
    this.entregaSatO2.set('');
    this.entregaFirmaReceptor.set('');
    this.entregaError.set(null);
    this.showEntregaModal.set(true);
  }

  confirmarEntregaHospitalaria(): void {
    const nombre = this.entregaReceptorNombre().trim();
    if (!nombre) {
      this.entregaError.set('El nombre del receptor es obligatorio');
      return;
    }

    this.entregaSaving.set(true);
    this.entregaError.set(null);

    const dto: EntregaHospitalariaDTO = {
      receptorNombre: nombre,
      receptorMatricula: this.entregaReceptorMatricula().trim() || undefined,
      servicioReceptor: this.entregaServicioReceptor().trim() || undefined,
      hospitalId: this.entregaHospitalId() ?? undefined,
      horaEntrega: new Date().toISOString(),
      condicionEntregaGlasgow: this.toNumber(this.entregaGlasgow()) ?? undefined,
      condicionEntregaPa: this.entregaPa().trim() || undefined,
      condicionEntregaFc: this.toNumber(this.entregaFc()) ?? undefined,
      condicionEntregaSatO2: this.toNumber(this.entregaSatO2()) ?? undefined,
      firmaReceptor: this.entregaFirmaReceptor().trim() || undefined,
    };

    this.emergencyApi.registrarEntregaHospitalaria(this.ticketId, dto).subscribe({
      next: () => {
        // Now finalize the transfer
        this.emergencyApi.finalizarTraslado(this.ticketId).subscribe({
          next: () => {
            this.showEntregaModal.set(false);
            this.entregaSaving.set(false);
            this.load();
          },
          error: () => {
            this.entregaSaving.set(false);
            this.entregaError.set('Entrega registrada pero error al finalizar traslado');
            this.load();
          },
        });
      },
      error: (err) => {
        this.entregaSaving.set(false);
        this.entregaError.set(err?.error?.detail ?? 'Error al registrar la entrega hospitalaria');
      },
    });
  }

  cerrar(): void {
    this.closeImpresion.set('');
    this.closeTratamiento.set('');
    this.closeTipoResolucion.set('RESUELTA_EN_SITIO');
    this.closeRequiereTraslado.set(false);
    this.closeDestino.set('');
    this.closeNota.set('');
    this.svTa.set('');
    this.svFc.set('');
    this.svFr.set('');
    this.svSatO2.set('');
    this.svTemp.set('');
    this.svGlucemia.set('');
    this.glasgowOcular.set('');
    this.glasgowVerbal.set('');
    this.glasgowMotor.set('');
    this.avpu.set('');
    this.closeUrgenciaVital.set(false);
    this.closeNotificadoSAME107.set(false);
    this.closeHospitalId.set(null);
    this.showCloseDialog.set(true);
  }

  confirmarCierre(): void {
    const req: CerrarTicketRequest = {
      nota: this.closeNota().trim() || undefined,
      resolucion: {
        impresionClinica: this.closeImpresion().trim(),
        tratamientoRealizado: this.closeTratamiento().trim() || undefined,
        requiereTraslado: this.closeRequiereTraslado(),
        tipoResolucion: this.closeTipoResolucion(),
        destinoTraslado: this.closeHospitalId()
          ? ((this.hospitales().find(h => h.id === this.closeHospitalId())?.nombre ?? this.closeDestino().trim()) || undefined)
          : (this.closeDestino().trim() || undefined),
        urgenciaVitalSinConsentimiento: this.closeUrgenciaVital() || undefined,
        notificadoSAME107: this.closeNotificadoSAME107() || undefined,
        signosVitales: {
          ta: this.svTa().trim() || undefined,
          fc: this.toNumber(this.svFc()),
          fr: this.toNumber(this.svFr()),
          satO2: this.toNumber(this.svSatO2()),
          temp: this.toNumber(this.svTemp()),
          glucemia: this.toNumber(this.svGlucemia()),
          // Glasgow y AVPU van en signosVitales — es donde el backend los persiste
          glasgowOcular: this.toNumber(this.glasgowOcular()) ?? undefined,
          glasgowVerbal: this.toNumber(this.glasgowVerbal()) ?? undefined,
          glasgowMotor: this.toNumber(this.glasgowMotor()) ?? undefined,
          glasgowTotal: this.glasgowTotal() ?? undefined,
          avpu: this.avpu() || undefined,
        },
      },
    };
    this.emergencyApi.cerrar(this.ticketId, req).subscribe({
      next: () => {
        this.showCloseDialog.set(false);
        this.load();
      },
      error: () => this.error.set('Error al cerrar el ticket'),
    });
  }

  cancelar(): void {
    this.cancelMotivo.set('');
    this.showCancelDialog.set(true);
  }

  confirmarCancelacion(): void {
    const motivo = this.cancelMotivo().trim();
    if (!motivo) return;
    const req: CancelarTicketRequest = { motivo };
    this.emergencyApi.cancelar(this.ticketId, req).subscribe({
      next: () => {
        this.showCancelDialog.set(false);
        this.cancelMotivo.set('');
        this.load();
      },
      error: () => this.error.set('Error al cancelar el ticket'),
    });
  }

  timelineColor(estado: string): string {
    const map: Record<string, string> = {
      'RECIBIDO':   'var(--accent-red)',
      'DESPACHADO': 'var(--accent-blue)',
      'EN_CAMINO':  'var(--accent-blue)',
      'EN_SITIO':   'var(--accent-amber)',
      'TRASLADO':   'var(--accent-cyan)',
      'ENTREGADO':  'var(--accent-emerald)',
      'COMPLETADO': 'var(--text-muted)',
      'CERRADO':    'var(--text-muted)',
      'CANCELADO':  'var(--accent-red)',
    };
    return map[estado] ?? 'var(--text-muted)';
  }

  timelineLabel(estado: string): string {
    const map: Record<string, string> = {
      'RECIBIDO':   'CREACIÓN',
      'DESPACHADO': 'DESPACHO',
      'EN_CAMINO':  'EN RUTA',
      'EN_SITIO':   'EN SITIO',
      'TRASLADO':   'TRASLADO',
      'ENTREGADO':  'ENTREGADO',
      'COMPLETADO': 'CIERRE',
      'CERRADO':    'CIERRE',
      'CANCELADO':  'CANCELADO',
    };
    return map[estado] ?? estado;
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
