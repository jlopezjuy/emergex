import { Component, OnInit, input, output, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ObrasSocialesApiService } from '../../data-access/api/obras-sociales.api';
import { ObraSocialDTO } from '../../data-access/dto/obra-social.dto';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'emx-obra-social-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell [title]="isEdit() ? 'Editar Obra Social' : 'Nueva Obra Social'" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">

        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">Nombre *</label>
          <input
            type="text"
            formControlName="nombre"
            placeholder="OSDE, Swiss Medical, ISJ..."
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
          />
          @if (f['nombre'].invalid && f['nombre'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">El nombre es requerido</span>
          }
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">CUIT</label>
            <input
              type="text"
              formControlName="cuit"
              placeholder="30-12345678-9"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">Código RNOS</label>
            <input
              type="text"
              formControlName="codigoRNOS"
              placeholder="Ej: 101234"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">Teléfono</label>
            <input
              type="text"
              formControlName="telefono"
              placeholder="0800-333-1234"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">Email</label>
            <input
              type="email"
              formControlName="email"
              placeholder="contacto@obrasocial.com.ar"
              class="rounded px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">Sitio web</label>
          <input
            type="text"
            formControlName="sitioWeb"
            placeholder="https://..."
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">Dirección</label>
          <input
            type="text"
            formControlName="direccion"
            placeholder="Av. Siempre Viva 742"
            class="rounded px-3 py-2 text-sm w-full"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
          />
        </div>

        <div class="flex items-center gap-2" style="margin-top: 4px;">
          <input
            type="checkbox"
            id="obraSocialActiva"
            formControlName="activa"
            style="width: 16px; height: 16px; accent-color: var(--accent-blue);"
          />
          <label for="obraSocialActiva" class="text-xs font-semibold uppercase tracking-wider cursor-pointer" style="color: var(--text-secondary); user-select: none;">
            Activa
          </label>
        </div>

        @if (errorMsg()) {
          <p class="text-xs" style="color: var(--accent-red); margin-top: 8px;">{{ errorMsg() }}</p>
        }
      </form>

      <div footer class="flex gap-2">
        <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid || saving()"
          (click)="submit()"
        >{{ saving() ? 'Guardando…' : (isEdit() ? 'Guardar Cambios' : 'Crear Obra Social') }}</button>
      </div>
    </emx-modal-shell>
  `,
})
export class ObraSocialModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  obraSocial = input<ObraSocialDTO | null>(null);

  saved = output<void>();
  closed = output<void>();

  private api = inject(ObrasSocialesApiService);
  private fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly isEdit = signal(false);

  form = this.fb.group({
    nombre: ['', Validators.required],
    cuit: [''],
    codigoRNOS: [''],
    telefono: [''],
    email: [''],
    sitioWeb: [''],
    direccion: [''],
    activa: [true],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    const os = this.obraSocial();
    if (os) {
      this.isEdit.set(true);
      this.form.patchValue({
        nombre: os.nombre,
        cuit: os.cuit || '',
        codigoRNOS: os.codigoRNOS || '',
        telefono: os.telefono || '',
        email: os.email || '',
        sitioWeb: os.sitioWeb || '',
        direccion: os.direccion || '',
        activa: os.activa ?? true,
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
    const dto: ObraSocialDTO = {
      id: this.obraSocial()?.id,
      nombre: val.nombre!,
      cuit: val.cuit || undefined,
      codigoRNOS: val.codigoRNOS || undefined,
      telefono: val.telefono || undefined,
      email: val.email || undefined,
      sitioWeb: val.sitioWeb || undefined,
      direccion: val.direccion || undefined,
      activa: val.activa ?? true,
    };

    const action$ = this.isEdit() ? this.api.update(dto) : this.api.create(dto);

    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.detail ?? 'Ocurrió un error al guardar. Verificá los datos.');
      },
    });
  }
}
