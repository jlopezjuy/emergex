import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  DestroyRef,
  OnInit,
  HostListener,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  TicketAsistenciaDTO,
  DespachoMultiMovilRequest,
} from '../../../data-access/dto/ticket.dto';
import { UnidadMovilDTO } from '../../../data-access/dto/ambulancia.dto';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { EmergencyStore } from '../../../core/stores/emergency.store';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/**
 * Despacho múltiple simultáneo (flujo V2 — VIR + UTIM).
 *
 * <p>Permite seleccionar VARIAS unidades disponibles y despacharlas al ticket en
 * un solo paso, consumiendo {@code POST /api/v2/asistencias/{id}/despacho-multiple}.
 * Es aditivo al despacho singular: no reemplaza al modal de asignación existente.</p>
 *
 * <p>Si el ticket es ROJO/AMARILLO y ninguna de las unidades seleccionadas tiene
 * un médico en su tripulación activa, se muestra la advertencia operativa
 * "MÉDICO OBLIGATORIO AUSENTE" (misma regla que el modal de despacho simple).</p>
 */
@Component({
  selector: 'emx-new-emergency',
  standalone: true,
  imports: [ModalShellComponent, LoadingStateComponent, EmptyStateComponent],
  template: `
    <emx-modal-shell title="Despacho múltiple (VIR + UTIM)" (closed)="closed.emit()">
      <!-- Resumen del ticket que se está despachando -->
      <div
        class="mb-4 px-3 py-2 rounded flex items-center justify-between gap-2"
        style="border: 1px solid var(--border-glass); background: var(--surface-glass);"
      >
        <div class="min-w-0">
          <p class="font-mono text-xs font-semibold" style="color: var(--accent-cyan);">
            {{ emergency().codigo ?? 'E-????' }}
          </p>
          <p class="text-xs truncate" style="color: var(--text-muted);">
            {{ emergency().tipoEmergencia ?? 'Sin tipo' }}
          </p>
        </div>
        <span
          class="badge font-mono text-[9px] px-2 py-0.5 shrink-0"
          [style.background]="priorityTint()"
          [style.color]="priorityColor()"
        >
          {{ emergency().nivelUrgencia ?? 'SIN NIVEL' }}
        </span>
      </div>

      <!-- Error visible del flujo (los errores HTTP se muestran por feedback global) -->
      @if (errorMessage()) {
        <div
          role="alert"
          aria-live="assertive"
          class="mb-4 px-3 py-2 rounded border text-xs font-medium flex items-start gap-2"
          style="border-color: rgba(239, 68, 68, 0.4); background: var(--accent-red-dim); color: var(--error-text);"
        >
          <div class="flex-1"><span class="font-bold">Error:</span> {{ errorMessage() }}</div>
        </div>
      }

      <!-- Advertencia de médico obligatorio para urgencias críticas -->
      @if (requiresMedicoWarning()) {
        <div
          role="alert"
          class="mb-4 px-3 py-1.5 rounded border flex items-start gap-1.5"
          style="border-color: rgba(239, 68, 68, 0.4); background: var(--accent-red-dim); color: var(--error-text);"
        >
          <svg
            class="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div class="text-[11px] leading-snug">
            <span class="font-bold">MÉDICO OBLIGATORIO AUSENTE:</span>
            Esta asistencia es clasificada como {{ emergency().nivelUrgencia }} y ninguna unidad
            seleccionada tiene un Médico en su tripulación.
          </div>
        </div>
      }

      <!-- Lista de unidades disponibles con selección múltiple -->
      @if (loadingUnits()) {
        <emx-loading-state />
      } @else if (availableUnits().length === 0) {
        <emx-empty-state message="Sin unidades disponibles" />
      } @else {
        <ul
          class="flex flex-col gap-2"
          aria-label="Unidades móviles disponibles para despacho múltiple"
        >
          @for (u of availableUnits(); track u.id) {
            <li>
              <label
                class="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[var(--accent-cyan)] focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none"
                style="border: 1px solid var(--border-glass); background: var(--surface-glass);"
                [style.border-color]="
                  selectedIds().includes(u.id) ? 'var(--accent-cyan)' : 'var(--border-glass)'
                "
              >
                <input
                  type="checkbox"
                  [checked]="selectedIds().includes(u.id)"
                  [aria-label]="'Despachar ambulancia ' + (u.identificador ?? 'AMB-' + u.id)"
                  (change)="toggleUnit(u.id)"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-mono font-semibold text-sm" style="color: var(--text-primary);">
                    {{ u.identificador ?? 'AMB-' + u.id }}
                  </p>
                  <p class="text-xs truncate" style="color: var(--text-muted);">
                    {{ u.tipo }}{{ unitHasMedico(u) ? '' : ' · Sin médico' }}
                  </p>
                </div>
                @if (unitHasMedico(u)) {
                  <span class="badge badge--cyan font-mono text-[9px] px-1.5 py-0.5">MEDICO</span>
                } @else {
                  <span
                    class="badge font-mono text-[9px] px-1.5 py-0.5"
                    style="border: 1px solid rgba(245, 158, 11, 0.4); color: var(--warning-text);"
                    >SIN MEDICO</span
                  >
                }
              </label>
            </li>
          }
        </ul>
      }

      <div footer class="flex gap-2 items-center w-full">
        <span class="text-xs flex-1" style="color: var(--text-muted);">
          {{ selectedIds().length }} seleccionada(s)
        </span>
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          aria-label="Cancelar despacho múltiple"
          (click)="closed.emit()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="!canSubmit()"
          aria-label="Confirmar despacho múltiple"
          (click)="submit()"
        >
          {{ submitting() ? 'Despachando…' : 'Despachar múltiple' }}
        </button>
      </div>
    </emx-modal-shell>
  `,
})
export class NewEmergencyComponent implements OnInit {
  /** Ticket en estado RECIBIDO sobre el que se despachan las unidades. */
  emergency = input.required<TicketAsistenciaDTO>();

