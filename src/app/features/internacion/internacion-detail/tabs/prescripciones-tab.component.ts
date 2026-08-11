import { Component, input, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import {
  InternacionDomiciliariaDTO,
  PrescripcionContinuaDTO,
} from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-prescripciones-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="max-w-3xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Prescripciones</h2>
        <button (click)="showCreate.set(!showCreate())"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style="background: var(--accent-emerald); color: #fff">
          {{ showCreate() ? 'Cancelar' : '+ Nueva Prescripción' }}
        </button>
      </div>

      @if (msg()) {
        <div class="p-3 rounded-lg text-sm mb-4" [style.background]="msgError() ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
          [style.color]="msgError() ? 'var(--accent-red)' : 'var(--accent-emerald)'">{{ msg() }}</div>
      }

      <!-- Create Form -->
      @if (showCreate()) {
        <form [formGroup]="createForm" (ngSubmit)="create()"
          class="rounded-xl p-5 mb-6 space-y-4"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
          <h3 class="text-sm font-semibold" style="color: var(--text-primary)">Nueva Prescripción</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Medicamento ID *</label>
              <input type="number" formControlName="medicamentoId" placeholder="ID"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Vía *</label>
              <select formControlName="via"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;">
                <option value="">Seleccionar...</option>
                <option value="Oral">Oral</option>
                <option value="IV">IV</option>
                <option value="IM">IM</option>
                <option value="SC">SC</option>
                <option value="Tópica">Tópica</option>
                <option value="Inhalatoria">Inhalatoria</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Dosis *</label>
              <input type="text" formControlName="dosis" placeholder="Ej: 500mg"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Frecuencia *</label>
              <input type="text" formControlName="frecuencia" placeholder="Ej: c/8hs"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Indicaciones</label>
            <textarea formControlName="indicaciones" rows="2" placeholder="Instrucciones adicionales..."
              class="rounded-lg px-3 py-2 text-sm w-full resize-none"
              style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
          </div>
          <div class="flex justify-end">
            <button type="submit" [disabled]="createForm.invalid || submitting()"
              class="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style="background: var(--accent-emerald); color: #fff">
              @if (submitting()) {
                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              }
              Crear Prescripción
            </button>
          </div>
        </form>
      }

      <!-- Prescription Cards -->
      @if (prescripciones().length === 0 && !showCreate()) {
        <div class="rounded-xl p-8 text-center border border-dashed"
          style="background: var(--surface-glass); border-color: var(--border-glass)">
          <p style="color: var(--text-muted)">No hay prescripciones activas</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (p of prescripciones(); track p.id) {
            <div class="rounded-xl p-5"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium" style="color: var(--text-primary)">
                      {{ p.medicamento?.nombreGenerico || 'Medicamento #' + p.medicamento?.id }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                      [style.background]="p.estado === 'ACTIVA' ? 'var(--accent-emerald)' : 'var(--accent-red)'"
                      style="color: #fff">{{ p.estado }}</span>
                  </div>
                  <p class="text-sm" style="color: var(--text-secondary)">
                    {{ p.dosis }} · {{ p.via }} · {{ p.frecuencia }}
                  </p>
                  <p class="text-xs mt-1" style="color: var(--text-muted)">
                    Desde {{ p.fechaInicio | date:'dd/MM/yy' }}
                    @if (p.fechaFin) { · Hasta {{ p.fechaFin | date:'dd/MM/yy' }} }
                  </p>
                </div>
                <div class="flex gap-2 shrink-0">
                  @if (p.estado === 'ACTIVA') {
                    <button (click)="showAdminister.set(p.id === showAdminister() ? null : p.id!)"
                      class="px-3 py-1.5 rounded text-xs font-medium"
                      style="background: var(--accent-blue); color: #fff">Registrar</button>
                    <button (click)="suspender(p.id!)"
                      class="px-3 py-1.5 rounded text-xs font-medium"
                      style="background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red)">Suspender</button>
                  }
                </div>
              </div>

              <!-- Administer inline -->
              @if (showAdminister() === p.id) {
                <form [formGroup]="adminForm" (ngSubmit)="administer(p.id!)" class="mt-4 pt-4 border-t space-y-3" style="border-color: var(--border-glass)">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Fecha/Hora</label>
                      <input type="datetime-local" formControlName="fechaHora"
                        class="rounded-lg px-3 py-2 text-sm w-full"
                        style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Observación</label>
                      <input type="text" formControlName="observacion" placeholder="Notas..."
                        class="rounded-lg px-3 py-2 text-sm w-full"
                        style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                    </div>
                  </div>
                  <div class="flex justify-end">
                    <button type="submit" class="px-4 py-1.5 rounded text-xs font-medium"
                      style="background: var(--accent-emerald); color: #fff">Confirmar</button>
                  </div>
                </form>
              }

              <!-- Administrations history -->
              @if ((p.administraciones?.length ?? 0) > 0) {
                <details class="mt-3">
                  <summary class="text-xs cursor-pointer" style="color: var(--text-muted)">
                    Historial ({{ p.administraciones!.length }})
                  </summary>
                  <div class="mt-2 space-y-1 pl-2 border-l-2" style="border-color: var(--border-glass)">
                    @for (a of p.administraciones; track a.id) {
                      <div class="text-xs flex justify-between" style="color: var(--text-secondary)">
                        <span>{{ a.fechaHora | date:'dd/MM HH:mm' }}</span>
                        <span style="color: var(--text-muted)">{{ a.observacion || '—' }}</span>
                      </div>
                    }
                  </div>
                </details>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PrescripcionesTabComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  prescripciones = signal<PrescripcionContinuaDTO[]>([]);
  showCreate = signal(false);
  showAdminister = signal<number | null>(null);
  submitting = signal(false);
  msg = signal<string | null>(null);
  msgError = signal(false);

  createForm = this.fb.nonNullable.group({
    medicamentoId: [0, [Validators.required, Validators.min(1)]],
    dosis: ['', Validators.required],
    via: ['', Validators.required],
    frecuencia: ['', Validators.required],
    indicaciones: [''],
  });

  adminForm = this.fb.nonNullable.group({
    fechaHora: [new Date().toISOString().slice(0, 16), Validators.required],
    observacion: [''],
  });

  ngOnInit(): void {
    this.load();
    this.adminForm.patchValue({ fechaHora: new Date().toISOString().slice(0, 16) });
  }

  private load(): void {
    this.api.getPrescripciones(this.internacion().id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.prescripciones.set(data ?? []),
          });
  }

  create(): void {
    if (this.createForm.invalid) return;
    this.submitting.set(true);
    const f = this.createForm.getRawValue();
    this.api.crearPrescripcion(this.internacion().id, {
            medicamento: { id: f.medicamentoId },
            dosis: f.dosis,
            via: f.via,
            frecuencia: f.frecuencia,
            indicaciones: f.indicaciones || undefined,
            fechaInicio: new Date().toISOString(),
            estado: 'ACTIVA',
          }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.submitting.set(false);
              this.showCreate.set(false);
              this.createForm.reset({ medicamentoId: 0, dosis: '', via: '', frecuencia: '', indicaciones: '' });
              this.load();
            },
            error: (err) => {
              this.submitting.set(false);
              this.msg.set(err?.error?.detail ?? 'Error');
              this.msgError.set(true);
            },
          });
  }

  suspender(id: number): void {
    this.api.suspenderPrescripcion(id, 'Suspensión manual').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.load(),
            error: (err) => {
              this.msg.set(err?.error?.detail ?? 'Error al suspender');
              this.msgError.set(true);
            },
          });
  }

  administer(prescripcionId: number): void {
    const f = this.adminForm.getRawValue();
    this.api.registrarAdministracion(prescripcionId, {
            fechaHora: f.fechaHora + ':00.000Z',
            observacion: f.observacion || undefined,
          }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.showAdminister.set(null);
              this.load();
            },
            error: (err) => {
              this.msg.set(err?.error?.detail ?? 'Error');
              this.msgError.set(true);
            },
          });
  }
}
