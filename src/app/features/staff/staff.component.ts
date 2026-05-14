import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { TurnoMovilDTO, TripulacionMovilDTO } from '../../data-access/dto/ambulancia.dto';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';

interface StaffRow {
  id: number;
  nombre: string;
  rol: string;
  turnoId?: number;
  ambulanciaId?: number;
  estado: string;
}

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    GlassCardComponent,
    KpiCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Personal Operativo</h1>
          <p class="text-sm mt-0.5" style="color: var(--text-muted);">Profesionales en turno activo</p>
        </div>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="load()" />
      } @else {
        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-4">
          <emx-kpi-card label="En turno" [value]="staff().length" accentColor="cyan" />
          <emx-kpi-card label="Turnos activos" [value]="turnos().length" accentColor="emerald" />
          <emx-kpi-card label="Ambulancias cubiertas" [value]="ambulanciasCubiertas()" accentColor="blue" />
        </div>

        <!-- Table -->
        <emx-glass-card extraClass="!p-0 overflow-hidden">
          <div class="px-4 pt-4 pb-2 border-b" style="border-color: var(--border-glass);">
            <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
              Tripulación activa
            </h2>
          </div>

          @if (staff().length === 0) {
            <div class="p-4">
              <emx-empty-state message="No hay personal en turno activo" />
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-glass);">
                    <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Nombre</th>
                    <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Rol</th>
                    <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Turno</th>
                    <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Unidad</th>
                    <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of staff(); track row.id) {
                    <tr style="border-bottom: 1px solid var(--border-glass);">
                      <td class="px-4 py-3 font-medium" style="color: var(--text-primary);">
                        {{ row.nombre }}
                      </td>
                      <td class="px-4 py-3 text-xs uppercase" style="color: var(--text-secondary);">{{ row.rol }}</td>
                      <td class="px-4 py-3 font-mono text-xs" style="color: var(--text-muted);">
                        #{{ row.turnoId ?? '—' }}
                      </td>
                      <td class="px-4 py-3 font-mono text-xs" style="color: var(--accent-cyan);">
                        {{ row.ambulanciaId ? 'AMB-' + row.ambulanciaId : '—' }}
                      </td>
                      <td class="px-4 py-3">
                        <span class="badge badge--stable text-xs">{{ row.estado }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </emx-glass-card>
      }
    </div>
  `,
})
export class StaffComponent implements OnInit {
  private fleetApi = inject(FleetApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly turnos = signal<TurnoMovilDTO[]>([]);

  readonly staff = computed<StaffRow[]>(() => {
    const rows: StaffRow[] = [];
    for (const turno of this.turnos()) {
      for (const m of turno.tripulacion ?? []) {
        rows.push({
          id: m.id ?? Math.random(),
          nombre: m.nombre ?? `Profesional ${m.profesionalId}`,
          rol: m.rol ?? '—',
          turnoId: turno.id,
          ambulanciaId: turno.ambulanciaId,
          estado: turno.activo ? 'Activo' : 'Inactivo',
        });
      }
    }
    return rows;
  });

  readonly ambulanciasCubiertas = computed(() => {
    const ids = new Set(this.turnos().map((t) => t.ambulanciaId));
    return ids.size;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.fleetApi
      .turnos()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (data) => {
          this.turnos.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar el personal');
          this.loading.set(false);
        },
      });
  }
}
