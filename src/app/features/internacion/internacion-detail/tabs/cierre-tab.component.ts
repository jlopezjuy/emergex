import { Component, input, inject, signal, computed, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import { InternacionStore } from '../../../../core/stores/internacion.store';
import {
  InternacionDomiciliariaDTO,
  ResumenAltaDTO,
} from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-cierre-tab',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="max-w-3xl">
      <h2 class="text-lg font-semibold mb-2" style="color: var(--text-primary)">Cierre de Internación</h2>
      <p class="text-sm mb-6" style="color: var(--text-muted)">
        Complete el resumen de alta. Verifique que no haya visitas pendientes ni prescripciones activas.
      </p>

      @if (msg()) {
        <div class="p-3 rounded-lg text-sm mb-4" [style.background]="msgError() ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
          [style.color]="msgError() ? 'var(--accent-red)' : 'var(--accent-emerald)'">{{ msg() }}</div>
      }

      <div class="grid grid-cols-3 gap-6">
        <!-- Validation Checklist -->
        <div class="col-span-1">
          <div class="rounded-xl p-5 sticky top-6" style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
            <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary)">Condiciones</h3>
            <div class="space-y-3">
              <div class="flex items-center gap-2 text-sm">
                <span [style.color]="condiciones().visitasPendientes ? 'var(--accent-red)' : 'var(--accent-emerald)'">
                  {{ condiciones().visitasPendientes ? '✗' : '✓' }}
                </span>
                <span style="color: var(--text-primary)">
                  Sin visitas pendientes
                </span>
                @if (condiciones().visitasPendientes) {
                  <span class="text-xs" style="color: var(--accent-red)">({{ condiciones().visitasPendientes }})</span>
                }
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span [style.color]="condiciones().prescripcionesActivas ? 'var(--accent-red)' : 'var(--accent-emerald)'">
                  {{ condiciones().prescripcionesActivas ? '✗' : '✓' }}
                </span>
                <span style="color: var(--text-primary)">
                  Sin prescripciones activas
                </span>
                @if (condiciones().prescripcionesActivas) {
                  <span class="text-xs" style="color: var(--accent-red)">({{ condiciones().prescripcionesActivas }})</span>
                }
              </div>
              <div class="flex items-center gap-2 text-sm">
                <span [style.color]="!condiciones().visitasRealizadas ? 'var(--accent-red)' : 'var(--accent-emerald)'">
                  {{ !condiciones().visitasRealizadas ? '✗' : '✓' }}
                </span>
                <span style="color: var(--text-primary)">
                  Al menos 1 visita realizada
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="col-span-2">
          <form [formGroup]="form" (ngSubmit)="submit()"
            class="rounded-xl p-6 space-y-4"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Fecha de Alta *</label>
              <input type="datetime-local" formControlName="fechaAlta"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Diagnóstico de Egreso *</label>
              <textarea formControlName="diagnosticoEgreso" rows="2" placeholder="Resumen del diagnóstico al alta..."
                class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Resumen de Evolución *</label>
              <textarea formControlName="resumenEvolucion" rows="4" placeholder="Evolución clínica durante la internación..."
                class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Indicaciones al Alta *</label>
              <textarea formControlName="indicacionesAlta" rows="4" placeholder="Cuidados post-alta, medicación, controles..."
                class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                Motivo de Alta
                <span class="font-normal normal-case tracking-normal" style="color: var(--text-muted)">
                  (usar "RECHAZO_PACIENTE" para omitir validación de visitas)
                </span>
              </label>
              <input type="text" formControlName="motivoAlta" placeholder="Opcional"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>

            <div class="flex justify-end pt-4 border-t" style="border-color: var(--border-glass)">
              <button type="submit" [disabled]="form.invalid || submitting()"
                class="px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                style="background: var(--accent-red); color: #fff">
                @if (submitting()) {
                  <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                }
                Cerrar Internación
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class CierreTabComponent {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private store = inject(InternacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  submitting = signal(false);
  msg = signal<string | null>(null);
  msgError = signal(false);

  condiciones = computed(() => {
    const i = this.internacion();
    const visitas = i.visitaProgramadas ?? [];
    const pendientes = visitas.filter((v) => v.estado === 'PROGRAMADA' || v.estado === 'EN_CURSO').length;
    const realizadas = visitas.filter((v) => v.estado === 'REALIZADA').length;

    return {
      visitasPendientes: pendientes,
      prescripcionesActivas: 0, // would need API call
      visitasRealizadas: realizadas > 0,
    };
  });

  form = this.fb.nonNullable.group({
    fechaAlta: [new Date().toISOString().slice(0, 16), Validators.required],
    diagnosticoEgreso: ['', Validators.required],
    resumenEvolucion: ['', Validators.required],
    indicacionesAlta: ['', Validators.required],
    motivoAlta: [''],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.msg.set(null);

    const f = this.form.getRawValue();
    const dto: ResumenAltaDTO = {
      fechaAlta: f.fechaAlta + ':00.000Z',
      diagnosticoEgreso: f.diagnosticoEgreso,
      resumenEvolucion: f.resumenEvolucion,
      indicacionesAlta: f.indicacionesAlta,
      motivoAlta: f.motivoAlta || undefined,
    };

    this.api.cerrarInternacion(this.internacion().id, dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
              this.submitting.set(false);
              this.store.actualizarEnLista(data);
              this.msg.set('Internación cerrada correctamente');
              this.msgError.set(false);
              setTimeout(() => this.router.navigate(['/internacion']), 1500);
            },
            error: (err) => {
              this.submitting.set(false);
              this.msg.set(err?.error?.detail ?? 'Error al cerrar internación');
              this.msgError.set(true);
            },
          });
  }
}
