import { Component, output, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { StaffApiService } from '../../../data-access/api/staff.api';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CrearAmbulanciaRequest, GuardiaDTO, TripulacionGuardiaDTO, ProfesionalDisponibleDTO } from '../../../data-access/dto/ambulancia.dto';
import { DateUtils } from '../../../core/utils/date.utils';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type RolTripulacionUi = 'MEDICO' | 'ENFERMERO' | 'PARAMEDICO' | 'CHOFER';

type TurnoConfigUi = {
  uiId: string;
  label: string;
  horaInicio: string;
  horaFin: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  diasActivos: boolean[];
  tripulacion: TripulacionGuardiaDTO[];
};

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const DIA_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

@Component({
  selector: 'emx-new-unit-wizard-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent, EmptyStateComponent],
  template: `
    <emx-modal-shell [title]="'Alta de Unidad y Tripulación (Paso ' + paso() + ' de 3)'" (closed)="closed.emit()">
      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-6 px-1">
        @for (step of steps; track step.num) {
          <div class="flex items-center flex-1 last:flex-none">
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                [style.background]="paso() === step.num ? 'var(--accent-cyan)' : (paso() > step.num ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.05)')"
                [style.color]="paso() === step.num ? '#020617' : (paso() > step.num ? 'var(--accent-cyan)' : 'var(--text-muted)')"
                [style.border]="paso() === step.num ? 'none' : '1px solid var(--border-glass)'"
              >
                {{ step.num }}
              </div>
              <span
                class="text-xs font-semibold hidden sm:inline"
                [style.color]="paso() === step.num ? 'var(--text-primary)' : 'var(--text-muted)'"
              >
                {{ step.label }}
              </span>
            </div>
            @if (step.num < 3) {
              <div
                class="flex-1 h-[2px] mx-4 rounded transition-all duration-300"
                [style.background]="paso() > step.num ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'"
              ></div>
            }
          </div>
        }
      </div>

      <!-- Paso 1: Datos de la Unidad -->
      @if (paso() === 1) {
        <form [formGroup]="form" class="flex flex-col gap-4">
          <!-- Identificador -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Identificador *
            </label>
            <input
              type="text"
              formControlName="identificador"
              placeholder="AMB-001"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            />
            @if (f['identificador'].invalid && f['identificador'].touched) {
              <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
            }
          </div>

          <!-- Tipo -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Tipo *
            </label>
            <div class="flex gap-3">
              @for (opt of tipos; track opt.value) {
                <label
                  class="flex items-center gap-2 flex-1 px-3 py-2 rounded cursor-pointer"
                  style="border: 1px solid var(--border-glass);"
                  [style.border-color]="form.get('tipo')?.value === opt.value ? 'var(--accent-cyan)' : 'var(--border-glass)'"
                  [style.background]="form.get('tipo')?.value === opt.value ? 'rgba(34,211,238,0.08)' : 'transparent'"
                >
                  <input type="radio" formControlName="tipo" [value]="opt.value" class="sr-only" />
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold" style="color: var(--text-primary);">{{ opt.label }}</span>
                    <span class="text-xs" style="color: var(--text-muted);">{{ opt.desc }}</span>
                  </div>
                </label>
              }
            </div>
          </div>

          <!-- Patente -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Patente
            </label>
            <input
              type="text"
              formControlName="patente"
              placeholder="AB 123 CD"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            />
          </div>

          <!-- Modelo + Año -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
                Modelo
              </label>
              <input
                type="text"
                formControlName="modelo"
                placeholder="Ford Transit"
                class="rounded px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
                Año
              </label>
              <input
                type="number"
                formControlName="anio"
                placeholder="2026"
                min="2000"
                max="2035"
                class="rounded px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
              />
            </div>
          </div>
        </form>
      }

      <!-- Paso 2: Rango Operativo y Turnos -->
      @if (paso() === 2) {
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="eyebrow">TURNOS DE TRABAJO CONFIGURADOS · {{ turnosUi().length }}</div>
            <button type="button" class="btn btn--ghost btn--sm" (click)="crearTurnoRapido()">+ Nuevo turno</button>
          </div>

          @if (turnosUi().length === 0) {
            <emx-empty-state message="Definí al menos un turno para la unidad" />
          }

          <div class="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
            @for (t of turnosUi(); track t.uiId) {
              <div class="us-shift-card p-3 rounded" style="border: 1px solid var(--border-glass); border-left: 3px solid var(--accent-blue); background: rgba(255,255,255,0.02);">
                <div class="us-shift-card__head flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-wrap flex-1">
                    <span class="qc-prio-dot w-2 h-2 rounded-full" style="background: var(--accent-blue)"></span>
                    <input
                      class="qc-input rounded px-2 py-1 text-xs"
                      style="width:130px; background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                      [value]="t.label"
                      (change)="actualizarTurno(t.uiId, 'label', inputValue($event))"
                    />
                    <input
                      type="time"
                      class="qc-input rounded px-2 py-1 text-xs"
                      style="width:110px; background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                      [value]="t.horaInicio"
                      (change)="actualizarTurno(t.uiId, 'horaInicio', inputValue($event))"
                    />
                    <span class="mono text-xs" style="color: var(--text-muted)">→</span>
                    <input
                      type="time"
                      class="qc-input rounded px-2 py-1 text-xs"
                      style="width:110px; background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                      [value]="t.horaFin"
                      (change)="actualizarTurno(t.uiId, 'horaFin', inputValue($event))"
                    />
                    <span class="mono text-xs font-semibold" style="color: var(--accent-blue)">{{ horasTurno(t) }}h</span>
                  </div>
                  <button type="button" class="text-sm hover:text-red-400 p-1" (click)="eliminarTurno(t.uiId)">🗑</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <div class="eyebrow text-xs uppercase tracking-wider" style="color: var(--text-secondary);">Vigencia Desde</div>
                    <input
                      type="date"
                      class="qc-input rounded px-2 py-1 text-xs w-full mt-1"
                      style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                      [value]="t.vigenciaDesde"
                      (change)="actualizarTurno(t.uiId, 'vigenciaDesde', inputValue($event))"
                    />
                  </div>
                  <div>
                    <div class="eyebrow text-xs uppercase tracking-wider" style="color: var(--text-secondary);">Vigencia Hasta (Opcional)</div>
                    <input
                      type="date"
                      class="qc-input rounded px-2 py-1 text-xs w-full mt-1"
                      style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                      [value]="t.vigenciaHasta ?? ''"
                      (change)="actualizarTurno(t.uiId, 'vigenciaHasta', inputValue($event))"
                    />
                  </div>
                </div>

                <div class="mt-3">
                  <div class="eyebrow text-xs uppercase tracking-wider" style="color: var(--text-secondary);">Días Activos</div>
                  <div class="flex gap-1 mt-1 flex-wrap">
                    @for (d of diaLabels; track $index) {
                      <button
                        type="button"
                        class="w-8 h-8 text-xs font-semibold rounded border transition-colors"
                        [style.border-color]="t.diasActivos[$index] ? 'var(--accent-cyan)' : 'var(--border-glass)'"
                        [style.background]="t.diasActivos[$index] ? 'rgba(34,211,238,0.15)' : 'rgba(2,6,23,0.35)'"
                        [style.color]="t.diasActivos[$index] ? 'var(--accent-cyan)' : 'var(--text-secondary)'"
                        (click)="toggleDiaTurno(t.uiId, $index)"
                      >
                        {{ d }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Paso 3: Asignación de Tripulación -->
      @if (paso() === 3) {
        <div class="flex flex-col gap-4">
          @if (turnosUi().length === 0) {
            <emx-empty-state message="Primero definí turnos en el paso anterior" />
          } @else {
            <div class="flex flex-col gap-2">
              <label class="eyebrow">Seleccioná un Turno para Tripular</label>
              <select
                class="qc-input rounded px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                [value]="selectedTurnoId() ?? ''"
                (change)="seleccionarTurno($event)"
              >
                @for (t of turnosUi(); track t.uiId) {
                  <option [value]="t.uiId">{{ t.label }} · ({{ t.horaInicio }}–{{ t.horaFin }})</option>
                }
              </select>
            </div>

            @if (selectedTurno()) {
              <div class="border rounded p-4 flex flex-col gap-4" style="border-color: var(--border-glass); background: rgba(255,255,255,0.01);">
                <div class="flex items-center justify-between">
                  <div class="eyebrow text-xs uppercase tracking-wider" style="color: var(--text-secondary);">
                    Tripulantes del Turno ({{ selectedTurno()!.tripulacion.length }})
                  </div>
                  <button type="button" class="btn btn--ghost btn--sm" (click)="showCrewPicker.update(v => !v)">
                    {{ showCrewPicker() ? 'Ocultar listado' : '+ Agregar tripulante' }}
                  </button>
                </div>

                @if (showCrewPicker()) {
                  <div class="border rounded max-h-[20vh] overflow-y-auto p-2 flex flex-col gap-1" style="border-color: var(--border-glass); background: var(--surface-glass);">
                    @if (profesionalesDisponibles().length === 0) {
                      <div class="text-xs p-2 text-center" style="color: var(--text-muted)">Cargando o sin profesionales disponibles...</div>
                    }
                    @for (p of profesionalesDisponibles(); track p.profesionalId) {
                      <button
                        type="button"
                        class="flex items-center justify-between p-2 rounded text-left hover:bg-[rgba(255,255,255,0.05)] text-xs"
                        (click)="agregarTripulanteSimple(p)"
                      >
                        <span class="font-semibold" style="color: var(--text-primary);">{{ p.profesionalNombre }}</span>
                        <div class="flex items-center gap-2">
                          <span class="px-2 py-0.5 rounded text-[10px]" style="background: rgba(255,255,255,0.08); color: var(--text-secondary);">{{ p.especialidad ?? 'Profesional' }}</span>
                          <span class="font-bold" style="color: var(--accent-cyan)">+</span>
                        </div>
                      </button>
                    }
                  </div>
                }

                @if (selectedTurno()!.tripulacion.length === 0) {
                  <emx-empty-state message="Sin tripulantes agregados para este turno" />
                } @else {
                  <div class="flex flex-col gap-2">
                    @for (m of selectedTurno()!.tripulacion; track m.profesionalId; let i = $index) {
                      <div class="flex items-center gap-3 p-3 rounded" style="border: 1px solid var(--border-glass); background: rgba(255,255,255,0.02);">
                        <div class="flex-1">
                          <div class="text-sm font-semibold" style="color: var(--text-primary);">{{ nombreTripulante(m) }}</div>
                          <div class="text-xs" style="color: var(--text-muted);">{{ m.especialidad ?? 'Profesional' }}</div>
                        </div>

                        <select
                          class="qc-input rounded px-2 py-1 text-xs"
                          style="width: 140px; background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
                          (change)="cambiarRolTripulante(selectedTurno()!.uiId, m.profesionalId!, selectValue($event))"
                        >
                          @for (rol of rolesTripulacion; track rol) {
                            <option [value]="rol" [selected]="rol === (m.rol ?? 'PARAMEDICO')">{{ rol }}</option>
                          }
                        </select>

                        <button
                          type="button"
                          class="text-xs hover:text-red-400 p-1 font-semibold"
                          (click)="quitarTripulante(m.profesionalId)"
                        >
                          ✕
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @if (validationErrors().length > 0) {
              <div class="p-3 rounded border text-xs mt-2" style="border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.08); color: var(--accent-red);">
                <div class="font-bold mb-1">Falta dotación mínima en la agenda:</div>
                <ul class="list-disc pl-4 flex flex-col gap-1">
                  @for (err of validationErrors(); track err) {
                    <li>{{ err }}</li>
                  }
                </ul>
              </div>
            }
          }
        </div>
      }

      @if (errorMsg()) {
        <p class="text-xs mt-4" style="color: var(--accent-red);">{{ errorMsg() }}</p>
      }

      <div footer class="flex justify-between w-full">
        <div>
          @if (paso() > 1) {
            <button type="button" class="btn btn--ghost btn--sm" (click)="retrocederPaso()" [disabled]="saving()">Atrás</button>
          }
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()" [disabled]="saving()">Cancelar</button>
          
          @if (paso() < 3) {
            <button
              type="button"
              class="btn btn--primary btn--sm"
              [disabled]="!isPasoValido()"
              (click)="avanzarPaso()"
            >
              Siguiente
            </button>
          } @else {
            <button
              type="button"
              class="btn btn--primary btn--sm"
              [disabled]="!isPasoValido() || saving()"
              (click)="submit()"
            >
              {{ saving() ? 'Registrando…' : 'Finalizar y Registrar' }}
            </button>
          }
        </div>
      </div>
    </emx-modal-shell>
  `,
})
export class NewUnitWizardModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  created = output<void>();
  closed = output<void>();

  private fleetApi = inject(FleetApiService);
  private staffApi = inject(StaffApiService);
  private fb = inject(FormBuilder);

  readonly paso = signal(1);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly profesionalesDisponibles = signal<ProfesionalDisponibleDTO[]>([]);

  readonly steps = [
    { num: 1, label: 'Datos Unidad' },
    { num: 2, label: 'Configuración Turnos' },
    { num: 3, label: 'Asignar Tripulación' },
  ];

  readonly tipos = [
    { value: 'ALS', label: 'ALS', desc: 'Soporte vital avanzado' },
    { value: 'BLS', label: 'BLS', desc: 'Soporte vital básico' },
  ];

  readonly rolesTripulacion: RolTripulacionUi[] = ['MEDICO', 'ENFERMERO', 'PARAMEDICO', 'CHOFER'];
  readonly diaLabels = DIA_LABELS;

  // Paso 1 Form
  form = this.fb.group({
    identificador: ['', Validators.required],
    tipo: ['ALS', Validators.required],
    patente: [''],
    modelo: [''],
    anio: [null as number | null],
  });

  // Paso 2 & 3 State
  readonly turnosUi = signal<TurnoConfigUi[]>([]);
  readonly selectedTurnoId = signal<string | null>(null);
  readonly selectedTurno = computed(() => this.turnosUi().find((t) => t.uiId === this.selectedTurnoId()) ?? this.turnosUi()[0] ?? null);
  readonly validationErrors = computed(() => this.validarConfiguracion());
  readonly showCrewPicker = signal(false);

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    // Inicializar con un turno por defecto
    const defaultShift = this.nuevoTurno('Matutino', '06:00', '18:00');
    this.turnosUi.set([defaultShift]);
    this.selectedTurnoId.set(defaultShift.uiId);

    // Cargar profesionales disponibles para el Paso 3
    this.loadProfesionales();
  }

  loadProfesionales(): void {
    this.staffApi.getDisponibles().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((list) => {
      this.profesionalesDisponibles.set((list ?? []).map((p) => ({
        profesionalId: p.id,
        profesionalNombre: `${p.apellido}, ${p.nombre}`.replace(/^,\s*/, '').trim(),
        especialidad: p.especialidad ?? null,
      })));
    });
  }

  isPasoValido(): boolean {
    if (this.paso() === 1) {
      return this.form.valid;
    }
    if (this.paso() === 2) {
      // Debe haber al menos un turno definido y con al menos un día activo
      return this.turnosUi().length > 0 && this.turnosUi().some(t => t.diasActivos.some(Boolean));
    }
    if (this.paso() === 3) {
      // Validar localmente dotaciones de todos los turnos activos
      const errores = this.validarConfiguracion();
      return errores.length === 0;
    }
    return false;
  }

  avanzarPaso(): void {
    if (this.isPasoValido() && this.paso() < 3) {
      this.paso.update(p => p + 1);
      this.errorMsg.set(null);
    }
  }

  retrocederPaso(): void {
    if (this.paso() > 1) {
      this.paso.update(p => p - 1);
      this.errorMsg.set(null);
    }
  }

  // Lógica de Turnos
  nuevoTurno(label: string, horaInicio: string, horaFin: string): TurnoConfigUi {
    return {
      uiId: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      horaInicio,
      horaFin,
      vigenciaDesde: DateUtils.todayYmd(),
      vigenciaHasta: undefined,
      diasActivos: [true, true, true, true, true, false, false],
      tripulacion: [],
    };
  }

  crearTurnoRapido(): void {
    const nocturno = this.turnosUi().length % 2 === 1;
    const turno = nocturno ? this.nuevoTurno('Nocturno', '18:00', '06:00') : this.nuevoTurno('Matutino', '06:00', '18:00');
    this.turnosUi.update((list) => [...list, turno]);
    this.selectedTurnoId.set(turno.uiId);
  }

  eliminarTurno(uiId: string): void {
    this.turnosUi.update((list) => list.filter((x) => x.uiId !== uiId));
    if (this.selectedTurnoId() === uiId) {
      this.selectedTurnoId.set(this.turnosUi()[0]?.uiId ?? null);
    }
  }

  actualizarTurno(uiId: string, field: keyof Pick<TurnoConfigUi, 'label' | 'horaInicio' | 'horaFin' | 'vigenciaDesde' | 'vigenciaHasta'>, value: string): void {
    this.turnosUi.update((list) => list.map((t) => t.uiId === uiId ? { ...t, [field]: value || undefined } : t));
  }

  toggleDiaTurno(uiId: string, idx: number): void {
    this.turnosUi.update((list) => list.map((t) => {
      if (t.uiId !== uiId) return t;
      const dias = [...t.diasActivos];
      dias[idx] = !dias[idx];
      return { ...t, diasActivos: dias };
    }));
  }

  horasTurno(t: TurnoConfigUi): number {
    const [ih, im] = t.horaInicio.split(':').map(Number);
    const [fh, fm] = t.horaFin.split(':').map(Number);
    let min = (fh * 60 + fm) - (ih * 60 + im);
    if (min <= 0) min += 1440;
    return Math.round(min / 60);
  }

  // Lógica de Tripulación
  seleccionarTurno(event: Event): void {
    this.selectedTurnoId.set((event.target as HTMLSelectElement).value);
  }

  agregarTripulanteSimple(p: ProfesionalDisponibleDTO): void {
    const turno = this.selectedTurno();
    if (!turno?.uiId || !p.profesionalId) return;
    const trip: TripulacionGuardiaDTO = {
      profesionalId: p.profesionalId,
      profesionalNombre: p.profesionalNombre,
      especialidad: p.especialidad,
      rol: this.inferirRol(p),
      activo: true,
    };
    this.turnosUi.update((list) => list.map((t) => {
      if (t.uiId !== turno.uiId || t.tripulacion.some((m) => m.profesionalId === p.profesionalId)) return t;
      return { ...t, tripulacion: [...t.tripulacion, trip] };
    }));
    this.showCrewPicker.set(false);
  }

  quitarTripulante(profesionalId?: number): void {
    const turno = this.selectedTurno();
    if (!turno?.uiId || !profesionalId) return;
    this.turnosUi.update((list) => list.map((t) => t.uiId === turno.uiId ? { ...t, tripulacion: t.tripulacion.filter((m) => m.profesionalId !== profesionalId) } : t));
  }

  cambiarRolTripulante(uiId: string, profesionalId: number, rol: string): void {
    this.turnosUi.update((list) => list.map((t) => t.uiId === uiId ? {
      ...t,
      tripulacion: t.tripulacion.map((m) => m.profesionalId === profesionalId ? { ...m, rol } : m),
    } : t));
  }

  inferirRol(p: ProfesionalDisponibleDTO): RolTripulacionUi {
    const e = (p.especialidad ?? '').toLowerCase();
    if (e.includes('enfer')) return 'ENFERMERO';
    if (e.includes('med')) return 'MEDICO';
    return 'PARAMEDICO';
  }

  nombreTripulante(m: TripulacionGuardiaDTO): string {
    return m.nombre ?? m.profesionalNombre ?? (m.profesionalId ? `Prof. ${m.profesionalId}` : 'Profesional');
  }

  validarConfiguracion(): string[] {
    const errores: string[] = [];
    const tipo = (this.form.value.tipo ?? 'ALS').toUpperCase();
    for (const t of this.turnosUi()) {
      if (!t.diasActivos.some(Boolean)) continue;
      const roles = t.tripulacion.map((m) => m.rol);
      const tieneChofer = roles.includes('CHOFER');
      const tieneMedico = roles.includes('MEDICO');
      const tieneEnfermeroOParamedico = roles.includes('ENFERMERO') || roles.includes('PARAMEDICO');

      if ((tipo.includes('ALS') || tipo.includes('BLS') || tipo.includes('AMBULANCIA')) && (!tieneChofer || !tieneMedico || !tieneEnfermeroOParamedico)) {
        errores.push(`${t.label}: dotación mínima AMBULANCIA/ALS/BLS = CHOFER + MEDICO + ENFERMERO/PARAMEDICO. Detectados: [${roles.map(r => r || 'null').join(', ')}].`);
      } else if (tipo.includes('TRASLADO') && !tieneChofer) {
        errores.push(`${t.label}: dotación mínima TRASLADO = CHOFER.`);
      } else if (tipo.includes('UTILITARIO') && (!tieneChofer || (!tieneMedico && !tieneEnfermeroOParamedico))) {
        errores.push(`${t.label}: dotación mínima UTILITARIO = CHOFER + MEDICO/PARAMEDICO.`);
      }
    }
    return errores;
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  selectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  submit(): void {
    if (!this.isPasoValido()) {
      const errores = this.validarConfiguracion();
      if (errores.length > 0) {
        this.errorMsg.set(errores[0]);
      }
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const val = this.form.value;
    const reqAmbulancia: CrearAmbulanciaRequest = {
      identificador: val.identificador!,
      tipo: val.tipo as 'ALS' | 'BLS',
      patente: val.patente || undefined,
      modelo: val.modelo || undefined,
      anio: val.anio ?? undefined,
    };

    // Mapear guardias
    const guardias: GuardiaDTO[] = [];
    for (const t of this.turnosUi()) {
      t.diasActivos.forEach((activo, idx) => {
        if (!activo) return;
        guardias.push({
          diaSemana: DIAS[idx],
          horaInicio: t.horaInicio,
          horaFin: t.horaFin,
          estado: 'ACTIVA',
          vigenciaDesde: t.vigenciaDesde,
          vigenciaHasta: t.vigenciaHasta || undefined,
          tripulacion: t.tripulacion.map((m) => ({
            profesionalId: m.profesionalId,
            rol: m.rol,
            activo: true,
          })),
        });
      });
    }

    const payload = {
      ambulancia: reqAmbulancia,
      guardias: guardias,
    };

    this.fleetApi.crearAmbulanciaWizard(payload).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.created.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(
          err?.error?.detail || err?.error?.title || 'Error al registrar la unidad y tripulación. Verificá que no existan patentes o identificadores duplicados, y que los horarios de guardias no se solapen.'
        );
      },
    });
  }
}
