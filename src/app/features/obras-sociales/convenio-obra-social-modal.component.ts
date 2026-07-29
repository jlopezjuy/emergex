import { Component, OnInit, input, output, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { ConvenioObraSocialApiService } from '../../data-access/api/convenio-obra-social.api';
import { ObraSocialDTO } from '../../data-access/dto/obra-social.dto';
import { ConvenioObraSocialDTO, EstadoContratoConvenio } from '../../data-access/dto/convenio-obra-social.dto';

const ESTADOS: { value: EstadoContratoConvenio; label: string }[] = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
  { value: 'EN_RENEGOCIACION', label: 'En renegociación' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'RESCINDIDO', label: 'Rescindido' },
  { value: 'ANULADO', label: 'Anulado' },
];

@Component({
  selector: 'emx-convenio-obra-social-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent],
  template: `
    <emx-modal-shell [title]="'Convenios con ' + obraSocial().nombre" [maxWidthClass]="'max-w-2xl'" (closed)="closed.emit()">
      <div class="flex flex-col gap-4" style="max-height: 65vh; overflow-y: auto; padding-right: 4px;">

        @if (loading()) {
          <span class="text-xs" style="color: var(--text-muted);" role="status">Cargando convenios...</span>
        }

        @if (!loading() && convenios().length === 0) {
          <div class="rounded-btn p-4 text-center text-sm" style="background: var(--surface-glass); border: 1px dashed var(--border-glass); color: var(--text-muted);">
            Esta empresa todavía no tiene convenios cargados con esta obra social.
          </div>
        }

        @for (c of convenios(); track c.id) {
          <div class="flex flex-col gap-1.5 rounded-btn p-3" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 flex-wrap">
                @if (c.codigo) {
                  <span class="font-medium text-sm font-mono" style="color: var(--text-primary);">{{ c.codigo }}</span>
                }
                <span class="text-xs px-2 py-0.5 rounded font-semibold" [style.background]="estadoBg(c.estadoContrato)" [style.color]="estadoColor(c.estadoContrato)">
                  {{ estadoLabel(c.estadoContrato) }}
                </span>
              </div>
              <span class="text-xs" style="color: var(--text-secondary);">
                {{ c.vigenciaDesde }}<span style="color: var(--text-muted);"> → </span>{{ c.vigenciaHasta || 'sin vencimiento' }}
              </span>
            </div>
            @if (c.condicionesParticulares) {
              <span class="text-xs" style="color: var(--text-muted);">{{ c.condicionesParticulares }}</span>
            }
          </div>
        }

        <!-- Alta de convenio nuevo -->
        <form [formGroup]="nuevoConvenioForm" (ngSubmit)="crearConvenio()" class="flex flex-col gap-2 rounded-btn p-3" style="background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.3);">
          <span class="eyebrow">Agregar convenio</span>

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <label class="eyebrow">Vigencia desde *</label>
              <input
                type="date"
                formControlName="vigenciaDesde"
                class="rounded-btn px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="eyebrow">Vigencia hasta</label>
              <input
                type="date"
                formControlName="vigenciaHasta"
                placeholder="Sin vencimiento"
                class="rounded-btn px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <label class="eyebrow">Código</label>
              <input
                type="text"
                formControlName="codigo"
                placeholder="Opcional"
                class="rounded-btn px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="eyebrow">Estado</label>
              <select
                formControlName="estadoContrato"
                class="rounded-btn px-3 py-2 text-sm w-full"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
              >
                @for (e of estados; track e.value) {
                  <option [value]="e.value">{{ e.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="eyebrow">Condiciones particulares</label>
            <textarea
              formControlName="condicionesParticulares"
              rows="2"
              placeholder="Notas del convenio..."
              class="rounded-btn px-3 py-2 text-sm w-full resize-none"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary); outline: none;"
            ></textarea>
          </div>

          @if (createError()) {
            <span class="text-xs" style="color: var(--error-text, #EF4444);">{{ createError() }}</span>
          }

          <div class="flex justify-end">
            <button type="submit" class="btn btn--primary btn--sm" [disabled]="nuevoConvenioForm.invalid || creating()">
              {{ creating() ? 'Agregando...' : 'Agregar convenio' }}
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
export class ConvenioObraSocialModalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ConvenioObraSocialApiService);
  private fb = inject(FormBuilder);

  obraSocial = input.required<ObraSocialDTO>();
  closed = output<void>();

  readonly estados = ESTADOS;

  readonly loading = signal(false);
  readonly convenios = signal<ConvenioObraSocialDTO[]>([]);

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  nuevoConvenioForm = this.fb.group({
    vigenciaDesde: [new Date().toISOString().split('T')[0], Validators.required],
    vigenciaHasta: [''],
    codigo: [''],
    estadoContrato: ['ACTIVO' as EstadoContratoConvenio, Validators.required],
    condicionesParticulares: [''],
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
        this.convenios.set(data);
        this.loading.set(false);
      });
  }

  crearConvenio(): void {
    if (this.nuevoConvenioForm.invalid) return;
    const obraSocialId = this.obraSocial().id;
    if (!obraSocialId) return;

    this.creating.set(true);
    this.createError.set(null);
    const val = this.nuevoConvenioForm.value;
    this.api
      .create({
        vigenciaDesde: val.vigenciaDesde!,
        vigenciaHasta: val.vigenciaHasta || undefined,
        codigo: val.codigo || undefined,
        estadoContrato: val.estadoContrato!,
        condicionesParticulares: val.condicionesParticulares || undefined,
        obraSocial: { id: obraSocialId },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.nuevoConvenioForm.patchValue({ codigo: '', condicionesParticulares: '' });
          this.load();
        },
        error: (err) => {
          this.creating.set(false);
          this.createError.set(err?.error?.detail ?? 'No se pudo crear el convenio.');
        },
      });
  }

  estadoLabel(e: EstadoContratoConvenio): string {
    return this.estados.find((x) => x.value === e)?.label ?? e;
  }

  estadoBg(e: EstadoContratoConvenio): string {
    if (e === 'ACTIVO') return 'rgba(16,185,129,0.12)';
    if (e === 'SUSPENDIDO' || e === 'EN_RENEGOCIACION') return 'rgba(245,158,11,0.12)';
    if (e === 'VENCIDO' || e === 'RESCINDIDO' || e === 'ANULADO') return 'rgba(239,68,68,0.12)';
    return 'rgba(148,163,184,0.12)';
  }

  estadoColor(e: EstadoContratoConvenio): string {
    if (e === 'ACTIVO') return '#10B981';
    if (e === 'SUSPENDIDO' || e === 'EN_RENEGOCIACION') return '#D97706';
    if (e === 'VENCIDO' || e === 'RESCINDIDO' || e === 'ANULADO') return '#EF4444';
    return '#94A3B8';
  }
}
