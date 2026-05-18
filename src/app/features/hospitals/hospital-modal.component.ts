import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HospitalApiService } from '../../data-access/api/hospital.api';
import { HospitalDTO } from '../../data-access/dto/hospital.dto';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';

@Component({
  selector: 'emx-hospital-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell [title]="isEdit() ? 'Editar Hospital' : 'Nuevo Hospital'" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4" style="max-height: 70vh; overflow-y: auto; padding-right: 4px;">
        
        <!-- Nombre -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Nombre *
          </label>
          <input
            type="text"
            formControlName="nombre"
            placeholder="Hospital Central..."
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none; transition: border-color 0.15s;"
            onfocus="this.style.borderColor='var(--accent-blue)'"
            onblur="this.style.borderColor='var(--border-glass)'"
          />
          @if (f['nombre'].invalid && f['nombre'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">El nombre es requerido</span>
          }
        </div>

        <!-- CUIT y Tipo -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              CUIT
            </label>
            <input
              type="text"
              formControlName="cuit"
              placeholder="30-12345678-9"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Tipo
            </label>
            <select
              formControlName="tipo"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            >
              <option value="HOSPITAL" style="background: var(--bg-deep);">Hospital</option>
              <option value="CLINICA" style="background: var(--bg-deep);">Clínica</option>
              <option value="SANATORIO" style="background: var(--bg-deep);">Sanatorio</option>
            </select>
          </div>
        </div>

        <!-- Nivel y Estado -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Nivel de Complejidad
            </label>
            <select
              formControlName="nivel"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            >
              <option value="ALTA_COMPLEJIDAD" style="background: var(--bg-deep);">Alta Complejidad</option>
              <option value="MEDIA_COMPLEJIDAD" style="background: var(--bg-deep);">Media Complejidad</option>
              <option value="BAJA_COMPLEJIDAD" style="background: var(--bg-deep);">Baja Complejidad</option>
            </select>
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Estado Operativo
            </label>
            <select
              formControlName="estado"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            >
              <option value="DISPONIBLE" style="background: var(--bg-deep);">Disponible</option>
              <option value="LIMITADO" style="background: var(--bg-deep);">Limitado</option>
              <option value="SATURADO" style="background: var(--bg-deep);">Saturado</option>
            </select>
          </div>
        </div>

        <!-- Dirección y Ciudad -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Dirección
            </label>
            <input
              type="text"
              formControlName="direccion"
              placeholder="Av. Rivadavia 1234"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Ciudad
            </label>
            <input
              type="text"
              formControlName="ciudad"
              placeholder="CABA"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
        </div>

        <!-- Provincia y Teléfono -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Provincia
            </label>
            <input
              type="text"
              formControlName="provincia"
              placeholder="Buenos Aires"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Teléfono
            </label>
            <input
              type="text"
              formControlName="telefono"
              placeholder="011 4321-8765"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
        </div>

        <!-- Latitud y Longitud -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Latitud
            </label>
            <input
              type="number"
              step="any"
              formControlName="latitud"
              placeholder="-24.1878"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Longitud
            </label>
            <input
              type="number"
              step="any"
              formControlName="longitud"
              placeholder="-65.3056"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
        </div>

        <!-- Ocupación Urgencias y Espera -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Ocupación Urgencias (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              formControlName="ocupacionUrgencias"
              placeholder="70"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Espera Estimada (min)
            </label>
            <input
              type="number"
              min="0"
              formControlName="tiempoEsperaMin"
              placeholder="45"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
        </div>

        <!-- Código de Establecimiento -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Código de Establecimiento
          </label>
          <input
            type="text"
            formControlName="codigoEstablecimiento"
            placeholder="EST-9982"
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
          />
        </div>

        <!-- Especialidades -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
            Especialidades (separadas por coma)
          </label>
          <input
            type="text"
            formControlName="especialidades"
            placeholder="Guardia General, Pediatría, Maternidad..."
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
          />
        </div>

        <!-- Checkbox: En Derivación / Desvío Activo -->
        <div class="flex items-center gap-2" style="margin-top: 4px;">
          <input
            type="checkbox"
            id="enDerivacion"
            formControlName="enDerivacion"
            style="width: 16px; height: 16px; accent-color: var(--accent-blue);"
          />
          <label for="enDerivacion" class="text-xs font-semibold uppercase tracking-wider cursor-pointer" style="color: var(--text-secondary); user-select: none;">
            Activar bypass / desvío de ambulancias
          </label>
        </div>

        @if (errorMsg()) {
          <p class="text-xs" style="color: var(--accent-red); margin-top: 8px;">{{ errorMsg() }}</p>
        }
      </form>

      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cancelar</button>
        <button
          type="submit"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid || saving()"
          (click)="submit()"
        >{{ saving() ? 'Guardando…' : (isEdit() ? 'Guardar Cambios' : 'Crear Hospital') }}</button>
      </div>
    </emx-modal-shell>
  `,
})
export class HospitalModalComponent implements OnInit {
  hospital = input<HospitalDTO | null>(null);
  
  saved = output<void>();
  closed = output<void>();

  private hospitalApi = inject(HospitalApiService);
  private fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly isEdit = signal(false);

  form = this.fb.group({
    nombre: ['', Validators.required],
    cuit: [''],
    tipo: ['HOSPITAL'],
    direccion: [''],
    ciudad: [''],
    provincia: [''],
    telefono: [''],
    codigoEstablecimiento: [''],
    activo: [true],
    nivel: ['BAJA_COMPLEJIDAD'],
    latitud: [null as number | null],
    longitud: [null as number | null],
    estado: ['DISPONIBLE'],
    ocupacionUrgencias: [0],
    tiempoEsperaMin: [0],
    especialidades: [''],
    enDerivacion: [false]
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    const h = this.hospital();
    if (h) {
      this.isEdit.set(true);
      this.form.patchValue({
        nombre: h.nombre,
        cuit: h.cuit || '',
        tipo: h.tipo || 'HOSPITAL',
        direccion: h.direccion || '',
        ciudad: h.ciudad || '',
        provincia: h.provincia || '',
        telefono: h.telefono || '',
        codigoEstablecimiento: h.codigoEstablecimiento || '',
        activo: h.activo ?? true,
        nivel: h.nivel || 'BAJA_COMPLEJIDAD',
        latitud: h.latitud ?? null,
        longitud: h.longitud ?? null,
        estado: h.estado || 'DISPONIBLE',
        ocupacionUrgencias: h.ocupacionUrgencias ?? 0,
        tiempoEsperaMin: h.tiempoEsperaMin ?? 0,
        especialidades: h.especialidades || '',
        enDerivacion: h.enDerivacion ?? false
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMsg.set(null);

    const val = this.form.value;
    const dto: HospitalDTO = {
      id: this.hospital()?.id || (undefined as any),
      nombre: val.nombre!,
      cuit: val.cuit || undefined,
      tipo: val.tipo || undefined,
      direccion: val.direccion || undefined,
      ciudad: val.ciudad || undefined,
      provincia: val.provincia || undefined,
      telefono: val.telefono || undefined,
      codigoEstablecimiento: val.codigoEstablecimiento || undefined,
      activo: val.activo ?? true,
      nivel: val.nivel || undefined,
      latitud: val.latitud != null ? Number(val.latitud) : undefined,
      longitud: val.longitud != null ? Number(val.longitud) : undefined,
      estado: val.estado as any || undefined,
      ocupacionUrgencias: val.ocupacionUrgencias != null ? Number(val.ocupacionUrgencias) : undefined,
      tiempoEsperaMin: val.tiempoEsperaMin != null ? Number(val.tiempoEsperaMin) : undefined,
      especialidades: val.especialidades || undefined,
      enDerivacion: !!val.enDerivacion
    };

    const action$ = this.isEdit()
      ? this.hospitalApi.actualizar(this.hospital()!.id, dto)
      : this.hospitalApi.crear(dto);

    action$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.errorMsg.set('Ocurrió un error al procesar la solicitud. Verificá los datos.');
      }
    });
  }
}
