import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsistenciaHistorialApiService } from '../../data-access/api/asistencia-historial.api';
import { AsistenciaDashboardHistorialResponse } from '../../data-access/dto/asistencia-historial.dto';
import { DateUtils } from '../../core/utils/date.utils';

@Component({
  selector: 'app-asistencias-historial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="h-full overflow-auto p-4 md:p-6">
      <section class="rounded-xl p-4 mb-4" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <h1 class="text-lg font-semibold" style="color: var(--text-primary);">Historial de asistencias</h1>
            <p class="text-xs font-mono" style="color: var(--text-muted);">ANÁLISIS OPERATIVO CONSOLIDADO</p>
          </div>
        </div>

        <form [formGroup]="filtersForm" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input formControlName="from" type="date" class="input" />
          <input formControlName="to" type="date" class="input" />
          <select formControlName="estado" class="input">
            <option value="">Estado</option>
            <option value="RECIBIDO">Pendiente</option>
            <option value="DESPACHADO">Despachado</option>
            <option value="EN_CAMINO">En camino</option>
            <option value="EN_SITIO">En sitio</option>
            <option value="COMPLETADO">Finalizado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <select formControlName="prioridad" class="input">
            <option value="">Prioridad</option>
            <option value="ROJO">Crítica</option>
            <option value="AMARILLO">Urgente</option>
            <option value="VERDE">Normal</option>
          </select>
          <input formControlName="pacienteQuery" placeholder="Paciente o DNI" class="input" />
          <input formControlName="zona" placeholder="Zona/localidad" class="input" />
        </form>
        <div class="mt-3 flex gap-2">
          <button class="btn-primary" (click)="applyFilters()">Aplicar filtros</button>
          <button class="btn-secondary" (click)="clearFilters()">Limpiar</button>
        </div>
      </section>

      @if (loading()) {
        <section class="rounded-xl p-6 text-sm" style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-muted);">
          Cargando dashboard de asistencias...
        </section>
      } @else if (error()) {
        <section class="rounded-xl p-6 text-sm" style="background: color-mix(in srgb, var(--accent-red) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent-red) 35%, var(--border-glass)); color: var(--text-primary);">
          {{ error() }}
        </section>
      } @else if (data()) {
        <section class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
          @for (card of kpiCards(); track card.label) {
            <article class="rounded-xl p-3" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
              <p class="text-[10px] font-mono uppercase tracking-widest" style="color: var(--text-muted);">{{ card.label }}</p>
              <p class="text-2xl font-semibold mt-1" [style.color]="card.color">{{ card.value }}</p>
            </article>
          }
        </section>

        <section class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <article class="rounded-xl p-4 xl:col-span-2" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">Asistencias por día</h2>
            <div class="space-y-2">
              @for (item of data()!.serieAsistencias; track item.fecha) {
                <div class="flex items-center gap-3 text-xs">
                  <span class="w-24 font-mono" style="color: var(--text-muted);">{{ item.fecha }}</span>
                  <div class="h-2 rounded-full flex-1" style="background: color-mix(in srgb, var(--text-muted) 15%, transparent);">
                    <div class="h-2 rounded-full" style="background: var(--accent-cyan);" [style.width.%]="barPct(item.total)"></div>
                  </div>
                  <span class="w-8 text-right font-mono" style="color: var(--text-primary);">{{ item.total }}</span>
                </div>
              }
            </div>
          </article>

          <article class="rounded-xl p-4" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">Ranking móviles</h2>
            <div class="space-y-2 text-xs">
              @for (row of data()!.rankingMoviles; track row.movil) {
                <div class="flex justify-between items-center">
                  <span class="font-mono" style="color: var(--text-primary);">{{ row.movil }}</span>
                  <span style="color: var(--accent-cyan);">{{ row.totalAsistencias }}</span>
                </div>
              } @empty {
                <p style="color: var(--text-muted);">Sin datos</p>
              }
            </div>
          </article>
        </section>

        <section class="rounded-xl p-4" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Historial</h2>
            <p class="text-xs font-mono" style="color: var(--text-muted);">
              {{ data()!.historial.totalElements }} asistencias
            </p>
          </div>
          <div class="overflow-auto">
            <table class="w-full text-xs min-w-[980px]">
              <thead>
                <tr style="color: var(--text-muted);">
                  <th class="th">Fecha</th><th class="th">Ticket</th><th class="th">Paciente</th><th class="th">Antecedentes</th><th class="th">Tipo</th>
                  <th class="th">Prioridad</th><th class="th">Estado</th><th class="th">Móvil</th><th class="th">Resp.</th>
                  <th class="th">Cierre</th><th class="th">Zona</th>
                </tr>
              </thead>
              <tbody>
                @for (item of data()!.historial.items; track item.id) {
                  <tr class="border-t hover:bg-[var(--surface-glass)] cursor-pointer" style="border-color: var(--border-glass); color: var(--text-primary);"
                      (click)="verDetalle(item.id)">
                    <td class="td">{{ item.fechaHora | date:'dd/MM HH:mm' }}</td>
                    <td class="td font-mono font-medium">{{ item.numeroTicket }}</td>
                    <td class="td">{{ item.paciente || '—' }}</td>
                    <td class="td">{{ item.antecedentes || '—' }}</td>
                    <td class="td">{{ item.tipoAsistencia }}</td>
                    <td class="td">{{ item.prioridad }}</td>
                    <td class="td">{{ item.estado }}</td>
                    <td class="td">{{ item.movil || '—' }}</td>
                    <td class="td">{{ item.tiempoRespuestaMin ?? '—' }} min</td>
                    <td class="td">{{ item.tiempoCierreMin ?? '—' }} min</td>
                    <td class="td">{{ item.zona || '—' }}</td>
                  </tr>
                } @empty {
                  <tr><td class="py-8 text-center" colspan="11" style="color: var(--text-muted);">No hay asistencias para este filtro.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <button class="btn-secondary" [disabled]="!canPrev()" (click)="changePage(-1)">Anterior</button>
            <button class="btn-secondary" [disabled]="!canNext()" (click)="changePage(1)">Siguiente</button>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .input {
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: var(--bg-elevated);
      color: var(--text-primary);
      padding: 0.55rem 0.7rem;
      font-size: 0.78rem;
    }
    .btn-primary {
      border-radius: 10px;
      padding: 0.45rem 0.9rem;
      font-size: 0.78rem;
      color: #fff;
      background: var(--accent-blue);
      border: 1px solid color-mix(in srgb, var(--accent-blue) 75%, transparent);
    }
    .btn-secondary {
      border-radius: 10px;
      padding: 0.45rem 0.9rem;
      font-size: 0.78rem;
      color: var(--text-primary);
      background: var(--bg-elevated);
      border: 1px solid var(--border-glass);
    }
    .th {
      text-align: left;
      font-weight: 600;
      padding: 0.6rem 0.45rem;
    }
    .td {
      padding: 0.65rem 0.45rem;
    }
  `],
})
export class AsistenciasHistorialComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AsistenciaHistorialApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<AsistenciaDashboardHistorialResponse | null>(null);
  readonly page = signal(0);
  readonly size = 20;

  readonly filtersForm = this.fb.group({
    from: [this.defaultFrom()],
    to: [this.defaultTo()],
    estado: [''],
    prioridad: [''],
    pacienteQuery: [''],
    zona: [''],
  });

  readonly kpiCards = computed(() => {
    const k = this.data()?.kpis;
    if (!k) return [];
    return [
      { label: 'Total', value: k.totalAsistencias, color: 'var(--text-primary)' },
      { label: 'Hoy', value: k.asistenciasHoy, color: 'var(--accent-cyan)' },
      { label: 'Mes', value: k.asistenciasMes, color: 'var(--accent-emerald)' },
      { label: 'En curso', value: k.asistenciasEnCurso, color: 'var(--accent-amber)' },
      { label: 'Críticas', value: k.asistenciasCriticas, color: 'var(--accent-red)' },
      { label: 'Resp. prom.', value: `${k.tiempoPromedioRespuestaMin}m`, color: 'var(--text-primary)' },
      { label: 'Cierre prom.', value: `${k.tiempoPromedioCierreMin}m`, color: 'var(--text-primary)' },
      { label: 'Reincidencias', value: k.reincidenciasPacientes, color: 'var(--text-primary)' },
    ];
  });

  constructor() {
    this.load();
  }

  verDetalle(id: number): void {
    this.router.navigate(['/dashboard/emergency', id]);
  }

  applyFilters(): void {
    this.page.set(0);
    this.load();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      from: this.defaultFrom(),
      to: this.defaultTo(),
      estado: '',
      prioridad: '',
      pacienteQuery: '',
      zona: '',
    });
    this.page.set(0);
    this.load();
  }

  changePage(delta: number): void {
    this.page.update((p) => Math.max(0, p + delta));
    this.load();
  }

  canPrev(): boolean {
    return this.page() > 0;
  }

  canNext(): boolean {
    const historial = this.data()?.historial;
    return historial ? historial.page < historial.totalPages - 1 : false;
  }

  barPct(value: number): number {
    const max = Math.max(...(this.data()?.serieAsistencias.map((s) => s.total) ?? [1]));
    return max > 0 ? (value / max) * 100 : 0;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    const fv = this.filtersForm.getRawValue();

    this.api
      .getDashboard({
        from: fv.from ?? undefined,
        to: fv.to ?? undefined,
        estado: fv.estado || undefined,
        prioridad: fv.prioridad || undefined,
        pacienteQuery: fv.pacienteQuery || undefined,
        zona: fv.zona || undefined,
        page: this.page(),
        size: this.size,
        sort: 'horaLlamada,desc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No pudimos cargar el historial operativo.');
          this.loading.set(false);
        },
      });
  }

  private defaultFrom(): string {
    return DateUtils.now().minus({ days: 29 }).toFormat('yyyy-MM-dd');
  }

  private defaultTo(): string {
    return DateUtils.todayYmd();
  }
}
