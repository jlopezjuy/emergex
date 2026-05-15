import { Component, output, inject, HostListener } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { CrearTicketRequest } from '../../../../data-access/dto/ticket.dto';

const TIPOS = [
  'Paro cardíaco',
  'Trauma vehicular',
  'ACV / Ictus',
  'Fractura / Trauma',
  'Dificultad resp.',
  'Intoxicación',
  'Quemaduras',
  'Psiquiátrico',
  'Obstetricia',
  'Otro',
];

const SECTORES = ['Centro', 'Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 'GBA'];

@Component({
  selector: 'emx-emergency-quick-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell title="Nueva Emergencia" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">

        <!-- Tipo chips -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Tipo de emergencia *</label>
          <div class="flex flex-wrap gap-1.5">
            @for (t of tipos; track t) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-btn text-xs font-medium transition-all"
                [style.border]="f['tipoEmergencia'].value === t
                  ? '1px solid var(--accent-cyan)'
                  : '1px solid var(--border-glass)'"
                [style.background]="f['tipoEmergencia'].value === t
                  ? 'rgba(6,182,212,0.15)'
                  : 'var(--surface-glass)'"
                [style.color]="f['tipoEmergencia'].value === t
                  ? 'var(--accent-cyan)'
                  : 'var(--text-secondary)'"
                (click)="f['tipoEmergencia'].setValue(t)"
              >{{ t }}</button>
            }
          </div>
          @if (f['tipoEmergencia'].invalid && f['tipoEmergencia'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná un tipo</span>
          }
        </div>

        <!-- Prioridad — large 3-button -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Prioridad *</label>
          <div class="flex gap-2">
            @for (opt of prioridades; track opt.value) {
              <button
                type="button"
                class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-btn border transition-all"
                [style.border-color]="f['prioridad'].value === opt.value ? opt.color : 'var(--border-glass)'"
                [style.background]="f['prioridad'].value === opt.value ? opt.bg : 'transparent'"
                (click)="f['prioridad'].setValue(opt.value)"
              >
                <span class="w-2.5 h-2.5 rounded-full" [style.background]="opt.color"></span>
                <span class="text-xs font-bold mt-1" [style.color]="opt.color">{{ opt.label }}</span>
                <span class="text-xs text-center leading-tight" style="color: var(--text-muted);">{{ opt.sublabel }}</span>
              </button>
            }
          </div>
          @if (f['prioridad'].invalid && f['prioridad'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná una prioridad</span>
          }
        </div>

        <!-- Dirección -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Dirección *</label>
          <input
            type="text"
            formControlName="direccion"
            placeholder="Av. Independencia 842, Centro"
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          />
          @if (f['direccion'].invalid && f['direccion'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
          }
        </div>

        <!-- Sector dropdown -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Sector</label>
          <select
            formControlName="sector"
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          >
            <option value="">— Sin especificar —</option>
            @for (s of sectores; track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
        </div>

        <!-- Descripción paciente -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Descripción del paciente</label>
          <input
            type="text"
            formControlName="pacienteDescripcion"
            placeholder="Sexo, edad, síntomas..."
            class="rounded-btn px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          />
        </div>

        <!-- Notas -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Notas adicionales</label>
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
      <div footer class="flex items-center gap-2">
        <span class="flex-1 flex gap-2 text-xs" style="color: var(--text-muted);">
          <span class="font-mono px-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">Esc</span>
          cancelar
          <span class="font-mono px-1 rounded ml-2" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">Enter</span>
          registrar
        </span>
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid"
          (click)="submit()"
        >Registrar y despachar</button>
      </div>
    </emx-modal-shell>
  `,
})
export class EmergencyQuickCreateModalComponent {
  created = output<CrearTicketRequest>();
  closed = output<void>();

  private fb = inject(FormBuilder);

  readonly tipos = TIPOS;
  readonly sectores = SECTORES;

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
    {
      value: 'CRITICA',
      label: 'Crítica',
      sublabel: 'Riesgo de vida inmediato',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.12)',
    },
    {
      value: 'URGENTE',
      label: 'Urgente',
      sublabel: 'Atención < 10 min',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
    },
    {
      value: 'NORMAL',
      label: 'Normal',
      sublabel: 'Estable, sin urgencia',
      color: '#10B981',
      bg: 'rgba(16,185,129,0.12)',
    },
  ];

  @HostListener('document:keydown.enter')
  onEnter(): void {
    this.submit();
  }

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
      sector: val.sector || undefined,
      notas: val.notas || undefined,
    });
  }
}
