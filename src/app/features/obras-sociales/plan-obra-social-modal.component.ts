import { Component, OnInit, input, output, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { PlanObraSocialApiService } from '../../data-access/api/plan-obra-social.api';
import { ObraSocialDTO } from '../../data-access/dto/obra-social.dto';
import { PlanObraSocialDTO, Provincia, PROVINCIAS } from '../../data-access/dto/plan-obra-social.dto';

@Component({
  selector: 'emx-plan-obra-social-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell [title]="'Planes de ' + obraSocial().nombre" [maxWidthClass]="'max-w-2xl'" (closed)="closed.emit()">
      <div class="flex flex-col gap-4" style="max-height: 65vh; overflow-y: auto; padding-right: 4px;">

        @if (loading()) {
          <span class="text-xs" style="color: var(--text-muted);" role="status">Cargando planes...</span>
        }

        @if (!loading() && planes().length === 0) {
          <div class="rounded-btn p-4 text-center text-sm" style="background: var(--surface-glass); border: 1px dashed var(--border-glass); color: var(--text-muted);">
            Todavía no hay planes cargados para esta obra social.
          </div>
        }

        @for (plan of planes(); track plan.id) {
          <div class="flex flex-col gap-2 rounded-btn p-3" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-sm" style="color: var(--text-primary);">{{ plan.nombre }}</span>
                @if (plan.codigo) {
                  <span class="text-xs px-1.5 py-0.5 rounded font-mono" style="background: var(--surface-inset); color: var(--text-muted);">{{ plan.codigo }}</span>
                }
                <span class="text-xs px-2 py-0.5 rounded font-semibold"
                  [style.background]="plan.activo ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'"
                  [style.color]="plan.activo ? '#10B981' : '#EF4444'"
                >{{ plan.activo ? 'ACTIVO' : 'INACTIVO' }}</span>
              </div>
              <div class="flex gap-2">
                <button type="button" class="btn btn--ghost btn--sm" (click)="toggleProvincias(plan)">
                  {{ selectedPlanId() === plan.id ? 'Ocultar provincias' : 'Provincias' }}
                </button>
                <button type="button" class="btn btn--ghost btn--sm" (click)="toggleActivo(plan)">
                  {{ plan.activo ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>

            @if (selectedPlanId() === plan.id) {
              <div class="flex flex-col gap-2 pt-2" style="border-top: 1px solid var(--border-glass);">
                @if (loadingProvincias()) {
                  <span class="text-xs" style="color: var(--text-muted);" role="status">Cargando provincias...</span>
                } @else {
                  <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    @for (p of provinciasCatalogo; track p.value) {
                      <label class="flex items-center gap-1.5 text-xs cursor-pointer" style="color: var(--text-secondary);">
                        <input
                          type="checkbox"
                          [checked]="provinciasSeleccionadas().has(p.value)"
                          (change)="toggleProvincia(p.value)"
                          class="focus:ring-2 focus:ring-[var(--accent-cyan)]"
                        />
                        {{ p.label }}
                      </label>
                    }
                  </div>
                  <div class="flex justify-end pt-1">
                    <button type="button" class="btn btn--primary btn--sm" [disabled]="savingProvincias()" (click)="guardarProvincias(plan)">
                      {{ savingProvincias() ? 'Guardando...' : 'Guardar provincias' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Alta de plan nuevo -->
        <form [formGroup]="nuevoPlanForm" (ngSubmit)="crearPlan()" class="flex flex-col gap-2 rounded-btn p-3" style="background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.3);">
          <span class="eyebrow">Agregar plan</span>
          <div class="grid grid-cols-2 gap-2">
            <input
              type="text"
              formControlName="nombre"
              placeholder="Ej: 310, NOA Integral..."
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
            />
            <input
              type="text"
              formControlName="codigo"
              placeholder="Código (opcional)"
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
            />
          </div>
          @if (createError()) {
            <span class="text-xs" style="color: var(--error-text, #EF4444);">{{ createError() }}</span>
          }
          <div class="flex justify-end">
            <button type="submit" class="btn btn--primary btn--sm" [disabled]="nuevoPlanForm.invalid || creating()">
              {{ creating() ? 'Agregando...' : 'Agregar plan' }}
            </button>
          </div>
        </form>
      </div>

      <div footer class="flex justify-end">
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cerrar</button>
      </div>
    </emx-modal-shell>
  `,
})
export class PlanObraSocialModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(PlanObraSocialApiService);
  private fb = inject(FormBuilder);

  obraSocial = input.required<ObraSocialDTO>();
  closed = output<void>();

  readonly provinciasCatalogo = PROVINCIAS;

  readonly loading = signal(false);
  readonly planes = signal<PlanObraSocialDTO[]>([]);

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly selectedPlanId = signal<number | null>(null);
  readonly loadingProvincias = signal(false);
  readonly savingProvincias = signal(false);
  readonly provinciasSeleccionadas = signal<Set<Provincia>>(new Set());

  nuevoPlanForm = this.fb.group({
    nombre: ['', Validators.required],
    codigo: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const obraSocialId = this.obraSocial().id;
    if (!obraSocialId) return;
    this.loading.set(true);
    this.api
      .getByObraSocial(obraSocialId)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        this.planes.set(data);
        this.loading.set(false);
      });
  }

  crearPlan(): void {
    if (this.nuevoPlanForm.invalid) return;
    const obraSocialId = this.obraSocial().id;
    if (!obraSocialId) return;

    this.creating.set(true);
    this.createError.set(null);
    const val = this.nuevoPlanForm.value;
    this.api
      .create({
        nombre: val.nombre!,
        codigo: val.codigo || undefined,
        activo: true,
        obraSocial: { id: obraSocialId },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.nuevoPlanForm.reset({ nombre: '', codigo: '' });
          this.load();
        },
        error: (err) => {
          this.creating.set(false);
          this.createError.set(err?.error?.detail ?? 'No se pudo crear el plan.');
        },
      });
  }

  toggleActivo(plan: PlanObraSocialDTO): void {
    this.api.update({ ...plan, activo: !plan.activo }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(),
    });
  }

  toggleProvincias(plan: PlanObraSocialDTO): void {
    if (this.selectedPlanId() === plan.id) {
      this.selectedPlanId.set(null);
      return;
    }
    if (!plan.id) return;
    this.selectedPlanId.set(plan.id);
    this.loadingProvincias.set(true);
    this.provinciasSeleccionadas.set(new Set());
    this.api
      .getProvincias(plan.id)
      .pipe(
        catchError(() => of([] as Provincia[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((provincias) => {
        this.provinciasSeleccionadas.set(new Set(provincias));
        this.loadingProvincias.set(false);
      });
  }

  toggleProvincia(p: Provincia): void {
    const actuales = new Set(this.provinciasSeleccionadas());
    if (actuales.has(p)) {
      actuales.delete(p);
    } else {
      actuales.add(p);
    }
    this.provinciasSeleccionadas.set(actuales);
  }

  guardarProvincias(plan: PlanObraSocialDTO): void {
    if (!plan.id) return;
    this.savingProvincias.set(true);
    this.api
      .setProvincias(plan.id, Array.from(this.provinciasSeleccionadas()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.savingProvincias.set(false),
        error: () => this.savingProvincias.set(false),
      });
  }
}
