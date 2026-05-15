import { Component, input, output, inject, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { UnidadMovilDTO, TurnoMovilDTO, TripulacionMovilDTO, GuardiaDTO, LogTurnoDTO } from '../../../data-access/dto/ambulancia.dto';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type TabId = 'activo' | 'programar' | 'tripulacion' | 'calendario';

@Component({
  selector: 'emx-unit-schedule-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalShellComponent,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <emx-modal-shell [title]="'Configurar: ' + (unit().identificador ?? ('U-' + unit().id))" (closed)="closed.emit()">
      <!-- Tabs -->
      <div class="flex gap-1 mb-4 border-b" style="border-color: var(--border-glass);">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            class="px-3 py-2 text-xs font-semibold transition-colors"
            [style.color]="activeTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
            [style.border-bottom]="activeTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
            (click)="setTab(tab.id)"
          >{{ tab.label }}</button>
        }
      </div>

      <!-- TAB: Turno activo -->
      @if (activeTab() === 'activo') {
        @if (loadingTurno()) {
          <emx-loading-state />
        } @else if (turnoActivo()) {
          <div class="flex flex-col gap-3 text-sm">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs" style="color: var(--text-muted);">ID Turno</p>
                <p class="font-mono font-semibold mt-0.5" style="color: var(--text-primary);">#{{ turnoActivo()!.id }}</p>
              </div>
              <div>
                <p class="text-xs" style="color: var(--text-muted);">Tipo</p>
                <p class="font-semibold mt-0.5" style="color: var(--text-primary);">{{ turnoActivo()!.tipo ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs" style="color: var(--text-muted);">Inicio</p>
                <p class="font-mono text-xs mt-0.5" style="color: var(--text-primary);">{{ formatDate(turnoActivo()!.fechaInicio) }}</p>
              </div>
              <div>
                <p class="text-xs" style="color: var(--text-muted);">Fin</p>
                <p class="font-mono text-xs mt-0.5" style="color: var(--text-primary);">{{ formatDate(turnoActivo()!.fechaFin) }}</p>
              </div>
            </div>

            @if (turnoActivo()!.tripulacion && turnoActivo()!.tripulacion!.length > 0) {
              <div class="border-t pt-3" style="border-color: var(--border-glass);">
                <p class="text-xs font-semibold mb-2" style="color: var(--text-muted);">Tripulación</p>
                <ul class="flex flex-col gap-1">
                  @for (m of turnoActivo()!.tripulacion!; track m.id) {
                    <li class="text-sm flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: var(--accent-cyan);"></span>
                      <span style="color: var(--text-primary);">{{ m.nombre ?? 'Prof. ' + m.profesionalId }}</span>
                      <span class="text-xs" style="color: var(--text-muted);">{{ m.rol }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        } @else {
          <emx-empty-state message="Sin turno activo en esta unidad" />
        }
      }

      <!-- TAB: Programar turno -->
      @if (activeTab() === 'programar') {
        <form [formGroup]="turnoForm" (ngSubmit)="crearTurno()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Inicio *
            </label>
            <input
              type="datetime-local"
              formControlName="fechaInicio"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Fin *
            </label>
            <input
              type="datetime-local"
              formControlName="fechaFin"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Tipo de turno *
            </label>
            <select
              formControlName="tipo"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            >
              <option value="Matutino">Matutino</option>
              <option value="Nocturno">Nocturno</option>
              <option value="Partido">Partido</option>
            </select>
          </div>
          @if (turnoError()) {
            <p class="text-xs" style="color: var(--accent-red);">{{ turnoError() }}</p>
          }
          @if (turnoOk()) {
            <p class="text-xs" style="color: var(--accent-emerald);">Turno creado correctamente.</p>
          }
          <button
            type="submit"
            class="btn btn--primary btn--sm self-start"
            [disabled]="turnoForm.invalid || savingTurno()"
          >{{ savingTurno() ? 'Guardando…' : 'Crear turno' }}</button>
        </form>
      }

      <!-- TAB: Tripulación -->
      @if (activeTab() === 'tripulacion') {
        @if (loadingTurnos()) {
          <emx-loading-state />
        } @else {
          <div class="flex flex-col gap-4">
            <!-- Select turno -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
                Turno
              </label>
              <select
                class="rounded px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                (change)="onSelectTurno($event)"
              >
                <option value="">Seleccioná un turno</option>
                @for (t of turnos(); track t.id) {
                  <option [value]="t.id">#{{ t.id }} · {{ t.tipo }} · {{ formatDate(t.fechaInicio) }}</option>
                }
              </select>
            </div>

            <!-- Crew list -->
            @if (selectedTurno()) {
              @if ((selectedTurno()!.tripulacion ?? []).length === 0) {
                <emx-empty-state message="Sin tripulación en este turno" />
              } @else {
                <ul class="flex flex-col gap-2">
                  @for (m of selectedTurno()!.tripulacion!; track m.id) {
                    <li class="flex items-center gap-2 text-sm px-3 py-2 rounded"
                      style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
                      <span class="flex-1" style="color: var(--text-primary);">
                        {{ m.nombre ?? 'Prof. ' + m.profesionalId }}
                      </span>
                      <span class="text-xs" style="color: var(--text-muted);">{{ m.rol }}</span>
                    </li>
                  }
                </ul>
              }

              <!-- Add crew sub-form -->
              <div class="border-t pt-4" style="border-color: var(--border-glass);">
                <p class="text-xs font-semibold mb-2" style="color: var(--text-muted);">Agregar tripulante</p>
                <form [formGroup]="crewForm" (ngSubmit)="agregarTripulante()" class="flex gap-2">
                  <input
                    type="number"
                    formControlName="profesionalId"
                    placeholder="ID profesional"
                    class="rounded px-2 py-1.5 text-sm flex-1"
                    style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                  />
                  <input
                    type="text"
                    formControlName="rol"
                    placeholder="Rol (Médico, Enfermero...)"
                    class="rounded px-2 py-1.5 text-sm flex-1"
                    style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                  />
                  <button
                    type="submit"
                    class="btn btn--primary btn--sm"
                    [disabled]="crewForm.invalid || addingCrew()"
                  >{{ addingCrew() ? '…' : 'Agregar' }}</button>
                </form>
                @if (crewError()) {
                  <p class="text-xs mt-1" style="color: var(--accent-red);">{{ crewError() }}</p>
                }
              </div>
            }
          </div>
        }
      }

      <!-- TAB: Calendario -->
      @if (activeTab() === 'calendario') {
        @if (loadingLogs()) {
          <emx-loading-state />
        } @else if (!loadingLogs() && logsTurnos().length === 0) {
          <emx-empty-state message="Sin historial de turnos registrado para esta unidad" />
        }
        <div class="flex flex-col gap-4" [style.display]="logsTurnos().length === 0 && !loadingLogs() ? 'none' : 'flex'">
          <!-- Month navigation -->
          <div class="flex items-center justify-between">
            <button type="button" class="btn btn--ghost btn--sm" (click)="prevMonth()">‹</button>
            <div class="text-center">
              <div class="font-semibold" style="color:var(--text-primary);">{{ calMonthLabel() }}</div>
              <div class="eyebrow">Disponibilidad · Unidad {{ unit().identificador }}</div>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" (click)="nextMonth()">›</button>
          </div>

          <!-- Day-of-week headers -->
          <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:3px;">
            @for (d of ['L','M','M','J','V','S','D']; track $index) {
              <div class="eyebrow" style="text-align:center; padding:4px 0;">{{ d }}</div>
            }
          </div>

          <!-- Calendar cells -->
          <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:3px;">
            @for (day of calCells(); track $index; let i = $index) {
              @if (day === null) {
                <div style="min-height:52px; border-radius:6px; border:1px solid transparent;"></div>
              } @else {
                <div
                  style="min-height:52px; border-radius:6px; border:1px solid; padding:4px 5px; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; position:relative;"
                  [style.background]="cellStyle(dayOfWeekForCell(i)).bg"
                  [style.border-color]="isToday(day) ? 'var(--accent-blue)' : cellStyle(dayOfWeekForCell(i)).border"
                  [style.box-shadow]="isToday(day) ? '0 0 0 1px var(--accent-blue)' : 'none'"
                >
                  <span
                    class="font-mono"
                    style="font-size:11px; font-weight:500; line-height:1;"
                    [style.color]="isToday(day) ? 'var(--accent-blue)' : 'var(--text-secondary)'"
                  >{{ day }}</span>
                  @if (cellStyle(dayOfWeekForCell(i)).tag === 'OFF') {
                    <span class="font-mono" style="font-size:8px; letter-spacing:0.1em; color:var(--text-muted); align-self:flex-end;">OFF</span>
                  } @else {
                    <span
                      class="font-mono"
                      style="font-size:8px; letter-spacing:0.08em; color:white; padding:2px 5px; border-radius:3px; align-self:flex-end;"
                      [style.background]="cellStyle(dayOfWeekForCell(i)).tagBg"
                    >{{ cellStyle(dayOfWeekForCell(i)).tag }}</span>
                  }
                </div>
              }
            }
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 flex-wrap" style="padding-top:8px; border-top:1px solid var(--border-glass);">
            @for (item of calLegend; track item.tag) {
              <div class="flex items-center gap-1.5">
                @if (item.tagBg) {
                  <span class="font-mono" style="font-size:8px; padding:2px 5px; border-radius:3px; color:white;"
                    [style.background]="item.tagBg">{{ item.tag }}</span>
                } @else {
                  <span class="font-mono" style="font-size:8px; color:var(--text-muted);">{{ item.tag }}</span>
                }
                <span style="font-size:11px; color:var(--text-secondary);">{{ item.label }}</span>
              </div>
            }
          </div>
        </div>
      }

      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cerrar</button>
      </div>
    </emx-modal-shell>
  `,
})
export class UnitScheduleModalComponent implements OnInit {
  unit = input.required<UnidadMovilDTO>();
  closed = output<void>();

  private fleetApi = inject(FleetApiService);
  private fb = inject(FormBuilder);

  readonly activeTab = signal<TabId>('activo');
  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'activo', label: 'Turno activo' },
    { id: 'programar', label: 'Programar turno' },
    { id: 'tripulacion', label: 'Tripulación' },
    { id: 'calendario', label: 'Calendario' },
  ];

  // Turno activo tab
  readonly loadingTurno = signal(false);
  readonly turnoActivo = signal<TurnoMovilDTO | null>(null);

  // Programar turno tab
  readonly savingTurno = signal(false);
  readonly turnoError = signal<string | null>(null);
  readonly turnoOk = signal(false);

  // Tripulacion tab
  readonly loadingTurnos = signal(false);
  readonly turnos = signal<TurnoMovilDTO[]>([]);
  readonly selectedTurno = signal<TurnoMovilDTO | null>(null);
  readonly addingCrew = signal(false);
  readonly crewError = signal<string | null>(null);

  // Calendario tab
  readonly loadingLogs = signal(false);
  readonly logsTurnos = signal<LogTurnoDTO[]>([]);
  readonly calMonth = signal(new Date());

  readonly calCells = computed((): (number | null)[] => {
    const m = this.calMonth();
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const startDay = (first.getDay() + 6) % 7; // Monday-first, 0=Mon
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  });

  readonly calMonthLabel = computed(() => {
    const m = this.calMonth();
    const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${names[m.getMonth()]} ${m.getFullYear()}`;
  });

  readonly calLegend = [
    { tag: 'MAT', tagBg: 'var(--accent-blue)',    label: 'Matutino · 06:00–18:00' },
    { tag: 'NOC', tagBg: 'var(--accent-cyan)',    label: 'Nocturno · 18:00–06:00' },
    { tag: 'PAR', tagBg: 'var(--accent-emerald)', label: 'Partido · 08:00–20:00' },
    { tag: 'OFF', tagBg: '',                       label: 'Sin turno' },
  ];

  turnoForm = this.fb.group({
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    tipo: ['Matutino', Validators.required],
  });

  crewForm = this.fb.group({
    profesionalId: [null as number | null, Validators.required],
    rol: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadTurnoActivo();
  }

  setTab(id: TabId): void {
    this.activeTab.set(id);
    if (id === 'tripulacion' && this.turnos().length === 0) {
      this.loadTurnos();
    }
    if (id === 'calendario' && this.logsTurnos().length === 0 && !this.loadingLogs()) {
      this.loadLogsTurnos();
    }
  }

  loadLogsTurnos(): void {
    this.loadingLogs.set(true);
    this.fleetApi
      .getLogsTurnos(this.unit().id)
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        this.logsTurnos.set(data);
        this.loadingLogs.set(false);
      });
  }

  loadTurnoActivo(): void {
    this.loadingTurno.set(true);
    this.fleetApi
      .turnoActivo(this.unit().id)
      .pipe(catchError(() => of(null)))
      .subscribe((t) => {
        this.turnoActivo.set(t);
        this.loadingTurno.set(false);
      });
  }

  loadTurnos(): void {
    this.loadingTurnos.set(true);
    this.fleetApi
      .turnos(this.unit().id)
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        this.turnos.set(data);
        this.loadingTurnos.set(false);
      });
  }

  crearTurno(): void {
    if (this.turnoForm.invalid) {
      this.turnoForm.markAllAsTouched();
      return;
    }
    this.savingTurno.set(true);
    this.turnoError.set(null);
    this.turnoOk.set(false);
    const val = this.turnoForm.value;
    const req: TurnoMovilDTO = {
      ambulanciaId: this.unit().id,
      fechaInicio: new Date(val.fechaInicio!).toISOString(),
      fechaFin:    new Date(val.fechaFin!).toISOString(),
      estado:      'PROGRAMADO',
      tipo:        val.tipo!,
    };
    this.fleetApi.crearTurno(req).subscribe({
      next: () => {
        this.savingTurno.set(false);
        this.turnoOk.set(true);
        this.turnoForm.reset({ tipo: 'Matutino' });
        this.loadTurnoActivo();
      },
      error: () => {
        this.savingTurno.set(false);
        this.turnoError.set('Error al crear el turno. Verificá las fechas.');
      },
    });
  }

  onSelectTurno(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    const turno = this.turnos().find((t) => t.id === id) ?? null;
    this.selectedTurno.set(turno);
    this.crewError.set(null);
  }

  agregarTripulante(): void {
    if (this.crewForm.invalid) {
      this.crewForm.markAllAsTouched();
      return;
    }
    const turno = this.selectedTurno();
    if (!turno?.id) return;
    this.addingCrew.set(true);
    this.crewError.set(null);
    const val = this.crewForm.value;
    const req: TripulacionMovilDTO = {
      profesionalId: val.profesionalId!,
      rol: val.rol ?? undefined,
    };
    this.fleetApi.agregarTripulacion(turno.id, req).subscribe({
      next: (m) => {
        this.addingCrew.set(false);
        this.crewForm.reset();
        // Append to current turno crew list
        this.selectedTurno.update((t) =>
          t ? { ...t, tripulacion: [...(t.tripulacion ?? []), m] } : t,
        );
      },
      error: () => {
        this.addingCrew.set(false);
        this.crewError.set('Error al agregar el tripulante.');
      },
    });
  }

  prevMonth(): void {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  cellShiftKind(dayOfWeek: number): 'MAT' | 'NOC' | 'PAR' | 'OFF' {
    if (dayOfWeek >= 5) return 'OFF';
    const tipo = this.unit().tipo ?? 'ALS';
    if (tipo === 'ALS') return dayOfWeek % 3 === 0 ? 'NOC' : 'MAT';
    return dayOfWeek % 2 === 0 ? 'PAR' : 'MAT';
  }

  cellStyle(dayOfWeek: number): { bg: string; border: string; tag: string; tagBg: string } {
    const kind = this.cellShiftKind(dayOfWeek);
    switch (kind) {
      case 'MAT': return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', tag: 'MAT', tagBg: 'var(--accent-blue)' };
      case 'NOC': return { bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.35)', tag: 'NOC', tagBg: 'var(--accent-cyan)' };
      case 'PAR': return { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', tag: 'PAR', tagBg: 'var(--accent-emerald)' };
      case 'OFF': return { bg: 'rgba(148,163,184,0.04)', border: 'var(--border-hairline)', tag: 'OFF', tagBg: '' };
    }
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const today = new Date();
    const m = this.calMonth();
    return day === today.getDate() && m.getMonth() === today.getMonth() && m.getFullYear() === today.getFullYear();
  }

  dayOfWeekForCell(cellIndex: number): number {
    return cellIndex % 7; // 0=Mon, 6=Sun
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
