import { Component, input, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import {
  InternacionDomiciliariaDTO,
  AutorizacionInternacionDTO,
  EstadoAutorizacion,
} from '../../../../data-access/dto/internacion.dto';

@Component({
  selector: 'emx-autorizaciones-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="max-w-3xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Autorizaciones</h2>
        <button (click)="showCreate.set(!showCreate())"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style="background: var(--accent-emerald); color: #fff">
          {{ showCreate() ? 'Cancelar' : '+ Solicitar Autorización' }}
        </button>
      </div>

      @if (msg()) {
        <div class="p-3 rounded-lg text-sm mb-4" [style.background]="msgError() ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
          [style.color]="msgError() ? 'var(--accent-red)' : 'var(--accent-emerald)'">{{ msg() }}</div>
      }

      <!-- Create form -->
      @if (showCreate()) {
        <form [formGroup]="form" (ngSubmit)="solicitar()"
          class="rounded-xl p-5 mb-6 space-y-4"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
          <h3 class="text-sm font-semibold" style="color: var(--text-primary)">Solicitar Autorización</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Obra Social ID *</label>
              <input type="number" formControlName="obraSocialId" placeholder="ID"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Nro Autorización</label>
              <input type="text" formControlName="numeroAutorizacion" placeholder="Opcional"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Vigencia Desde *</label>
              <input type="date" formControlName="fechaVigenciaDesde"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Vigencia Hasta *</label>
              <input type="date" formControlName="fechaVigenciaHasta"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Observaciones</label>
            <textarea formControlName="observaciones" rows="2" placeholder="Notas..."
              class="rounded-lg px-3 py-2 text-sm w-full resize-none"
              style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
          </div>
          <div class="flex justify-end">
            <button type="submit" [disabled]="form.invalid || submitting()"
              class="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style="background: var(--accent-emerald); color: #fff">
              @if (submitting()) { <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> }
              Solicitar
            </button>
          </div>
        </form>
      }

      <!-- Authorization cards -->
      @if (autorizaciones().length === 0 && !showCreate()) {
        <div class="rounded-xl p-8 text-center border border-dashed"
          style="background: var(--surface-glass); border-color: var(--border-glass)">
          <p style="color: var(--text-muted)">No hay autorizaciones registradas</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (a of autorizaciones(); track a.id) {
            <div class="rounded-xl p-5" style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium" style="color: var(--text-primary)">
                      {{ a.numeroAutorizacion || 'S/N' }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                      [style.background]="estadoColor(a.estado)" style="color: #fff">{{ a.estado }}</span>
                  </div>
                  <p class="text-sm mt-1" style="color: var(--text-secondary)">
                    Obra Social #{{ a.obraSocial?.id }}
                  </p>
                </div>
              </div>

              <!-- Vigencia progress -->
              @if (a.fechaVigenciaDesde && a.fechaVigenciaHasta) {
                <div class="mb-3">
                  <div class="flex justify-between text-xs mb-1" style="color: var(--text-muted)">
                    <span>{{ a.fechaVigenciaDesde | date:'dd/MM/yy' }}</span>
                    <span>{{ a.fechaVigenciaHasta | date:'dd/MM/yy' }}</span>
                  </div>
                  <div class="h-1.5 rounded-full" style="background: var(--surface-inset)">
                    <div class="h-full rounded-full transition-all"
                      [style.width.%]="vigenciaPct(a)"
                      [style.background]="vigenciaColor(a)"></div>
                  </div>
                </div>
              }

              <div class="text-xs space-y-0.5 mb-3" style="color: var(--text-muted)">
                @if (a.diasAutorizados) { <div>Días: {{ a.diasAutorizados }}</div> }
                @if (a.topeImporte) { <div>Tope: {{ 'ARS $' + a.topeImporte }}</div> }
              </div>

              <!-- Actions -->
              @if (a.estado === 'SOLICITADA') {
                <div class="flex gap-2 pt-3 border-t" style="border-color: var(--border-glass)">
                  <button (click)="openAprobar(a)"
                    class="flex-1 px-3 py-1.5 rounded text-xs font-medium"
                    style="background: var(--accent-emerald); color: #fff">Aprobar</button>
                  <button (click)="openRechazar(a)"
                    class="flex-1 px-3 py-1.5 rounded text-xs font-medium"
                    style="background: var(--accent-red); color: #fff">Rechazar</button>
                </div>
              }
              @if (a.estado === 'AUTORIZADA') {
                <div class="pt-3 border-t" style="border-color: var(--border-glass)">
                  <button (click)="marcarVencida(a.id!)"
                    class="px-3 py-1.5 rounded text-xs font-medium"
                    style="background: transparent; border: 1px solid var(--text-muted); color: var(--text-muted)">Marcar Vencida</button>
                </div>
              }

              <!-- Aprobar/Rechazar inline forms -->
              @if (actionTarget() === a.id && actionMode() === 'aprobar') {
                <form [formGroup]="aprobarForm" (ngSubmit)="aprobar(a.id!)" class="mt-3 pt-3 border-t space-y-3" style="border-color: var(--border-glass)">
                  <div class="grid grid-cols-2 gap-3">
                    <input type="text" formControlName="numeroAutorizacion" placeholder="Nro Autorización *"
                      class="rounded px-2 py-1 text-xs"
                      style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                    <input type="number" formControlName="diasAutorizados" placeholder="Días autorizados"
                      class="rounded px-2 py-1 text-xs"
                      style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <input type="date" formControlName="fechaVigenciaDesde"
                      class="rounded px-2 py-1 text-xs w-full"
                      style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                    <input type="date" formControlName="fechaVigenciaHasta"
                      class="rounded px-2 py-1 text-xs w-full"
                      style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                  </div>
                  <input type="number" formControlName="topeImporte" placeholder="Tope importe (ARS)"
                    class="rounded px-2 py-1 text-xs w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                  <div class="flex gap-2">
                    <button type="submit" class="px-3 py-1 rounded text-xs font-medium"
                      style="background: var(--accent-emerald); color: #fff">Confirmar Aprobación</button>
                    <button type="button" (click)="actionTarget.set(null)" class="px-3 py-1 rounded text-xs"
                      style="color: var(--text-muted)">Cancelar</button>
                  </div>
                </form>
              }
              @if (actionTarget() === a.id && actionMode() === 'rechazar') {
                <form [formGroup]="rechazarForm" (ngSubmit)="rechazar(a.id!)" class="mt-3 pt-3 border-t space-y-2" style="border-color: var(--border-glass)">
                  <textarea formControlName="motivo" rows="2" placeholder="Motivo del rechazo *"
                    class="rounded px-2 py-1 text-xs w-full resize-none"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"></textarea>
                  <div class="flex gap-2">
                    <button type="submit" class="px-3 py-1 rounded text-xs font-medium"
                      style="background: var(--accent-red); color: #fff">Confirmar Rechazo</button>
                    <button type="button" (click)="actionTarget.set(null)" class="px-3 py-1 rounded text-xs"
                      style="color: var(--text-muted)">Cancelar</button>
                  </div>
                </form>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AutorizacionesTabComponent implements OnInit {
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  autorizaciones = signal<AutorizacionInternacionDTO[]>([]);
  showCreate = signal(false);
  submitting = signal(false);
  msg = signal<string | null>(null);
  msgError = signal(false);
  actionTarget = signal<number | null>(null);
  actionMode = signal<'aprobar' | 'rechazar' | null>(null);

  form = this.fb.nonNullable.group({
    obraSocialId: [0, [Validators.required, Validators.min(1)]],
    numeroAutorizacion: [''],
    fechaVigenciaDesde: ['', Validators.required],
    fechaVigenciaHasta: ['', Validators.required],
    observaciones: [''],
  });

  aprobarForm = this.fb.nonNullable.group({
    numeroAutorizacion: ['', Validators.required],
    fechaVigenciaDesde: ['', Validators.required],
    fechaVigenciaHasta: ['', Validators.required],
    diasAutorizados: [0],
    topeImporte: [0],
  });

  rechazarForm = this.fb.nonNullable.group({
    motivo: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.listarAutorizaciones(this.internacion().id).subscribe({
      next: (data) => this.autorizaciones.set(data ?? []),
    });
  }

  solicitar(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const f = this.form.getRawValue();
    this.api.solicitarAutorizacion(this.internacion().id, {
      obraSocial: { id: f.obraSocialId },
      numeroAutorizacion: f.numeroAutorizacion || undefined,
      fechaVigenciaDesde: f.fechaVigenciaDesde,
      fechaVigenciaHasta: f.fechaVigenciaHasta,
      observaciones: f.observaciones || undefined,
      estado: 'SOLICITADA',
    }).subscribe({
      next: () => { this.submitting.set(false); this.showCreate.set(false); this.load(); },
      error: (err) => { this.submitting.set(false); this.msg.set(err?.error?.detail ?? 'Error'); this.msgError.set(true); },
    });
  }

  openAprobar(a: AutorizacionInternacionDTO): void {
    this.actionTarget.set(a.id!);
    this.actionMode.set('aprobar');
    this.aprobarForm.patchValue({
      numeroAutorizacion: a.numeroAutorizacion ?? '',
      fechaVigenciaDesde: a.fechaVigenciaDesde ?? '',
      fechaVigenciaHasta: a.fechaVigenciaHasta ?? '',
      diasAutorizados: a.diasAutorizados ?? 0,
      topeImporte: a.topeImporte ?? 0,
    });
  }

  openRechazar(a: AutorizacionInternacionDTO): void {
    this.actionTarget.set(a.id!);
    this.actionMode.set('rechazar');
    this.rechazarForm.reset({ motivo: '' });
  }

  aprobar(id: number): void {
    if (this.aprobarForm.invalid) return;
    this.api.aprobarAutorizacion(id, this.aprobarForm.getRawValue()).subscribe({
      next: () => { this.actionTarget.set(null); this.load(); },
      error: (err) => { this.msg.set(err?.error?.detail ?? 'Error'); this.msgError.set(true); },
    });
  }

  rechazar(id: number): void {
    if (this.rechazarForm.invalid) return;
    this.api.rechazarAutorizacion(id, this.rechazarForm.getRawValue()).subscribe({
      next: () => { this.actionTarget.set(null); this.load(); },
      error: (err) => { this.msg.set(err?.error?.detail ?? 'Error'); this.msgError.set(true); },
    });
  }

  marcarVencida(id: number): void {
    this.api.marcarVencidaAutorizacion(id).subscribe({
      next: () => this.load(),
      error: (err) => { this.msg.set(err?.error?.detail ?? 'Error'); this.msgError.set(true); },
    });
  }

  estadoColor(e: EstadoAutorizacion): string {
    const m: Record<string, string> = {
      SOLICITADA: 'var(--accent-blue)', AUTORIZADA: 'var(--accent-emerald)',
      RECHAZADA: 'var(--accent-red)', VENCIDA: 'var(--text-muted)', AGOTADA: 'var(--accent-amber)',
    };
    return m[e] ?? 'var(--text-muted)';
  }

  vigenciaPct(a: AutorizacionInternacionDTO): number {
    if (!a.fechaVigenciaDesde || !a.fechaVigenciaHasta) return 0;
    const from = new Date(a.fechaVigenciaDesde).getTime();
    const to = new Date(a.fechaVigenciaHasta).getTime();
    const now = Date.now();
    if (now < from) return 0;
    if (now > to) return 100;
    return ((now - from) / (to - from)) * 100;
  }

  vigenciaColor(a: AutorizacionInternacionDTO): string {
    const pct = this.vigenciaPct(a);
    if (pct > 85) return 'var(--accent-red)';
    if (pct > 60) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  }
}
