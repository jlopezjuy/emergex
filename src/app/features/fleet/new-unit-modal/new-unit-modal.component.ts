import { Component, output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { environment } from '../../../../environments/environment';

interface CrearAmbulanciaRequest {
  identificador: string;
  tipo: 'ALS' | 'BLS';
  patente?: string;
  modelo?: string;
  anio?: number;
}

@Component({
  selector: 'emx-new-unit-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell title="Nueva Unidad" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
        <!-- Identificador -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Identificador *
          </label>
          <input
            type="text"
            formControlName="identificador"
            placeholder="AMB-001"
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
          />
          @if (f['identificador'].invalid && f['identificador'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
          }
        </div>

        <!-- Tipo -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Tipo *
          </label>
          <div class="flex gap-3">
            @for (opt of tipos; track opt.value) {
              <label
                class="flex items-center gap-2 flex-1 px-3 py-2 rounded cursor-pointer"
                style="border: 1px solid var(--border-glass);"
                [style.border-color]="form.get('tipo')?.value === opt.value ? 'var(--accent-cyan)' : 'var(--border-glass)'"
                [style.background]="form.get('tipo')?.value === opt.value ? 'rgba(34,211,238,0.08)' : 'transparent'"
              >
                <input type="radio" formControlName="tipo" [value]="opt.value" class="sr-only" />
                <span class="text-sm font-semibold" style="color: var(--text-primary);">{{ opt.label }}</span>
                <span class="text-xs" style="color: var(--text-muted);">{{ opt.desc }}</span>
              </label>
            }
          </div>
        </div>

        <!-- Patente -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Patente
          </label>
          <input
            type="text"
            formControlName="patente"
            placeholder="AB 123 CD"
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
          />
        </div>

        <!-- Modelo + Año -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Modelo
            </label>
            <input
              type="text"
              formControlName="modelo"
              placeholder="Ford Transit"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Año
            </label>
            <input
              type="number"
              formControlName="anio"
              placeholder="2024"
              min="2000"
              max="2030"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
            />
          </div>
        </div>

        @if (errorMsg()) {
          <p class="text-xs" style="color: var(--accent-red);">{{ errorMsg() }}</p>
        }
      </form>

      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cancelar</button>
        <button
          type="submit"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid || saving()"
          (click)="submit()"
        >{{ saving() ? 'Guardando…' : 'Registrar unidad' }}</button>
      </div>
    </emx-modal-shell>
  `,
})
export class NewUnitModalComponent {
  created = output<void>();
  closed = output<void>();

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form = this.fb.group({
    identificador: ['', Validators.required],
    tipo: ['ALS', Validators.required],
    patente: [''],
    modelo: [''],
    anio: [null as number | null],
  });

  get f() {
    return this.form.controls;
  }

  readonly tipos = [
    { value: 'ALS', label: 'ALS', desc: 'Soporte vital avanzado' },
    { value: 'BLS', label: 'BLS', desc: 'Soporte vital básico' },
  ];

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMsg.set(null);
    const val = this.form.value;
    const req: CrearAmbulanciaRequest = {
      identificador: val.identificador!,
      tipo: val.tipo as 'ALS' | 'BLS',
      patente: val.patente || undefined,
      modelo: val.modelo || undefined,
      anio: val.anio ?? undefined,
    };
    this.http.post(`${environment.apiUrl}/api/ambulancias`, req).subscribe({
      next: () => {
        this.saving.set(false);
        this.created.emit();
      },
      error: () => {
        this.saving.set(false);
        this.errorMsg.set('Error al registrar la unidad. Verificá los datos e intentá de nuevo.');
      },
    });
  }
}
