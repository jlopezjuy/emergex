import { Component, input, inject, signal, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO } from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-adjuntos-tab',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="max-w-2xl">
      <h2 class="text-lg font-semibold mb-6" style="color: var(--text-primary)">Adjuntos y Consentimientos</h2>

      @if (msg()) {
        <div class="p-3 rounded-lg text-sm mb-4" [style.background]="msgError() ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
          [style.color]="msgError() ? 'var(--accent-red)' : 'var(--accent-emerald)'">{{ msg() }}</div>
      }

      <!-- Vincular Archivo -->
      <div class="rounded-xl p-5 mb-6" style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary)">Archivos Adjuntos</h3>
        <form [formGroup]="adjuntoForm" (ngSubmit)="vincularAdjunto()" class="flex gap-3 items-end">
          <div class="flex-1 flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">ID del Archivo</label>
            <input type="number" formControlName="archivoId" placeholder="Ej: 42"
              class="rounded-lg px-3 py-2 text-sm w-full"
              style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
          </div>
          <button type="submit" [disabled]="adjuntoForm.invalid"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--accent-emerald); color: #fff">
            Vincular
          </button>
        </form>

        @if (adjuntos().length > 0) {
          <div class="mt-4 space-y-2 pl-2 border-l-2" style="border-color: var(--border-glass)">
            @for (id of adjuntos(); track id) {
              <div class="flex items-center justify-between text-sm" style="color: var(--text-primary)">
                <span>📎 Archivo #{{ id }}</span>
                <button (click)="removeAdjunto(id)" class="text-xs" style="color: var(--accent-red)">×</button>
              </div>
            }
          </div>
        } @else {
          <p class="mt-3 text-sm" style="color: var(--text-muted)">Sin archivos vinculados</p>
        }
      </div>

      <!-- Vincular Consentimiento -->
      <div class="rounded-xl p-5" style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary)">Consentimientos Informados</h3>
        <form [formGroup]="consentForm" (ngSubmit)="vincularConsent()" class="flex gap-3 items-end">
          <div class="flex-1 flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">ID del Consentimiento</label>
            <input type="number" formControlName="consentimientoId" placeholder="Ej: 15"
              class="rounded-lg px-3 py-2 text-sm w-full"
              style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
          </div>
          <button type="submit" [disabled]="consentForm.invalid"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--accent-emerald); color: #fff">
            Vincular
          </button>
        </form>

        @if (consentimientos().length > 0) {
          <div class="mt-4 space-y-2 pl-2 border-l-2" style="border-color: var(--border-glass)">
            @for (id of consentimientos(); track id) {
              <div class="flex items-center justify-between text-sm" style="color: var(--text-primary)">
                <span>📝 Consentimiento #{{ id }}</span>
                <button (click)="removeConsent(id)" class="text-xs" style="color: var(--accent-red)">×</button>
              </div>
            }
          </div>
        } @else {
          <p class="mt-3 text-sm" style="color: var(--text-muted)">Sin consentimientos vinculados</p>
        }
      </div>
    </div>
  `,
})
export class AdjuntosTabComponent {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  adjuntos = signal<number[]>([]);
  consentimientos = signal<number[]>([]);
  msg = signal<string | null>(null);
  msgError = signal(false);

  adjuntoForm = this.fb.nonNullable.group({
    archivoId: [0, [Validators.required, Validators.min(1)]],
  });

  consentForm = this.fb.nonNullable.group({
    consentimientoId: [0, [Validators.required, Validators.min(1)]],
  });

  vincularAdjunto(): void {
    if (this.adjuntoForm.invalid) return;
    const id = this.adjuntoForm.getRawValue().archivoId;
    this.api.vincularAdjunto(this.internacion().id, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.adjuntos.update((l) => [...l, id]);
              this.adjuntoForm.reset({ archivoId: 0 });
              this.msg.set('Archivo vinculado'); this.msgError.set(false);
            },
            error: (err) => {
              this.msg.set(err?.error?.detail ?? 'Error'); this.msgError.set(true);
            },
          });
  }

  vincularConsent(): void {
    if (this.consentForm.invalid) return;
    const id = this.consentForm.getRawValue().consentimientoId;
    this.api.vincularConsentimiento(this.internacion().id, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.consentimientos.update((l) => [...l, id]);
              this.consentForm.reset({ consentimientoId: 0 });
              this.msg.set('Consentimiento vinculado'); this.msgError.set(false);
            },
            error: (err) => {
              this.msg.set(err?.error?.detail ?? 'Error'); this.msgError.set(true);
            },
          });
  }

  removeAdjunto(id: number): void {
    this.adjuntos.update((l) => l.filter((x) => x !== id));
  }

  removeConsent(id: number): void {
    this.consentimientos.update((l) => l.filter((x) => x !== id));
  }
}
