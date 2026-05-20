import { Component, input, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO, EquipoTratanteDTO, DisciplinaSalud } from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-equipo-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="max-w-4xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Equipo Tratante</h2>
        @if (!showForm()) {
          <button (click)="showForm.set(true)"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--accent-emerald); color: #fff">
            + Asignar Profesional
          </button>
        }
      </div>

      @if (error()) {
        <div class="p-3 rounded-lg text-sm mb-4" style="background: rgba(239,68,68,0.1); color: var(--accent-red)">{{ error() }}</div>
      }

      <!-- New Assignment Form -->
      @if (showForm()) {
        <form [formGroup]="assignForm" (ngSubmit)="submitAssign()"
          class="rounded-xl p-5 mb-6 space-y-4"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
          <h3 class="text-sm font-semibold" style="color: var(--text-primary)">Nuevo Profesional</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Profesional ID *</label>
              <input type="number" formControlName="profesionalId" placeholder="ID del profesional"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Rol *</label>
              <select formControlName="rol"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;">
                <option value="">Seleccionar...</option>
                <option value="MEDICO">Médico</option>
                <option value="ENFERMERO">Enfermero</option>
                <option value="KINESIOLOGO">Kinesiólogo</option>
                <option value="PSICOLOGO">Psicólogo</option>
                <option value="NUTRICIONISTA">Nutricionista</option>
                <option value="TRABAJADOR_SOCIAL">Trabajador Social</option>
                <option value="COORDINADOR">Coordinador</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Disciplina</label>
              <select formControlName="disciplina"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;">
                <option value="">Seleccionar...</option>
                <option value="MEDICINA">Medicina</option>
                <option value="ENFERMERIA">Enfermería</option>
                <option value="KINESIOLOGIA">Kinesiología</option>
                <option value="FONOAUDIOLOGIA">Fonoaudiología</option>
                <option value="NUTRICION">Nutrición</option>
                <option value="PSICOLOGIA">Psicología</option>
                <option value="TRABAJO_SOCIAL">Trabajo Social</option>
                <option value="CUIDADOS_PALIATIVOS">Cuidados Paliativos</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Contacto Emergencia</label>
              <input type="text" formControlName="contactoEmergencia" placeholder="Teléfono"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" formControlName="disponibilidad24x7" />
            <span class="text-sm" style="color: var(--text-primary)">Disponibilidad 24x7</span>
          </label>
          <div class="flex gap-3 justify-end">
            <button type="button" (click)="showForm.set(false)"
              class="px-4 py-2 text-sm rounded-lg" style="color: var(--text-secondary); background: transparent">Cancelar</button>
            <button type="submit" [disabled]="assignForm.invalid || assigning()"
              class="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              [style.background]="assignForm.valid ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
              [style.color]="assignForm.valid ? '#fff' : 'var(--text-muted)'">
              @if (assigning()) {
                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              }
              Asignar
            </button>
          </div>
        </form>
      }

      <!-- Team Cards -->
      @if ((internacion().equipoTratantes?.length ?? 0) === 0 && !showForm()) {
        <div class="rounded-xl p-8 text-center border border-dashed"
          style="background: var(--surface-glass); border-color: var(--border-glass)">
          <p style="color: var(--text-muted)">Aún no hay profesionales asignados</p>
        </div>
      } @else {
        <div class="grid grid-cols-2 gap-4">
          @for (m of internacion().equipoTratantes ?? []; track m.id) {
            <div class="rounded-xl p-4 flex gap-4 items-start"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style="background: var(--accent-blue); color: #fff">
                {{ initials(m.profesional?.apellido, m.profesional?.nombre) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm" style="color: var(--text-primary)">
                  {{ m.profesional?.apellido }}, {{ m.profesional?.nombre || '—' }}
                </div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                    style="background: var(--accent-blue); color: #fff">{{ m.rol }}</span>
                  @if (m.disciplina) {
                    <span class="px-2 py-0.5 rounded-full text-xs"
                      style="background: var(--surface-inset); color: var(--text-secondary)">{{ m.disciplina }}</span>
                  }
                  @if (m.disponibilidad24x7) {
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                      style="background: var(--accent-emerald); color: #fff">24x7</span>
                  }
                </div>
                <div class="text-xs mt-2" style="color: var(--text-muted)">
                  Desde {{ m.fechaAsignacion | date:'dd/MM/yy' }}
                  @if (m.contactoEmergencia) { · {{ m.contactoEmergencia }} }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EquipoTabComponent {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  showForm = signal(false);
  assigning = signal(false);
  error = signal<string | null>(null);

  assignForm = this.fb.nonNullable.group({
    profesionalId: [0, [Validators.required, Validators.min(1)]],
    rol: ['', Validators.required],
    disciplina: [''],
    contactoEmergencia: [''],
    disponibilidad24x7: [false],
  });

  submitAssign(): void {
    if (this.assignForm.invalid) return;
    this.assigning.set(true);
    this.error.set(null);

    this.api.asignarEquipo(this.internacion().id, this.assignForm.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.assigning.set(false);
              this.showForm.set(false);
              this.assignForm.reset({ profesionalId: 0, rol: '', disciplina: '', contactoEmergencia: '', disponibilidad24x7: false });
            },
            error: (err) => {
              this.assigning.set(false);
              this.error.set(err?.error?.detail ?? 'Error al asignar profesional');
            },
          });
  }

  initials(apellido?: string, nombre?: string): string {
    const a = apellido?.charAt(0) ?? '';
    const n = nombre?.charAt(0) ?? '';
    return (a + n).toUpperCase() || '?';
  }
}
