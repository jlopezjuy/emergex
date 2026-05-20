import { Component, input, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import {
  InternacionDomiciliariaDTO,
  EvaluacionDomiciliariaDTO,
} from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-evaluacion-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="max-w-2xl">
      <div
        class="rounded-xl p-6"
        style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">
            Evaluación Domiciliaria
          </h2>
          @if (internacion().evaluacion && !editing()) {
            <button
              (click)="editing.set(true); buildForm(internacion().evaluacion!)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-secondary)"
            >
              Editar
            </button>
          }
        </div>

        @if (!internacion().evaluacion || editing()) {
          <!-- Form -->
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
            <!-- Resultado -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                Resultado *
              </label>
              <div class="grid grid-cols-3 gap-3">
                @for (opt of ['Apto', 'Apto con observaciones', 'No apto']; track opt) {
                  <button
                    type="button"
                    (click)="f['resultado'].setValue(opt)"
                    class="px-3 py-2 rounded-lg text-sm text-center transition-all border"
                    [style.background]="f['resultado'].value === opt ? resultadoBg(opt) : 'var(--surface-inset)'"
                    [style.borderColor]="f['resultado'].value === opt ? resultadoColor(opt) : 'var(--border-glass)'"
                    [style.color]="f['resultado'].value === opt ? '#fff' : 'var(--text-secondary)'"
                  >
                    {{ opt }}
                  </button>
                }
              </div>
            </div>

            <!-- Puntajes -->
            <div class="grid grid-cols-3 gap-4">
              @for (score of scores; track score.key) {
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                    {{ score.label }}
                  </label>
                  <div class="flex gap-2">
                    @for (v of [1,2,3,4,5]; track v) {
                      <button
                        type="button"
                        (click)="f[score.key].setValue(v)"
                        class="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                        [style.background]="(f[score.key].value ?? 0) >= v ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                        [style.color]="(f[score.key].value ?? 0) >= v ? '#fff' : 'var(--text-muted)'"
                        [style.border]="'1px solid ' + ((f[score.key].value ?? 0) >= v ? 'var(--accent-emerald)' : 'var(--border-glass)')"
                      >
                        {{ v }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Servicios -->
            <div class="grid grid-cols-3 gap-4">
              @for (srv of services; track srv.key) {
                <label
                  class="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border"
                  [style.background]="f[srv.key].value ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-inset)'"
                  [style.borderColor]="f[srv.key].value ? 'var(--accent-emerald)' : 'var(--border-glass)'"
                >
                  <input type="checkbox" [formControlName]="srv.key" class="accent-emerald-500" />
                  <span class="text-sm" style="color: var(--text-primary)">{{ srv.label }}</span>
                </label>
              }
            </div>

            <!-- Textareas -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                Observaciones del Entorno
              </label>
              <textarea
                formControlName="observacionEntorno"
                rows="3"
                class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
              ></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                Soporte Familiar
              </label>
              <textarea
                formControlName="soporteFamiliar"
                rows="3"
                class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
              ></textarea>
            </div>

            @if (error()) {
              <div class="p-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.1); color: var(--accent-red)">
                {{ error() }}
              </div>
            }

            <div class="flex gap-3 justify-end pt-4 border-t" style="border-color: var(--border-glass)">
              @if (internacion().evaluacion) {
                <button
                  type="button"
                  (click)="editing.set(false)"
                  class="px-4 py-2 text-sm rounded-lg"
                  style="color: var(--text-secondary); background: transparent"
                >
                  Cancelar
                </button>
              }
              <button
                type="submit"
                [disabled]="form.invalid || submitting()"
                class="px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                [style.background]="form.valid ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                [style.color]="form.valid ? '#fff' : 'var(--text-muted)'"
              >
                @if (submitting()) {
                  <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                }
                Guardar Evaluación
              </button>
            </div>
          </form>
        } @else {
          <!-- Read-only view -->
          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Resultado</div>
                <div
                  class="inline-block px-3 py-1 rounded-full text-sm font-medium"
                  [style.background]="resultadoBg(internacion().evaluacion!.resultado ?? '')"
                  style="color: #fff"
                >
                  {{ internacion().evaluacion!.resultado }}
                </div>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Fecha Evaluación</div>
                <div class="text-sm" style="color: var(--text-primary)">
                  {{ internacion().evaluacion!.fechaEvaluacion | date:'dd/MM/yy' }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Accesibilidad</div>
                <div class="flex gap-1">
                  @for (v of [1,2,3,4,5]; track v) {
                    <div class="w-6 h-6 rounded text-xs flex items-center justify-center font-medium"
                         [style.background]="v <= (internacion().evaluacion!.accesibilidadDomicilio ?? 0) ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                         [style.color]="v <= (internacion().evaluacion!.accesibilidadDomicilio ?? 0) ? '#fff' : 'var(--text-muted)'">
                      {{ v }}
                    </div>
                  }
                </div>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Higiene</div>
                <div class="flex gap-1">
                  @for (v of [1,2,3,4,5]; track v) {
                    <div class="w-6 h-6 rounded text-xs flex items-center justify-center font-medium"
                         [style.background]="v <= (internacion().evaluacion!.condicionesHigiene ?? 0) ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                         [style.color]="v <= (internacion().evaluacion!.condicionesHigiene ?? 0) ? '#fff' : 'var(--text-muted)'">
                      {{ v }}
                    </div>
                  }
                </div>
              </div>
              <div>
                <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Seguridad</div>
                <div class="flex gap-1">
                  @for (v of [1,2,3,4,5]; track v) {
                    <div class="w-6 h-6 rounded text-xs flex items-center justify-center font-medium"
                         [style.background]="v <= (internacion().evaluacion!.seguridadZona ?? 0) ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                         [style.color]="v <= (internacion().evaluacion!.seguridadZona ?? 0) ? '#fff' : 'var(--text-muted)'">
                      {{ v }}
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="flex gap-4">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" [style.background]="internacion().evaluacion!.servicioBasico ? 'var(--accent-emerald)' : 'var(--border-glass)'"></div>
                <span class="text-sm" style="color: var(--text-primary)">Servicios básicos</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" [style.background]="internacion().evaluacion!.espacioAdecuado ? 'var(--accent-emerald)' : 'var(--border-glass)'"></div>
                <span class="text-sm" style="color: var(--text-primary)">Espacio adecuado</span>
              </div>
            </div>

            <div>
              <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Observaciones del Entorno</div>
              <p class="text-sm" style="color: var(--text-primary)">{{ internacion().evaluacion!.observacionEntorno || '—' }}</p>
            </div>
            <div>
              <div class="text-xs uppercase tracking-wider mb-1" style="color: var(--text-muted)">Soporte Familiar</div>
              <p class="text-sm" style="color: var(--text-primary)">{{ internacion().evaluacion!.soporteFamiliar || '—' }}</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class EvaluacionTabComponent {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  editing = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  scores = [
    { key: 'accesibilidadDomicilio', label: 'Accesibilidad' },
    { key: 'condicionesHigiene', label: 'Higiene' },
    { key: 'seguridadZona', label: 'Seguridad' },
  ] as const;

  services = [
    { key: 'servicioBasico', label: 'Servicios básicos' },
    { key: 'espacioAdecuado', label: 'Espacio adecuado' },
    { key: 'electricidad', label: 'Electricidad' },
  ] as const;

  form = this.fb.nonNullable.group({
    resultado: ['', Validators.required],
    observacionEntorno: [''],
    soporteFamiliar: [''],
    accesibilidadDomicilio: [0],
    condicionesHigiene: [0],
    seguridadZona: [0],
    servicioBasico: [false],
    espacioAdecuado: [false],
    electricidad: [false],
  });

  get f() {
    return this.form.controls;
  }

  buildForm(evalData?: EvaluacionDomiciliariaDTO): void {
    if (!evalData) return;
    this.form.patchValue({
      resultado: evalData.resultado ?? '',
      observacionEntorno: evalData.observacionEntorno ?? '',
      soporteFamiliar: evalData.soporteFamiliar ?? '',
      accesibilidadDomicilio: evalData.accesibilidadDomicilio ?? 0,
      condicionesHigiene: evalData.condicionesHigiene ?? 0,
      seguridadZona: evalData.seguridadZona ?? 0,
      servicioBasico: evalData.servicioBasico ?? false,
      espacioAdecuado: evalData.espacioAdecuado ?? false,
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const dto: EvaluacionDomiciliariaDTO = {
      resultado: this.f.resultado.value,
      observacionEntorno: this.f.observacionEntorno.value || undefined,
      soporteFamiliar: this.f.soporteFamiliar.value || undefined,
      accesibilidadDomicilio: this.f.accesibilidadDomicilio.value || undefined,
      condicionesHigiene: this.f.condicionesHigiene.value || undefined,
      seguridadZona: this.f.seguridadZona.value || undefined,
      servicioBasico: this.f.servicioBasico.value || undefined,
      espacioAdecuado: this.f.espacioAdecuado.value || undefined,
    };

    this.api.cargarEvaluacion(this.internacion().id, dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.submitting.set(false);
              this.editing.set(false);
              // Refresh parent will pick up the change on next tab switch
            },
            error: (err) => {
              this.submitting.set(false);
              this.error.set(err?.error?.detail ?? 'Error al guardar evaluación');
            },
          });
  }

  resultadoColor(r: string): string {
    if (r.includes('No apto')) return 'var(--accent-red)';
    if (r.includes('observaciones')) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  }

  resultadoBg(r: string): string {
    if (r.includes('No apto')) return 'var(--accent-red)';
    if (r.includes('observaciones')) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  }
}