  /** Notifica que el despacho múltiple finalizó con éxito. */
  dispatched = output<void>();
  /** Notifica el cierre del modal (cancelar o éxito). */
  closed = output<void>();

  private destroyRef = inject(DestroyRef);
  private api = inject(EmergencyApiService);
  private fleetApi = inject(FleetApiService);
  private store = inject(EmergencyStore);
  private feedback = inject(UserFeedbackService);

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closed.emit();
  }

  readonly availableUnits = signal<UnidadMovilDTO[]>([]);
  readonly selectedIds = signal<number[]>([]);
  readonly loadingUnits = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly hasSelection = computed(() => this.selectedIds().length > 0);

  readonly selectedUnits = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.availableUnits().filter((u) => ids.has(u.id));
  });

  /** true si alguna unidad seleccionada tiene un médico en su tripulación activa. */
  readonly anySelectedHasMedico = computed(() =>
    this.selectedUnits().some((u) => u.tripulacionActual?.some((m) => m.rol === 'MEDICO')),
  );

  /** Advertencia operativa: ROJO/AMARILLO exigen médico en las unidades seleccionadas. */
  readonly requiresMedicoWarning = computed(() => {
    const urgencia = this.emergency().nivelUrgencia;
    const isCritical = urgencia === 'ROJO' || urgencia === 'AMARILLO';
    return isCritical && !this.anySelectedHasMedico();
  });

  readonly canSubmit = computed(() => this.hasSelection() && !this.submitting());

  readonly priorityColor = computed(() => {
    switch (this.emergency().nivelUrgencia) {
      case 'ROJO':
        return 'var(--accent-red)';
      case 'AMARILLO':
        return 'var(--accent-amber)';
      case 'VERDE':
        return 'var(--accent-emerald)';
      case 'AZUL':
        return 'var(--accent-blue)';
      default:
        return 'var(--text-muted)';
    }
  });

  readonly priorityTint = computed(() => {
    switch (this.emergency().nivelUrgencia) {
      case 'ROJO':
        return 'rgba(239, 68, 68, 0.12)';
      case 'AMARILLO':
        return 'rgba(245, 158, 11, 0.14)';
      case 'VERDE':
        return 'rgba(16, 185, 129, 0.12)';
      case 'AZUL':
        return 'rgba(59, 130, 246, 0.12)';
      default:
        return 'rgba(100, 116, 139, 0.10)';
    }
  });

  ngOnInit(): void {
    this.loadUnits();
  }

  /** Carga la flota disponible para despacho desde el backend (multi-tenant). */
  private loadUnits(): void {
    this.loadingUnits.set(true);
    this.fleetApi
      .ambulanciasDisponibles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (units) => {
          this.availableUnits.set(units);
          this.loadingUnits.set(false);
        },
        error: () => {
          this.availableUnits.set([]);
          this.loadingUnits.set(false);
        },
      });
  }

  /** Alterna la selección de una unidad manteniendo el resto (multi-select). */
  toggleUnit(id: number): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
    this.errorMessage.set(null);
  }

  /** Indica si la unidad tiene un médico en su tripulación activa. */
  unitHasMedico(unit: UnidadMovilDTO): boolean {
    return unit.tripulacionActual?.some((m) => m.rol === 'MEDICO') ?? false;
  }

  /** Ejecuta el despacho múltiple con la lista completa de ids seleccionados. */
  submit(): void {
    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const req: DespachoMultiMovilRequest = { ambulanciaIds: [...this.selectedIds()] };
    this.api
      .despacharMultiple(this.emergency().id, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          // El store pinta la card actualizada al instante (G1: ya viene completa).
          this.store.addOrUpdate(ticket);
          // La respuesta de POST /despacho-multiple NO incluye historialMoviles, por lo que
          // mapTicket deja ambulancias en [] y el fallback de 0 nunca se activa; la fuente de
          // verdad del conteo es la selección del usuario (selectedIds).
          const despachadas = this.selectedIds().length;
          this.feedback.push({
            type: 'success',
            title: 'Despacho múltiple',
            message: `${despachadas} unidad(es) despachada(s) a ${ticket.codigo ?? 'la emergencia'}.`,
          });
          this.submitting.set(false);
          this.dispatched.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          // El feedbackInterceptor global ya muestra el toast de error HTTP; aquí solo se
          // setea el error inline para casos no HTTP (mismo patrón que dispatch-modal).
          if (!(err instanceof HttpErrorResponse)) {
            this.errorMessage.set('Error inesperado al despachar las unidades.');
          }
        },
      });
  }
}
