import { Component, input, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import {
  InternacionDomiciliariaDTO,
  VisitaProgramadaDTO,
  EstadoVisita,
  TipoVisita,
} from '../../../../data-access/dto/internacion.dto';

@Component({
  selector: 'emx-visitas-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div>
      <!-- Generate Visits -->
      <div class="rounded-xl p-4 mb-6 flex items-end gap-4 flex-wrap"
        style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Desde</label>
          <input type="date" [formControl]="desdeCtrl"
            class="rounded-lg px-3 py-2 text-sm"
            style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Hasta</label>
          <input type="date" [formControl]="hastaCtrl"
            class="rounded-lg px-3 py-2 text-sm"
            style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Tipo</label>
          <select [formControl]="tipoCtrl"
            class="rounded-lg px-3 py-2 text-sm"
            style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;">
            <option value="CONTROL_GENERAL">Control General</option>
            <option value="MEDICA">Médica</option>
            <option value="ENFERMERIA">Enfermería</option>
            <option value="KINESIOLOGIA">Kinesiología</option>
            <option value="PSICOLOGIA">Psicología</option>
            <option value="NUTRICION">Nutrición</option>
            <option value="TRABAJO_SOCIAL">Trabajo Social</option>
            <option value="CONTROL_EQUIPOS">Control Equipos</option>
            <option value="EMERGENCIA">Emergencia</option>
          </select>
        </div>
        <button (click)="generar()" [disabled]="generating()"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          style="background: var(--accent-emerald); color: #fff">
          @if (generating()) {
            <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          }
          Generar Visitas
        </button>
      </div>

      @if (msg()) {
        <div class="p-3 rounded-lg text-sm mb-4" [style.background]="msgError() ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
          [style.color]="msgError() ? 'var(--accent-red)' : 'var(--accent-emerald)'">
          {{ msg() }}
        </div>
      }

      <!-- Visits grouped by day -->
      @if (visitas().length === 0) {
        <div class="rounded-xl p-8 text-center border border-dashed"
          style="background: var(--surface-glass); border-color: var(--border-glass)">
          <p style="color: var(--text-muted)">No hay visitas programadas</p>
        </div>
      } @else {
        @for (grupo of visitasPorDia(); track grupo.fecha) {
          <div class="mb-6">
            <h3 class="text-sm font-semibold mb-3 px-1" style="color: var(--text-secondary)">
              {{ grupo.fecha | date:'EEEE d MMMM':'':'es' }}
            </h3>
            <div class="space-y-3">
              @for (v of grupo.visitas; track v.id) {
                <div class="rounded-xl p-4 flex items-center justify-between gap-4"
                  style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
                  <div class="flex items-center gap-4">
                    <div class="text-lg font-mono font-medium shrink-0" style="color: var(--text-primary); width: 48px">
                      {{ v.fechaHoraProgramada | date:'HH:mm' }}
                    </div>
                    <div>
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                        [style.background]="visitaTipoColor(v.tipoVisita)"
                        style="color: #fff">{{ v.tipoVisita }}</span>
                      @if (v.profesionalAsignado) {
                        <span class="ml-2 text-sm" style="color: var(--text-primary)">
                          {{ v.profesionalAsignado.apellido }}, {{ v.profesionalAsignado.nombre }}
                        </span>
                      }
                      <div class="text-xs mt-1" style="color: var(--text-muted)">
                        {{ v.direccionVisita }} · {{ v.contactoEnSitio }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                      [style.background]="estadoVisitaColor(v.estado)"
                      style="color: #fff">{{ v.estado }}</span>
                    @if (v.estado === 'PROGRAMADA') {
                      <button (click)="iniciar(v.id!)"
                        class="px-3 py-1.5 rounded text-xs font-medium transition-all"
                        style="background: var(--accent-blue); color: #fff">▶ Iniciar</button>
                    }
                    @if (v.estado === 'EN_CURSO') {
                      <button (click)="finalizar(v.id!)"
                        class="px-3 py-1.5 rounded text-xs font-medium transition-all"
                        style="background: var(--accent-emerald); color: #fff">✓ Finalizar</button>
                    }
                    @if (v.estado === 'PROGRAMADA' || v.estado === 'EN_CURSO') {
                      <button (click)="openReprogramar(v)"
                        class="px-3 py-1.5 rounded text-xs font-medium transition-all"
                        style="background: var(--accent-amber); color: #fff">↻</button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Reprogramar modal inline -->
      @if (reprogramando()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5)">
          <div class="rounded-xl p-6 w-full max-w-md" style="background: var(--bg-elevated); border: 1px solid var(--border-glass)">
            <h3 class="text-base font-semibold mb-4" style="color: var(--text-primary)">Reprogramar Visita</h3>
            <div class="space-y-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Nueva Fecha/Hora</label>
                <input type="datetime-local" [formControl]="reproFechaCtrl"
                  class="rounded-lg px-3 py-2 text-sm w-full"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Motivo</label>
                <input type="text" [formControl]="reproMotivoCtrl" placeholder="Razón de la reprogramación..."
                  class="rounded-lg px-3 py-2 text-sm w-full"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
              </div>
            </div>
            <div class="flex gap-3 justify-end mt-6">
              <button (click)="reprogramando.set(null)" class="px-4 py-2 text-sm rounded-lg"
                style="color: var(--text-secondary); background: transparent">Cancelar</button>
              <button (click)="confirmReprogramar()" [disabled]="!reproFechaCtrl.value"
                class="px-5 py-2 rounded-lg text-sm font-medium" style="background: var(--accent-amber); color: #fff">
                Reprogramar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class VisitasTabComponent {
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  desdeCtrl = this.fb.control(today());
  hastaCtrl = this.fb.control(thirtyDaysLater());
  tipoCtrl = this.fb.control('CONTROL_GENERAL');

  visitas = signal<VisitaProgramadaDTO[]>([]);
  generating = signal(false);
  msg = signal<string | null>(null);
  msgError = signal(false);

  reprogramando = signal<VisitaProgramadaDTO | null>(null);
  reproFechaCtrl = this.fb.control('');
  reproMotivoCtrl = this.fb.control('');

  visitasPorDia = computed(() => {
    const map = new Map<string, VisitaProgramadaDTO[]>();
    for (const v of this.visitas()) {
      const dateKey = v.fechaHoraProgramada.split('T')[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(v);
    }
    return Array.from(map.entries()).map(([fecha, visitas]) => ({ fecha, visitas }));
  });

  generar(): void {
    this.generating.set(true);
    this.msg.set(null);
    this.api
      .generarVisitas(this.internacion().id, this.desdeCtrl.value!, this.hastaCtrl.value!, this.tipoCtrl.value!)
      .subscribe({
        next: () => {
          this.generating.set(false);
          this.msg.set('Visitas generadas correctamente');
          this.msgError.set(false);
          this.loadVisitas();
        },
        error: (err) => {
          this.generating.set(false);
          this.msg.set(err?.error?.detail ?? 'Error al generar visitas');
          this.msgError.set(true);
        },
      });
  }

  iniciar(visitaId: number): void {
    this.api.iniciarVisita(visitaId).subscribe({
      next: () => this.loadVisitas(),
      error: (err) => {
        this.msg.set(err?.error?.detail ?? 'Error al iniciar visita');
        this.msgError.set(true);
      },
    });
  }

  finalizar(visitaId: number): void {
    this.api.finalizarVisita(visitaId, {}).subscribe({
      next: () => this.loadVisitas(),
      error: (err) => {
        this.msg.set(err?.error?.detail ?? 'Error al finalizar visita');
        this.msgError.set(true);
      },
    });
  }

  openReprogramar(v: VisitaProgramadaDTO): void {
    this.reprogramando.set(v);
    this.reproFechaCtrl.setValue(v.fechaHoraProgramada?.substring(0, 16) ?? '');
    this.reproMotivoCtrl.setValue('');
  }

  confirmReprogramar(): void {
    const v = this.reprogramando();
    if (!v?.id || !this.reproFechaCtrl.value) return;
    this.api.reprogramarVisita(v.id, this.reproFechaCtrl.value + ':00.000Z', this.reproMotivoCtrl.value || 'Reprogramación').subscribe({
      next: () => {
        this.reprogramando.set(null);
        this.loadVisitas();
      },
      error: (err) => {
        this.msg.set(err?.error?.detail ?? 'Error al reprogramar');
        this.msgError.set(true);
      },
    });
  }

  private loadVisitas(): void {
    // Visitas come from the internacion object via the backend's visitaProgramadas list
    this.visitas.set(this.internacion().visitaProgramadas ?? []);
  }

  visitaTipoColor(t: TipoVisita): string {
    const m: Record<string, string> = {
      MEDICA: 'var(--accent-blue)', ENFERMERIA: 'var(--accent-cyan)', KINESIOLOGIA: '#a855f7',
      PSICOLOGIA: '#ec4899', NUTRICION: 'var(--accent-emerald)', TRABAJO_SOCIAL: '#f59e0b',
      CONTROL_EQUIPOS: '#6366f1', EMERGENCIA: 'var(--accent-red)', CONTROL_GENERAL: 'var(--text-secondary)',
    };
    return m[t] ?? 'var(--text-muted)';
  }

  estadoVisitaColor(e: EstadoVisita): string {
    const m: Record<string, string> = {
      PROGRAMADA: 'var(--accent-blue)', EN_CURSO: 'var(--accent-amber)', REALIZADA: 'var(--accent-emerald)',
      VENCIDA: 'var(--accent-red)', REPROGRAMADA: '#a855f7', CANCELADA_PROFESIONAL: 'var(--text-muted)',
      CANCELADA_PACIENTE: 'var(--text-muted)', EN_CAMINO: 'var(--accent-cyan)',
    };
    return m[e] ?? 'var(--text-muted)';
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}
function thirtyDaysLater(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}
