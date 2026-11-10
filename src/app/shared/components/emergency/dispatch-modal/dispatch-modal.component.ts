import { Component, inject, input, output, signal, OnInit, DestroyRef, computed, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { AsignarMovilRequestDTO, UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { FleetApiService } from '../../../../data-access/api/fleet.api';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../loading-state/loading-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-dispatch-modal',
  standalone: true,
  imports: [ModalShellComponent, LoadingStateComponent, EmptyStateComponent],
  template: `
    <emx-modal-shell title="Despachar unidad" (closed)="closed.emit()">
      @if (errorMessage()) {
        <div role="alert" aria-live="assertive" class="mb-4 px-3 py-2 rounded border text-xs font-medium flex items-start gap-2" style="border-color: rgba(239, 68, 68, 0.4); background: var(--accent-red-dim); color: var(--error-text);">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div class="flex-1">
            <span class="font-bold">Error:</span> {{ errorMessage() }}
          </div>
        </div>
      }

      @if (loadingUnits()) {
        <emx-loading-state />
      } @else if (availableUnits().length === 0) {
        <emx-empty-state message="Sin unidades disponibles" />
      } @else {
        <ul role="radiogroup" aria-label="Unidades móviles disponibles para despacho" class="flex flex-col gap-2">
          @for (u of availableUnits(); track u.id) {
            <li>
              <label
                class="flex flex-col gap-2 px-3 py-2 rounded cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[var(--accent-cyan)] focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none"
                style="border: 1px solid var(--border-glass); background: var(--surface-glass);"
                [style.border-color]="selectedUnitId() === u.id ? 'var(--accent-cyan)' : 'var(--border-glass)'"
              >
                <div class="flex items-center gap-3">
                  <input type="radio" name="dispatchUnit" [value]="u.id" class="sr-only"
                    [aria-label]="'Ambulancia ' + (u.identificador ?? ('AMB-' + u.id)) + ', tipo ' + u.tipo"
                    (change)="selectedUnitId.set(u.id); errorMessage.set(null)" />
                  <div class="flex-1">
                    <p class="font-mono font-semibold text-sm" style="color: var(--text-primary);">
                      {{ u.identificador ?? 'AMB-' + u.id }}
                    </p>
                    <p class="text-xs" style="color: var(--text-muted);">{{ u.tipo }}</p>
                  </div>
                  @if (selectedUnitId() === u.id) {
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"
                      style="color: var(--accent-cyan);" aria-hidden="true">
                      <path d="M2 7l4 4 6-6"/>
                    </svg>
                  }
                </div>

                @if (selectedUnitId() === u.id) {
                  <div class="pl-0 pr-1 py-2 rounded-panel flex flex-col gap-1.5" style="border-top: 1px solid var(--border-hairline);">
                    <p class="eyebrow text-[10px]">Tripulación Activa</p>
                    @if (u.tripulacionActual && u.tripulacionActual.length > 0) {
                      <ul class="flex flex-col gap-1" aria-label="Miembros de la tripulación">
                        @for (member of u.tripulacionActual; track member.id || member.profesionalId) {
                          <li class="flex justify-between items-center text-xs">
                            <span class="font-medium" style="color: var(--text-primary);">{{ member.profesionalNombre || member.nombre }}</span>
                            <span class="badge badge--cyan font-mono text-[9px] px-1.5 py-0.5">{{ member.rol }}</span>
                          </li>
                        }
                      </ul>
                    } @else {
                      <div role="alert" class="px-2 py-1 rounded text-xs flex items-center gap-1.5" style="border: 1px solid rgba(245, 158, 11, 0.4); background: var(--accent-amber-dim); color: var(--warning-text);">
                        <span aria-hidden="true">⚠️</span>
                        <span>No hay tripulación activa cargada para esta unidad.</span>
                      </div>
                    }

                    @if (requiresMedicoWarning()) {
                      <div role="alert" class="mt-1 px-2 py-1.5 rounded border flex items-start gap-1.5" style="border-color: rgba(239, 68, 68, 0.4); background: var(--accent-red-dim); color: var(--error-text);">
                        <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <div class="text-[11px] leading-snug">
                          <span class="font-bold">MÉDICO OBLIGATORIO AUSENTE:</span> Esta asistencia es clasificada como {{ emergency().nivelUrgencia }} y no se ha detectado un Médico en la tripulación.
                        </div>
                      </div>
                    }
                  </div>
                }
              </label>
            </li>
          }
        </ul>
      }

      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" aria-label="Cancelar despacho" (click)="closed.emit()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="!selectedUnitId() || dispatching()"
          aria-label="Confirmar despacho de la unidad"
          (click)="confirmDispatch()"
        >{{ dispatching() ? 'Despachando…' : 'Despachar' }}</button>
      </div>
    </emx-modal-shell>
  `,
})
export class DispatchModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  emergency = input.required<TicketAsistenciaDTO>();

  dispatched = output<void>();
  closed = output<void>();

  private fleetApi = inject(FleetApiService);

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.enter')
  handleEnter(): void {
    if (this.selectedUnitId() && !this.dispatching()) {
      this.confirmDispatch();
    }
  }

  readonly availableUnits = signal<UnidadMovilDTO[]>([]);
  readonly selectedUnitId = signal<number | null>(null);
  readonly loadingUnits = signal(false);
  readonly dispatching = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    if (id === null) return null;
    return this.availableUnits().find(u => u.id === id) || null;
  });

  readonly hasMedico = computed(() => {
    const unit = this.selectedUnit();
    if (!unit || !unit.tripulacionActual) return false;
    return unit.tripulacionActual.some(m => m.rol === 'MEDICO');
  });

  readonly requiresMedicoWarning = computed(() => {
    const urgencia = this.emergency().nivelUrgencia;
    const isCritical = urgencia === 'ROJO' || urgencia === 'AMARILLO';
    return isCritical && !this.hasMedico();
  });

  ngOnInit(): void {
    this.loadingUnits.set(true);
    this.fleetApi.ambulanciasDisponibles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  confirmDispatch(): void {
    const unitId = this.selectedUnitId();
    if (!unitId) return;
    this.dispatching.set(true);
    this.errorMessage.set(null);
    const req: AsignarMovilRequestDTO = { ambulanciaId: unitId, usarTripulacionActiva: true };
    this.fleetApi.asignarMovil(this.emergency().id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.dispatching.set(false);
        this.dispatched.emit();
      },
      error: (err) => {
        this.dispatching.set(false);
        if (err instanceof HttpErrorResponse) {
          const key = err.error?.errorKey || err.error?.message;
          if (key === 'tripulacionSinMedico' || key === 'error.tripulacionSinMedico') {
            this.errorMessage.set('La tripulación activa de la ambulancia no cuenta con un médico asignado.');
          } else if (key === 'ambulanciaOcupadaActiva' || key === 'error.ambulanciaOcupadaActiva') {
            this.errorMessage.set('La ambulancia seleccionada ya tiene un ticket activo asignado.');
          } else if (err.error?.message) {
            this.errorMessage.set(err.error.message);
          } else {
            this.errorMessage.set(err.message || 'Error al despachar la unidad.');
          }
        } else {
          this.errorMessage.set('Error inesperado al despachar la unidad.');
        }
      },
    });
  }
}
