import { Component, inject, input, output, signal, OnInit, DestroyRef, computed, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { CambiarMovilRequestDTO, MotivoCambioMovil, UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { FleetApiService } from '../../../../data-access/api/fleet.api';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../loading-state/loading-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface MotivoOption {
  value: MotivoCambioMovil;
  label: string;
}

const MOTIVOS: MotivoOption[] = [
  { value: 'FALTA_INSUMOS', label: 'Falta de insumos' },
  { value: 'FALLA_MECANICA', label: 'Falla mecánica' },
  { value: 'MEJOR_EQUIPAMIENTO', label: 'Necesidad de mejor equipamiento' },
  { value: 'REASIGNACION_OPERATIVA', label: 'Reasignación operativa' },
  { value: 'PRIORIDAD_SUPERIOR', label: 'Otra emergencia de mayor prioridad' },
  { value: 'OTRO', label: 'Otro (especificar observación)' },
];

@Component({
  selector: 'emx-change-unit-modal',
  standalone: true,
  imports: [ModalShellComponent, LoadingStateComponent, EmptyStateComponent],
  template: `
    <emx-modal-shell title="Cambiar unidad" (closed)="closed.emit()">
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

      <div class="mb-3 px-3 py-2 rounded" style="border: 1px solid var(--border-glass); background: var(--surface-glass);">
        <p class="eyebrow text-[10px]">Unidad actual</p>
        <p class="font-mono font-semibold text-sm" style="color: var(--text-primary);">
          {{ emergency().unidadAsignada ?? ('AMB-' + emergency().ambulanciaId) }}
        </p>
      </div>

      @if (requiereAdvertenciaEstado()) {
        <div role="alert" class="mb-3 px-2 py-1.5 rounded border flex items-start gap-1.5" style="border-color: rgba(245, 158, 11, 0.4); background: var(--accent-amber-dim); color: var(--warning-text);">
          <span aria-hidden="true">⚠️</span>
          <span class="text-xs leading-snug">
            Esta emergencia ya está <strong>{{ emergency().estado }}</strong>. El cambio conserva el estado actual;
            verificá que la tripulación nueva pueda alcanzar a la anterior sin demoras.
          </span>
        </div>
      }

      @if (loadingUnits()) {
        <emx-loading-state />
      } @else if (availableUnits().length === 0) {
        <emx-empty-state message="Sin otras unidades disponibles" />
      } @else {
        <p class="eyebrow text-[10px] mb-1.5">Nueva unidad</p>
        <ul role="radiogroup" aria-label="Unidades móviles disponibles para el cambio" class="flex flex-col gap-2 mb-3">
          @for (u of availableUnits(); track u.id) {
            <li>
              <label
                class="flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[var(--accent-cyan)] focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none"
                style="border: 1px solid var(--border-glass); background: var(--surface-glass);"
                [style.border-color]="selectedUnitId() === u.id ? 'var(--accent-cyan)' : 'var(--border-glass)'"
              >
                <input type="radio" name="changeUnitTarget" [value]="u.id" class="sr-only"
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
              </label>
            </li>
          }
        </ul>
      }

      <label class="block mb-3">
        <span class="eyebrow text-[10px]">Motivo del cambio *</span>
        <select
          class="w-full mt-1 px-2 py-1.5 rounded text-sm"
          style="border: 1px solid var(--border-glass); background: var(--surface-glass); color: var(--text-primary);"
          [value]="motivo() ?? ''"
          (change)="onMotivoChange($event)"
        >
          <option value="" disabled>Seleccioná un motivo…</option>
          @for (m of motivos; track m.value) {
            <option [value]="m.value">{{ m.label }}</option>
          }
        </select>
      </label>

      <label class="block mb-1">
        <span class="eyebrow text-[10px]">Observación *</span>
        <textarea
          rows="2"
          class="w-full mt-1 px-2 py-1.5 rounded text-sm"
          style="border: 1px solid var(--border-glass); background: var(--surface-glass); color: var(--text-primary);"
          [value]="observacion()"
          (input)="observacion.set($any($event.target).value); errorMessage.set(null)"
          placeholder="Explicá por qué se cambia la unidad…"
        ></textarea>
      </label>

      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" aria-label="Cancelar cambio de unidad" (click)="closed.emit()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="!puedeConfirmar() || cambiando()"
          aria-label="Confirmar cambio de unidad"
          (click)="confirmarCambio()"
        >{{ cambiando() ? 'Cambiando…' : 'Confirmar cambio' }}</button>
      </div>
    </emx-modal-shell>
  `,
})
export class ChangeUnitModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  emergency = input.required<TicketAsistenciaDTO>();

  changed = output<void>();
  closed = output<void>();

  private fleetApi = inject(FleetApiService);

  readonly motivos = MOTIVOS;

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closed.emit();
  }

  readonly availableUnits = signal<UnidadMovilDTO[]>([]);
  readonly selectedUnitId = signal<number | null>(null);
  readonly motivo = signal<MotivoCambioMovil | null>(null);
  readonly observacion = signal('');
  readonly loadingUnits = signal(false);
  readonly cambiando = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly requiereAdvertenciaEstado = computed(() => {
    const estado = this.emergency().estado;
    return estado === 'DESPACHADO' || estado === 'EN_CAMINO' || estado === 'EN_SITIO';
  });

  readonly puedeConfirmar = computed(() => {
    if (!this.selectedUnitId() || !this.motivo()) return false;
    if (!this.observacion().trim()) return false;
    return true;
  });

  onMotivoChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.motivo.set((raw || null) as MotivoCambioMovil | null);
    this.errorMessage.set(null);
  }

  ngOnInit(): void {
    this.loadingUnits.set(true);
    this.fleetApi.ambulanciasDisponibles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        const actualId = this.emergency().ambulanciaId;
        this.availableUnits.set(data.filter((u) => u.id !== actualId));
        this.loadingUnits.set(false);
      },
      error: () => {
        this.availableUnits.set([]);
        this.loadingUnits.set(false);
      },
    });
  }

  confirmarCambio(): void {
    const unitId = this.selectedUnitId();
    const motivo = this.motivo();
    const observacion = this.observacion().trim();
    if (!unitId || !motivo || !observacion) return;

    this.cambiando.set(true);
    this.errorMessage.set(null);

    const req: CambiarMovilRequestDTO = {
      nuevaAmbulanciaId: unitId,
      motivoCambio: motivo,
      observacion,
      ticketVersion: this.emergency().version ?? 0,
      usarTripulacionActiva: true,
    };

    this.fleetApi.cambiarMovil(this.emergency().id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.cambiando.set(false);
        this.changed.emit();
      },
      error: (err) => {
        this.cambiando.set(false);
        this.errorMessage.set(this.mapError(err));
      },
    });
  }

  private mapError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Error inesperado al cambiar la unidad.';
    }
    if (err.status === 409) {
      return 'La emergencia fue modificada por otro operador mientras tanto. Cerrá este modal y volvé a intentar con los datos actualizados.';
    }
    const key = err.error?.errorKey || err.error?.message;
    switch (key) {
      case 'ambulanciaNoDisponible':
      case 'error.ambulanciaNoDisponible':
        return 'La unidad seleccionada ya no está disponible.';
      case 'ambulanciaOcupadaActiva':
      case 'error.ambulanciaOcupadaActiva':
        return 'La unidad seleccionada ya está asociada a otro ticket activo.';
      case 'mismaAmbulancia':
      case 'error.mismaAmbulancia':
        return 'Esa unidad ya está asignada a este ticket.';
      case 'sinMovilAsignado':
      case 'error.sinMovilAsignado':
        return 'Este ticket todavía no tiene unidad asignada.';
      case 'ticketFinalizado':
      case 'error.ticketFinalizado':
        return 'No se puede cambiar la unidad de un ticket finalizado.';
      case 'observacionRequerida':
      case 'error.observacionRequerida':
        return 'Debés indicar una observación con el motivo del cambio.';
      default:
        return err.error?.message || err.message || 'Error al cambiar la unidad.';
    }
  }
}
