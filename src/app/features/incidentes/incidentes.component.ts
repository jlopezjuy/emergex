import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { IncidentesApiService, IncidenteEventoDTO, IncidenteEventoPayload, EstadoIncidenteEvento } from '../../data-access/api/incidentes.api';
import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

/** Formulario de alta/edición de un siniestro masivo. */
interface IncidenteForm {
  descripcion: string;
  direccion: string;
  fechaHoraLocal: string;
  latitud: number | undefined;
  longitud: number | undefined;
}

/** Formulario de alta vacío. */
function emptyForm(): IncidenteForm {
  return { descripcion: '', direccion: '', fechaHoraLocal: '', latitud: undefined, longitud: undefined };
}

/**
 * Pantalla de incidentes multi-paciente (accidentes masivos).
 *
 * <p>Lista los siniestros de la empresa actual (filtrable por estado ABIERTO/CERRADO),
 * permite crear uno nuevo y abre un modal de detalle con los tickets de asistencia
 * vinculados, desde donde se puede vincular/desvincular un ticket y cerrar el
 * siniestro cuando no quedan asistencias activas. Replica el patrón visual de
 * {@code events.component.ts}.</p>
 */
@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [CommonModule, DatePipe, StatusBadgeComponent],
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div
            style="width:36px;height:36px;border-radius:10px;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-red)" stroke-width="1.5">
              <circle cx="7" cy="7" r="5"/>
              <path d="M7 4v3l2 1.5"/>
              <path d="M14 14l3 3"/>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Incidentes Multi-Paciente</h1>
            <p class="text-xs mt-0.5 font-mono" style="color:var(--text-muted);">SINIESTROS MASIVOS · TRAZABILIDAD DE VÍCTIMAS</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-4 px-4 py-2 rounded-lg"
            style="background:var(--surface-glass);border:1px solid var(--border-glass);"
          >
            <div class="text-center">
              <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">Abiertos</div>
              <div class="font-mono font-bold text-lg leading-none" style="color:var(--accent-emerald);">{{ abiertos() }}</div>
            </div>
            <div class="text-center">
              <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">Cerrados</div>
              <div class="font-mono font-bold text-lg leading-none" style="color:var(--text-muted);">{{ cerrados() }}</div>
            </div>
          </div>

          <button type="button" class="btn btn--primary btn--sm" (click)="openCreate()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 1v10M1 6h10"/>
            </svg>
            Nuevo incidente
          </button>
        </div>
      </div>

      <!-- ── Body ───────────────────────────────────────────────────────── -->
      <div class="flex-1 overflow-hidden px-4 pb-4 min-h-0">
        <div
          class="h-full flex flex-col rounded-xl overflow-hidden"
          style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);"
        >
          <!-- Toolbar -->
          <div
            class="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style="border-bottom:1px solid var(--border-glass);"
          >
            <div class="relative" style="flex:1;max-width:260px;">
              <svg
                class="absolute"
                style="left:9px;top:50%;transform:translateY(-50%);"
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                stroke="var(--text-muted)"
                stroke-width="1.5"
              >
                <circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l3 3"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar incidente..."
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)"
                style="width:100%;padding:6px 10px 6px 28px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;"
              />
            </div>

            <div class="flex items-center gap-1">
              @for (f of statusFilters; track f.value) {
                <button
                  type="button"
                  style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;border:1px solid;cursor:pointer;transition:all 0.15s;"
                  [style.background]="statusFilter() === f.value ? 'rgba(239,68,68,0.12)' : 'transparent'"
                  [style.border-color]="statusFilter() === f.value ? 'var(--accent-red)' : 'var(--border-glass)'"
                  [style.color]="statusFilter() === f.value ? 'var(--accent-red)' : 'var(--text-muted)'"
                  (click)="statusFilter.set(f.value)"
                >{{ f.label }}</button>
              }
            </div>
          </div>

          <!-- List body -->
          <div class="flex-1 overflow-y-auto">
            @if (loading()) {
              <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                <span class="ac-spinner"></span>
                <span style="font-size:13px;margin-top:10px;">Cargando incidentes...</span>
              </div>
            } @else if (error()) {
              <div class="flex flex-col items-center justify-center py-16" style="color:var(--accent-red); gap:8px;">
                <span style="font-size:13px;font-weight:600;">Error al cargar incidentes</span>
                <button type="button" class="btn btn--secondary btn--sm" (click)="loadIncidentes()">Reintentar</button>
              </div>
            } @else {
              @for (inc of filteredIncidentes(); track inc.id) {
                <button
                  type="button"
                  class="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors"
                  style="border-bottom:1px solid var(--border-hairline);background:transparent;border-left:none;border-right:none;border-top:none;cursor:pointer;"
                  (click)="openDetail(inc)"
                >
                  <div
                    style="width:4px;align-self:stretch;border-radius:2px;flex-shrink:0;"
                    [style.background]="inc.estado === 'ABIERTO' ? 'var(--accent-red)' : 'var(--text-muted)'"
                  ></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-mono font-bold" style="font-size:13px;color:var(--accent-cyan);">{{ inc.numeroIncidente ?? '#' + inc.id }}</span>
                      <span class="font-semibold truncate" style="font-size:13.5px;color:var(--text-primary);">{{ inc.descripcion }}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span style="font-size:12px;color:var(--text-secondary);">{{ inc.fechaHora | date:'dd/MM/yyyy HH:mm' }}</span>
                      @if (inc.direccion) {
                        <span style="font-size:11px;color:var(--text-muted);">· {{ inc.direccion }}</span>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <span class="font-mono" style="font-size:11px;color:var(--text-muted);">{{ inc.ticketsCount ?? 0 }} tickets</span>
                    <emx-status-badge [variant]="inc.estado === 'ABIERTO' ? 'critical' : 'info'" [pulse]="inc.estado === 'ABIERTO'">
                      {{ inc.estado }}
                    </emx-status-badge>
                  </div>
                </button>
              }

              @if (filteredIncidentes().length === 0) {
                <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:10px;opacity:0.4;">
                    <circle cx="14" cy="14" r="9"/>
                    <path d="M21 21l8 8"/>
                  </svg>
                  <span style="font-size:13px;">No se encontraron incidentes</span>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- ── Modal de detalle ───────────────────────────────────────────── -->
      @if (selected(); as inc) {
        <div
          style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;"
          (click)="selected.set(null)"
        >
          <div
            style="width:min(560px,92vw);background:var(--surface-glass);border:1px solid var(--border-glass);border-radius:16px;backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden;"
            (click)="$event.stopPropagation()"
          >
            <!-- Head -->
            <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-glass);">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-mono uppercase tracking-wider mb-1" style="font-size:10px;color:var(--accent-red);">
                    {{ inc.estado === 'ABIERTO' ? '● SINIESTRO EN CURSO' : '● SINIESTRO FINALIZADO' }}
                  </div>
                  <h2 style="font-size:17px;font-weight:700;color:var(--text-primary);margin:0 0 2px;">
                    {{ inc.numeroIncidente ?? '#' + inc.id }}
                  </h2>
                  <div style="font-size:13px;color:var(--text-secondary);">{{ inc.descripcion }}</div>
                </div>
                <button
                  type="button"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border-glass);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;"
                  (click)="selected.set(null)"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l10 10M11 1L1 11"/></svg>
                </button>
              </div>
              <div class="flex items-center gap-3 mt-3">
                <emx-status-badge [variant]="inc.estado === 'ABIERTO' ? 'critical' : 'info'" [pulse]="inc.estado === 'ABIERTO'">
                  {{ inc.estado }}
                </emx-status-badge>
                <span class="font-mono" style="font-size:12px;color:var(--text-muted);">{{ tickets().length }} ticket(s) vinculados</span>
              </div>
            </div>

            <!-- Datos del siniestro -->
            <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid var(--border-glass);">
              <div>
                <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Fecha y hora</div>
                <div style="font-size:13px;color:var(--text-primary);">{{ inc.fechaHora | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>
              <div>
                <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Ubicación</div>
                <div style="font-size:13px;color:var(--text-primary);">{{ inc.direccion ?? (inc.latitud != null && inc.longitud != null ? inc.latitud.toFixed(5) + ', ' + inc.longitud.toFixed(5) : '—') }}</div>
              </div>
            </div>

            <!-- Vincular ticket -->
            @if (inc.estado === 'ABIERTO') {
              <div style="padding:12px 20px;border-bottom:1px solid var(--border-glass);display:flex;align-items:center;gap:8px;">
                <input
                  type="number"
                  placeholder="ID del ticket a vincular"
                  [value]="vincularInput()"
                  (input)="vincularInput.set($any($event.target).value)"
                  style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;"
                />
                <button type="button" class="btn btn--primary btn--sm" [disabled]="!vincularInput()" (click)="vincularTicket(inc.id)">Vincular</button>
              </div>
            }

            <!-- Tickets vinculados -->
            <div style="padding:12px 20px 16px;max-height:240px;overflow-y:auto;">
              <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.08em;">Tickets de asistencia vinculados</div>
              @if (loadingTickets()) {
                <div style="display:flex;align-items:center;justify-content:center;padding:20px;color:var(--text-muted);font-size:12px;">
                  <span>Cargando tickets...</span>
                </div>
              } @else if (tickets().length === 0) {
                <div style="padding:15px;text-align:center;color:var(--text-muted);font-size:12px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px dashed var(--border-glass);">
                  Sin tickets vinculados. Asignálos desde el tablero o con el campo de arriba.
                </div>
              } @else {
                <div style="display:flex;flex-direction:column;gap:6px;">
                  @for (t of tickets(); track t.id) {
                    <div style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border-glass);">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <span class="font-mono font-bold" style="font-size:11px;color:var(--accent-cyan);">{{ t.codigo ?? '#' + t.id }}</span>
                        <div style="display:flex;align-items:center;gap:6px;">
                          @if (t.nivelUrgencia) {
                            <span class="font-mono font-bold" style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(239,68,68,0.1);color:var(--accent-red);">{{ t.nivelUrgencia }}</span>
                          }
                          <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.05);color:var(--text-secondary);">{{ t.estado }}</span>
                          @if (inc.estado === 'ABIERTO') {
                            <button
                              type="button"
                              title="Desvincular del incidente"
                              style="width:18px;height:18px;border-radius:4px;border:1px solid var(--border-glass);background:transparent;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;"
                              (click)="desvincularTicket(inc.id, t.id)"
                            >×</button>
                          }
                        </div>
                      </div>
                      @if (t.pacienteDescripcion) {
                        <div style="font-size:12px;color:var(--text-primary);">{{ t.pacienteDescripcion }}</div>
                      }
                      <div style="display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--text-muted);">
                        <span>{{ t.direccion ?? 'Sin dirección' }}</span>
                        @if (t.unidadAsignada) {
                          <span class="font-mono" style="color:var(--accent-emerald);">{{ t.unidadAsignada }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer -->
            <div style="padding:12px 20px;border-top:1px solid var(--border-glass);display:flex;align-items:center;justify-content:space-between;background:var(--bg-elevated);">
              <span class="font-mono" style="font-size:10px;color:var(--text-muted);">ESC para cerrar</span>
              <div class="flex gap-2">
                @if (inc.estado === 'ABIERTO') {
                  <button type="button" class="btn btn--danger btn--sm" (click)="cerrar(inc.id)">Cerrar incidente</button>
                }
                <button type="button" class="btn btn--primary btn--sm" (click)="selected.set(null)">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ── Modal de creación ───────────────────────────────────────────── -->
      @if (createOpen()) {
        <div
          style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;"
          (click)="createOpen.set(false)"
        >
          <div
            style="width:min(520px,94vw);background:var(--surface-glass);border:1px solid var(--border-glass);border-radius:16px;backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden;"
            (click)="$event.stopPropagation()"
          >
            <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-glass);">
              <div class="flex items-start justify-between">
                <div>
                  <div class="font-mono uppercase tracking-wider mb-1" style="font-size:10px;color:var(--accent-red);">● ALTA DE SINIESTRO</div>
                  <h2 style="font-size:18px;font-weight:700;color:var(--text-primary);margin:0;">Nuevo incidente</h2>
                </div>
                <button
                  type="button"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border-glass);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);"
                  (click)="createOpen.set(false)"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l10 10M11 1L1 11"/></svg>
                </button>
              </div>
            </div>

            <div style="padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;max-height:60vh;">
              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Descripción *</label>
                <textarea
                  placeholder="Ej: Choque colectivo en ruta 9 con 12 heridos"
                  rows="3"
                  [value]="form().descripcion"
                  (input)="updateForm('descripcion', $any($event.target).value)"
                  style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;resize:vertical;box-sizing:border-box;"
                ></textarea>
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección del siniestro"
                  [value]="form().direccion"
                  (input)="updateForm('direccion', $any($event.target).value)"
                  style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;"
                />
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  [value]="form().fechaHoraLocal"
                  (input)="updateForm('fechaHoraLocal', $any($event.target).value)"
                  style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;"
                />
              </div>
              <div style="display:flex;gap:12px;">
                <div style="flex:1;">
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-24.1850"
                    [value]="form().latitud ?? ''"
                    (input)="updateForm('latitud', parseCoord($any($event.target).value))"
                    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;"
                  />
                </div>
                <div style="flex:1;">
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-65.2990"
                    [value]="form().longitud ?? ''"
                    (input)="updateForm('longitud', parseCoord($any($event.target).value))"
                    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;"
                  />
                </div>
              </div>
              @if (error()) {
                <div
                  style="padding:10px 14px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:var(--accent-red);font-size:13px;"
                >{{ error() }}</div>
              }
            </div>

            <div style="padding:12px 20px;border-top:1px solid var(--border-glass);display:flex;align-items:center;justify-content:flex-end;gap:8px;background:var(--bg-elevated);">
              <button type="button" class="btn btn--ghost btn--sm" (click)="createOpen.set(false)">Cancelar</button>
              <button type="button" class="btn btn--primary btn--sm" [disabled]="!canCreate()" (click)="submitCreate()">
                {{ creating() ? 'Creando...' : 'Registrar incidente' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class IncidentesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private incidentesApi = inject(IncidentesApiService);

  /** Filtros de estado que se muestran en la toolbar. */
  readonly statusFilters: { value: EstadoIncidenteEvento | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'ABIERTO', label: 'Abiertos' },
    { value: 'CERRADO', label: 'Cerrados' },
  ];

  readonly incidentes = signal<IncidenteEventoDTO[]>([]);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<EstadoIncidenteEvento | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selected = signal<IncidenteEventoDTO | null>(null);
  readonly tickets = signal<TicketAsistenciaDTO[]>([]);
  readonly loadingTickets = signal(false);
  readonly vincularInput = signal('');

  readonly createOpen = signal(false);
  readonly creating = signal(false);
  readonly form = signal<IncidenteForm>(emptyForm());

  /** KPI: cantidad de siniestros abiertos. */
  readonly abiertos = computed(() => this.incidentes().filter(i => i.estado === 'ABIERTO').length);

  /** KPI: cantidad de siniestros cerrados. */
  readonly cerrados = computed(() => this.incidentes().filter(i => i.estado === 'CERRADO').length);

  /** Incidentes visibles tras aplicar búsqueda de texto y filtro de estado. */
  readonly filteredIncidentes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const estado = this.statusFilter();
    return this.incidentes().filter(i => {
      if (estado && i.estado !== estado) return false;
      if (!q) return true;
      return (
        (i.numeroIncidente ?? '').toLowerCase().includes(q) ||
        (i.descripcion ?? '').toLowerCase().includes(q) ||
        (i.direccion ?? '').toLowerCase().includes(q)
      );
    });
  });

  /** El formulario de alta es válido con descripción + fecha/hora. */
  readonly canCreate = computed(() => this.form().descripcion.trim().length > 0 && !!this.form().fechaHoraLocal && !this.creating());

  ngOnInit(): void {
    this.loadIncidentes();
  }

  /** Carga la lista de incidentes de la empresa actual desde el backend. */
  loadIncidentes(): void {
    this.loading.set(true);
    this.error.set(null);
    this.incidentesApi
      .getIncidentes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.incidentes.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la lista de incidentes.');
          this.loading.set(false);
        },
      });
  }

  /** Abre el modal de detalle y carga los tickets vinculados del siniestro. */
  openDetail(inc: IncidenteEventoDTO): void {
    this.selected.set(inc);
    this.vincularInput.set('');
    this.tickets.set([]);
    this.loadingTickets.set(true);
    this.incidentesApi
      .getTicketsIncidente(inc.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.tickets.set(list);
          this.loadingTickets.set(false);
        },
        error: () => {
          this.tickets.set([]);
          this.loadingTickets.set(false);
        },
      });
  }

  /** Vincula un ticket existente al siniestro (asignación explícita del operador). */
  vincularTicket(incidenteId: number): void {
    const ticketId = Number(this.vincularInput());
    if (!ticketId) return;
    this.incidentesApi
      .vincularTicket(incidenteId, ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.vincularInput.set('');
          const inc = this.selected();
          if (inc) this.openDetail(inc);
          this.loadIncidentes();
        },
        error: err => {
          const msg = err?.error?.detail || err?.error?.message || err?.message || 'No se pudo vincular el ticket.';
          alert(msg);
        },
      });
  }

  /** Desvincula un ticket del siniestro. */
  desvincularTicket(incidenteId: number, ticketId: number): void {
    this.incidentesApi
      .desvincularTicket(incidenteId, ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const inc = this.selected();
          if (inc) this.openDetail(inc);
          this.loadIncidentes();
        },
        error: err => {
          const msg = err?.error?.detail || err?.error?.message || err?.message || 'No se pudo desvincular el ticket.';
          alert(msg);
        },
      });
  }

  /** Cierra el siniestro (el backend lo rechaza si quedan tickets activos). */
  cerrar(incidenteId: number): void {
    this.incidentesApi
      .cerrarIncidente(incidenteId)
      .pipe(catchError(err => {
        const msg = err?.error?.detail || err?.error?.message || err?.message || 'No se pudo cerrar el incidente.';
        alert(msg);
        return of(null);
      }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        if (res) {
          this.selected.set(null);
          this.loadIncidentes();
        }
      });
  }

  /** Abre el modal de alta de un nuevo siniestro. */
  openCreate(): void {
    this.form.set(emptyForm());
    this.error.set(null);
    this.createOpen.set(true);
  }

  /** Actualiza un campo del formulario de alta. */
  updateForm(key: keyof IncidenteForm, value: string | number | undefined): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  /** Convierte la entrada de una coordenada en número o undefined. */
  parseCoord(value: string): number | undefined {
    const n = Number(value);
    return value === '' || Number.isNaN(n) ? undefined : n;
  }

  /** Registra el nuevo siniestro en el backend y refresca la lista. */
  submitCreate(): void {
    if (!this.canCreate()) return;
    const f = this.form();
    const payload: IncidenteEventoPayload = {
      descripcion: f.descripcion.trim(),
      fechaHora: new Date(f.fechaHoraLocal).toISOString(),
      ...(f.direccion?.trim() ? { direccion: f.direccion.trim() } : {}),
      ...(f.latitud != null ? { latitud: f.latitud } : {}),
      ...(f.longitud != null ? { longitud: f.longitud } : {}),
    };
    this.creating.set(true);
    this.error.set(null);
    this.incidentesApi
      .crearIncidente(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.loadIncidentes();
        },
        error: () => {
          this.creating.set(false);
          this.error.set('No se pudo crear el incidente. Verificá los datos e intentá de nuevo.');
        },
      });
  }
}
