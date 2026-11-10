import { Component, input, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import {
  InternacionDomiciliariaDTO,
  PlanCuidadoDTO,
  CambioPlanCuidadoDTO,
} from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-plan-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="grid grid-cols-3 gap-6">
      <!-- Main: Plan Form -->
      <div class="col-span-2">
        <div
          class="rounded-xl p-6"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold" style="color: var(--text-primary)">
              Plan de Cuidado
            </h2>
            @if (internacion().planCuidado && !editing()) {
              <button
                (click)="startEdit()"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-secondary)"
              >
                Editar
              </button>
            }
          </div>

          @if (loading()) {
            <p class="text-center py-6" style="color: var(--text-muted)">Cargando...</p>
          } @else if (!internacion().planCuidado || editing()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Objetivo *</label>
                <input type="text" formControlName="objetivo" placeholder="Ej: Recuperación funcional post-quirúrgica..."
                  class="rounded-lg px-3 py-2 text-sm w-full"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Descripción General *</label>
                <textarea formControlName="descripcionGeneral" rows="3" placeholder="Detalle del plan de cuidados..."
                  class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Frecuencia Visitas</label>
                  <input type="text" formControlName="frecuenciaVisitas" placeholder="Ej: Diaria"
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Duración (días)</label>
                  <input type="number" formControlName="duracionEstimada" placeholder="30"
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Cuidadores</label>
                  <input type="number" formControlName="cuidadoresNecesarios" placeholder="1"
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Medicamentos</label>
                  <textarea formControlName="medicamentoIncluido" rows="2" placeholder="Lista de medicamentos requeridos..."
                    class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Equipamiento</label>
                  <textarea formControlName="equipamientoRequerido" rows="2" placeholder="Equipamiento necesario..."
                    class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Costo Diario</label>
                  <input type="number" formControlName="costoDiario" placeholder="0.00"
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Observación Familia</label>
                  <input type="text" formControlName="observacionFamilia" placeholder="Notas para la familia..."
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                </div>
              </div>

              @if (error()) {
                <div class="p-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.1); color: var(--accent-red)">{{ error() }}</div>
              }

              <div class="flex gap-3 justify-end pt-4 border-t" style="border-color: var(--border-glass)">
                @if (internacion().planCuidado) {
                  <button type="button" (click)="editing.set(false)" class="px-4 py-2 text-sm rounded-lg"
                    style="color: var(--text-secondary); background: transparent">Cancelar</button>
                }
                <button type="submit" [disabled]="form.invalid || submitting()"
                  class="px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  [style.background]="form.valid ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                  [style.color]="form.valid ? '#fff' : 'var(--text-muted)'">
                  @if (submitting()) {
                    <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  }
                  Guardar Plan
                </button>
              </div>
            </form>
          } @else {
            <!-- Read-only view -->
            <div class="space-y-5">
              @if (internacion().planCuidado; as p) {
                <div>
                  <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Objetivo</div>
                  <p class="text-sm" style="color: var(--text-primary)">{{ p.objetivo || '—' }}</p>
                </div>
                <div>
                  <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Descripción</div>
                  <p class="text-sm" style="color: var(--text-primary)">{{ p.descripcionGeneral || '—' }}</p>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Frecuencia</div>
                    <p class="text-sm" style="color: var(--text-primary)">{{ p.frecuenciaVisitas || '—' }}</p>
                  </div>
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Duración</div>
                    <p class="text-sm" style="color: var(--text-primary)">{{ p.duracionEstimada ? p.duracionEstimada + ' días' : '—' }}</p>
                  </div>
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Cuidadores</div>
                    <p class="text-sm" style="color: var(--text-primary)">{{ p.cuidadoresNecesarios ?? '—' }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Medicamentos</div>
                    <p class="text-sm whitespace-pre-wrap" style="color: var(--text-primary)">{{ p.medicamentoIncluido || '—' }}</p>
                  </div>
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Equipamiento</div>
                    <p class="text-sm whitespace-pre-wrap" style="color: var(--text-primary)">{{ p.equipamientoRequerido || '—' }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Costo Diario</div>
                    <p class="text-sm" style="color: var(--text-primary)">{{ p.costoDiario ? '$' + p.costoDiario : '—' }}</p>
                  </div>
                  <div>
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Creado</div>
                    <p class="text-sm" style="color: var(--text-primary)">{{ p.fechaCreacion ? (p.fechaCreacion | date:'dd/MM/yy') : '—' }}</p>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Sidebar: Historial -->
      <div class="col-span-1">
        <div
          class="rounded-xl p-5 sticky top-6"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
        >
          <h3 class="text-base font-semibold mb-4" style="color: var(--text-primary)">Historial de Cambios</h3>

          @if (historial().length === 0) {
            <p class="text-sm" style="color: var(--text-muted)">Sin cambios registrados</p>
          } @else {
            <div class="space-y-4">
              @for (c of historial(); track c.id) {
                <div class="pb-4 border-b" style="border-color: var(--border-glass)">
                  <div class="text-sm font-medium" style="color: var(--text-primary)">{{ c.motivo }}</div>
                  <div class="text-xs mt-1" style="color: var(--text-muted)">
                    {{ c.fechaCambio | date:'dd/MM/yy HH:mm' }}
                  </div>
                  @if (c.profesional) {
                    <div class="text-xs" style="color: var(--text-secondary)">{{ c.profesional.apellido }}, {{ c.profesional.nombre }}</div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PlanTabComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  editing = signal(false);
  submitting = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  historial = signal<CambioPlanCuidadoDTO[]>([]);

  form = this.fb.nonNullable.group({
    objetivo: ['', Validators.required],
    descripcionGeneral: ['', Validators.required],
    frecuenciaVisitas: [''],
    duracionEstimada: [0],
    cuidadoresNecesarios: [0],
    medicamentoIncluido: [''],
    equipamientoRequerido: [''],
    costoDiario: [0],
    observacionFamilia: [''],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.loadHistorial();
  }

  private loadHistorial(): void {
    this.api.getHistorialPlan(this.internacion().id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.historial.set(data ?? []),
            error: () => {},
          });
  }

  startEdit(): void {
    const p = this.internacion().planCuidado;
    if (p) {
      this.form.patchValue({
        objetivo: p.objetivo ?? '',
        descripcionGeneral: p.descripcionGeneral ?? '',
        frecuenciaVisitas: p.frecuenciaVisitas ?? '',
        duracionEstimada: p.duracionEstimada ?? 0,
        cuidadoresNecesarios: p.cuidadoresNecesarios ?? 0,
        medicamentoIncluido: p.medicamentoIncluido ?? '',
        equipamientoRequerido: p.equipamientoRequerido ?? '',
        costoDiario: p.costoDiario ?? 0,
        observacionFamilia: p.observacionFamilia ?? '',
      });
    }
    this.editing.set(true);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const dto: PlanCuidadoDTO = {
      objetivo: this.f.objetivo.value,
      descripcionGeneral: this.f.descripcionGeneral.value,
      frecuenciaVisitas: this.f.frecuenciaVisitas.value || undefined,
      duracionEstimada: this.f.duracionEstimada.value || undefined,
      cuidadoresNecesarios: this.f.cuidadoresNecesarios.value || undefined,
      medicamentoIncluido: this.f.medicamentoIncluido.value || undefined,
      equipamientoRequerido: this.f.equipamientoRequerido.value || undefined,
      costoDiario: this.f.costoDiario.value || undefined,
      observacionFamilia: this.f.observacionFamilia.value || undefined,
    };

    this.api.definirPlanCuidado(this.internacion().id, dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.submitting.set(false);
              this.editing.set(false);
              this.loadHistorial();
            },
            error: (err) => {
              this.submitting.set(false);
              this.error.set(err?.error?.detail ?? 'Error al guardar plan');
            },
          });
  }
}
