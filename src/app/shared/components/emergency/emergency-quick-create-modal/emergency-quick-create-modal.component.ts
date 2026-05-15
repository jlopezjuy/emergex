import { Component, output, inject, HostListener, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { CrearTicketRequest } from '../../../../data-access/dto/ticket.dto';

type TipoAsistencia = CrearTicketRequest['tipoAsistencia'];
type NivelUrgencia = CrearTicketRequest['nivelUrgencia'];

const TIPOS_ASISTENCIA: { value: TipoAsistencia; label: string }[] = [
  { value: 'EMERGENCIA_DOMICILIARIA',    label: 'Emergencia domiciliaria' },
  { value: 'CONTROL_MEDICO_DOMICILIARIO', label: 'Control médico' },
  { value: 'ENFERMERIA_DOMICILIARIA',    label: 'Enfermería domiciliaria' },
  { value: 'TRASLADO_PROGRAMADO',        label: 'Traslado programado' },
  { value: 'VISITA_DOMICILIARIA',        label: 'Visita domiciliaria' },
  { value: 'ORIENTACION_TELEFONICA',     label: 'Orientación telefónica' },
];

const NIVELES_URGENCIA: { value: NivelUrgencia; label: string; sublabel: string; color: string; bg: string }[] = [
  { value: 'ROJO',    label: 'Crítica',  sublabel: 'Riesgo de vida inmediato', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  { value: 'AMARILLO', label: 'Urgente', sublabel: 'Atención < 10 min',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { value: 'VERDE',   label: 'Normal',   sublabel: 'Estable, sin urgencia',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { value: 'AZUL',    label: 'Guardia',  sublabel: 'Consulta de guardia',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
];

@Component({
  selector: 'emx-emergency-quick-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell title="Nueva Emergencia" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">

        <!-- Tipo de asistencia -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Tipo de asistencia *</label>
          <div class="flex flex-wrap gap-1.5">
            @for (t of tiposAsistencia; track t.value) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-btn text-xs font-medium transition-all"
                [style.border]="f['tipoAsistencia'].value === t.value
                  ? '1px solid var(--accent-cyan)'
                  : '1px solid var(--border-glass)'"
                [style.background]="f['tipoAsistencia'].value === t.value
                  ? 'rgba(6,182,212,0.15)'
                  : 'var(--surface-glass)'"
                [style.color]="f['tipoAsistencia'].value === t.value
                  ? 'var(--accent-cyan)'
                  : 'var(--text-secondary)'"
                (click)="f['tipoAsistencia'].setValue(t.value)"
              >{{ t.label }}</button>
            }
          </div>
          @if (f['tipoAsistencia'].invalid && f['tipoAsistencia'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná un tipo</span>
          }
        </div>

        <!-- Nivel de urgencia -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Nivel de urgencia *</label>
          <div class="flex gap-2">
            @for (opt of nivelesUrgencia; track opt.value) {
              <button
                type="button"
                class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-btn border transition-all"
                [style.border-color]="f['nivelUrgencia'].value === opt.value ? opt.color : 'var(--border-glass)'"
                [style.background]="f['nivelUrgencia'].value === opt.value ? opt.bg : 'transparent'"
                (click)="f['nivelUrgencia'].setValue(opt.value)"
              >
                <span class="w-2.5 h-2.5 rounded-full" [style.background]="opt.color"></span>
                <span class="text-xs font-bold mt-1" [style.color]="opt.color">{{ opt.label }}</span>
                <span class="text-xs text-center leading-tight" style="color: var(--text-muted);">{{ opt.sublabel }}</span>
              </button>
            }
          </div>
          @if (f['nivelUrgencia'].invalid && f['nivelUrgencia'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná un nivel</span>
          }
        </div>

        <!-- Descripción / síntomas -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Descripción / síntomas *</label>
          <textarea
            formControlName="descripcionSintomas"
            rows="2"
            placeholder="Describí los síntomas o motivo de la llamada..."
            class="rounded-btn px-3 py-2 text-sm w-full resize-none"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          ></textarea>
          @if (f['descripcionSintomas'].invalid && f['descripcionSintomas'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
          }
        </div>

        <!-- Dirección (oculta para ORIENTACION_TELEFONICA) -->
        @if (f['tipoAsistencia'].value !== 'ORIENTACION_TELEFONICA') {
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

          <div class="flex flex-col gap-1.5">
            <label class="eyebrow">Nota de dirección</label>
            <input
              type="text"
              formControlName="notaDireccion"
              placeholder="Piso, depto, referencia..."
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>
        }

        <!-- Paciente -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Paciente</label>

          <!-- Checkbox no afiliado -->
          <label class="flex items-center gap-2 text-sm cursor-pointer" style="color: var(--text-secondary);">
            <input
              type="checkbox"
              formControlName="noAfiliado"
              class="rounded"
            />
            Paciente no registrado
          </label>

          @if (!f['noAfiliado'].value) {
            <!-- Paciente registrado: búsqueda futura, por ahora campo libre -->
            <input
              type="text"
              formControlName="pacienteBusqueda"
              placeholder="Nombre del paciente (búsqueda próximamente)"
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          } @else {
            <!-- Datos de paciente no afiliado -->
            <div class="grid grid-cols-2 gap-2">
              <input
                type="text"
                formControlName="pacienteNombre"
                placeholder="Nombre"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="text"
                formControlName="pacienteApellido"
                placeholder="Apellido"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="text"
                formControlName="pacienteDni"
                placeholder="DNI"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="tel"
                formControlName="pacienteTelefono"
                placeholder="Teléfono"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
            </div>
          }
        </div>

        <!-- Nota operador -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Nota del operador</label>
          <textarea
            formControlName="notaOperador"
            rows="2"
            placeholder="Información adicional para el equipo..."
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

  readonly tiposAsistencia = TIPOS_ASISTENCIA;
  readonly nivelesUrgencia = NIVELES_URGENCIA;

  form = this.fb.group({
    tipoAsistencia:    ['' as TipoAsistencia | '', Validators.required],
    nivelUrgencia:     ['' as NivelUrgencia | '',  Validators.required],
    descripcionSintomas: ['', [Validators.required, Validators.minLength(1)]],
    direccion:         [''],
    notaDireccion:     [''],
    noAfiliado:        [false],
    pacienteBusqueda:  [''],
    pacienteNombre:    [''],
    pacienteApellido:  [''],
    pacienteDni:       [''],
    pacienteTelefono:  [''],
    notaOperador:      [''],
  });

  get f() {
    return this.form.controls;
  }

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
    const tipo = val.tipoAsistencia as TipoAsistencia;
    const noAfiliado = !!val.noAfiliado;

    const req: CrearTicketRequest = {
      tipoAsistencia:      tipo,
      nivelUrgencia:       val.nivelUrgencia as NivelUrgencia,
      descripcionSintomas: val.descripcionSintomas!,
    };

    if (tipo !== 'ORIENTACION_TELEFONICA') {
      req.direccion = val.direccion || undefined;
      if (val.notaDireccion) req.notaDireccion = val.notaDireccion;
    }

    if (noAfiliado) {
      req.noAfiliado       = true;
      req.pacienteNombre   = val.pacienteNombre   || undefined;
      req.pacienteApellido = val.pacienteApellido || undefined;
      req.pacienteDni      = val.pacienteDni      || undefined;
      req.pacienteTelefono = val.pacienteTelefono || undefined;
    }

    if (val.notaOperador) req.notaOperador = val.notaOperador;

    this.created.emit(req);
  }
}
