import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { UnidadMovilDTO, TurnoMovilDTO, TripulacionMovilDTO } from '../../../data-access/dto/ambulancia.dto';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type TabId = 'activo' | 'programar' | 'tripulacion';

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
    <emx-modal-shell [title]="'Configurar: ' + unit().identificador" (closed)="closed.emit()">
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
      fechaInicio: val.fechaInicio!,
      fechaFin: val.fechaFin!,
      tipo: val.tipo!,
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
