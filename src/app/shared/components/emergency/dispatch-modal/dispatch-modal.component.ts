import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { TicketAsistenciaDTO, DespacharRequest } from '../../../../data-access/dto/ticket.dto';
import { UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { FleetApiService } from '../../../../data-access/api/fleet.api';
import { EmergencyApiService } from '../../../../data-access/api/emergency.api';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../loading-state/loading-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';

@Component({
  selector: 'emx-dispatch-modal',
  standalone: true,
  imports: [ModalShellComponent, LoadingStateComponent, EmptyStateComponent],
  template: `
    <emx-modal-shell title="Despachar unidad" (closed)="closed.emit()">
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
                <input type="radio" name="dispatchUnit" [value]="u.id" class="sr-only"
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
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="!selectedUnitId() || dispatching()"
          (click)="confirmDispatch()"
        >{{ dispatching() ? 'Despachando…' : 'Despachar' }}</button>
      </div>
    </emx-modal-shell>
  `,
})
export class DispatchModalComponent implements OnInit {
  emergency = input.required<TicketAsistenciaDTO>();

  dispatched = output<void>();
  closed = output<void>();

  private fleetApi = inject(FleetApiService);
  private emergencyApi = inject(EmergencyApiService);

  readonly availableUnits = signal<UnidadMovilDTO[]>([]);
  readonly selectedUnitId = signal<number | null>(null);
  readonly loadingUnits = signal(false);
  readonly dispatching = signal(false);

  ngOnInit(): void {
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

  confirmDispatch(): void {
    const unitId = this.selectedUnitId();
    if (!unitId) return;
    this.dispatching.set(true);
    const req: DespacharRequest = { ambulanciaId: unitId };
    this.emergencyApi.despachar(this.emergency().id, req).subscribe({
      next: () => {
        this.dispatching.set(false);
        this.dispatched.emit();
      },
      error: () => this.dispatching.set(false),
    });
  }
}
