import { Component, output, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { CrearTicketRequest } from '../../../../data-access/dto/ticket.dto';

@Component({
  selector: 'emx-emergency-quick-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell title="Nueva Emergencia" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
        <!-- Tipo -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Tipo de emergencia *
          </label>
          <input
            type="text"
            formControlName="tipoEmergencia"
            placeholder="Paro cardíaco, Trauma vehicular..."
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          />
          @if (f['tipoEmergencia'].invalid && f['tipoEmergencia'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
          }
        </div>

        <!-- Prioridad -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Prioridad *
          </label>
          <div class="flex gap-2">
            @for (opt of prioridades; track opt.value) {
              <label
                class="flex items-center gap-2 flex-1 px-3 py-2 rounded-btn cursor-pointer border transition-all"
                [style.border-color]="form.get('prioridad')?.value === opt.value ? opt.color : 'var(--border-glass)'"
                [style.background]="form.get('prioridad')?.value === opt.value ? opt.bg : 'transparent'"
              >
                <input
                  type="radio"
                  formControlName="prioridad"
                  [value]="opt.value"
                  class="sr-only"
                />
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  [style.background]="opt.color"
                ></span>
                <span class="text-xs font-semibold" [style.color]="opt.color">{{ opt.label }}</span>
              </label>
            }
          </div>
          @if (f['prioridad'].invalid && f['prioridad'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná una prioridad</span>
          }
        </div>

        <!-- Dirección -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Dirección *
          </label>
          <input
            type="text"
            formControlName="direccion"
            placeholder="Av. Corrientes 1234, CABA"
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          />
          @if (f['direccion'].invalid && f['direccion'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
          }
        </div>

        <!-- Sector -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Sector
          </label>
          <input
            type="text"
            formControlName="sector"
            placeholder="Zona norte, GBA..."
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          />
        </div>

        <!-- Descripción paciente -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Descripción del paciente
          </label>
          <input
            type="text"
            formControlName="pacienteDescripcion"
            placeholder="Sexo, edad, síntomas..."
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          />
        </div>

        <!-- Notas -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Notas adicionales
          </label>
          <textarea
            formControlName="notas"
            rows="2"
            placeholder="Información adicional..."
            class="rounded-btn px-3 py-2 text-sm w-full resize-none"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          ></textarea>
        </div>
      </form>

      <!-- Footer -->
      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid"
          (click)="submit()"
        >
          Registrar y despachar
        </button>
      </div>
    </emx-modal-shell>
  `,
})
export class EmergencyQuickCreateModalComponent {
  created = output<CrearTicketRequest>();
  closed = output<void>();

  private fb = inject(FormBuilder);

  form = this.fb.group({
    tipoEmergencia: ['', Validators.required],
    prioridad: ['', Validators.required],
    direccion: ['', Validators.required],
    sector: [''],
    pacienteDescripcion: [''],
    notas: [''],
  });

  get f() {
    return this.form.controls;
  }

  readonly prioridades = [
    { value: 'CRITICA', label: 'Crítica', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    { value: 'URGENTE', label: 'Urgente', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { value: 'NORMAL', label: 'Normal', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  ];

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.value;
    this.created.emit({
      tipoEmergencia: val.tipoEmergencia!,
      prioridad: val.prioridad!,
      direccion: val.direccion!,
      sector: val.sector ?? undefined,
      notas: val.notas ?? undefined,
    });
  }
}
