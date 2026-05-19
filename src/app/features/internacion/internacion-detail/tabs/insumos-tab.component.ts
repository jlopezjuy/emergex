import { Component, input, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO, InsumoDomiciliarioDTO } from '../../../../data-access/dto/internacion.dto';

@Component({
  selector: 'emx-insumos-tab',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Insumos</h2>
        <button (click)="showForm.set(!showForm())"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style="background: var(--accent-emerald); color: #fff">
          {{ showForm() ? 'Cancelar' : '+ Solicitar Insumo' }}
        </button>
      </div>

      @if (msg()) {
        <div class="p-3 rounded-lg text-sm mb-4" [style.background]="msgError() ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'"
          [style.color]="msgError() ? 'var(--accent-red)' : 'var(--accent-emerald)'">{{ msg() }}</div>
      }

      <!-- Solicitar form -->
      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="solicitar()"
          class="rounded-xl p-5 mb-6 space-y-4"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
          <h3 class="text-sm font-semibold" style="color: var(--text-primary)">Solicitar Insumo</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Producto ID *</label>
              <input type="number" formControlName="productoId" placeholder="ID"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Cantidad *</label>
              <input type="number" formControlName="cantidadRequerida" placeholder="1"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Lote</label>
              <input type="text" formControlName="lote" placeholder="Opcional"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Fecha Vencimiento</label>
              <input type="date" formControlName="fechaVencimiento"
                class="rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
            </div>
          </div>
          <div class="flex justify-end">
            <button type="submit" [disabled]="form.invalid || submitting()"
              class="px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style="background: var(--accent-emerald); color: #fff">
              @if (submitting()) {
                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              }
              Solicitar
            </button>
          </div>
        </form>
      }

      <!-- Insumos grid -->
      @if (insumos().length === 0 && !showForm()) {
        <div class="rounded-xl p-8 text-center border border-dashed"
          style="background: var(--surface-glass); border-color: var(--border-glass)">
          <p style="color: var(--text-muted)">No hay insumos registrados</p>
        </div>
      } @else {
        <div class="grid grid-cols-2 gap-4">
          @for (ins of insumos(); track ins.id) {
            <div class="rounded-xl p-4"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-sm" style="color: var(--text-primary)">
                  Producto #{{ ins.productoId }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  [style.background]="estadoColor(ins.estado)" style="color: #fff">{{ ins.estado }}</span>
              </div>
              <!-- Cantidades bar -->
              <div class="flex gap-1 mb-3">
                <div class="flex-1 h-2 rounded-full" [style.background]="'var(--surface-inset)'">
                  <div class="h-full rounded-full transition-all" style="background: var(--accent-blue)"
                    [style.width.%]="barWidth(ins.cantidadRequerida, maxCant(ins))"></div>
                </div>
                <div class="flex-1 h-2 rounded-full" [style.background]="'var(--surface-inset)'">
                  <div class="h-full rounded-full transition-all" style="background: var(--accent-amber)"
                    [style.width.%]="barWidth(ins.cantidadEntregada ?? 0, maxCant(ins))"></div>
                </div>
                <div class="flex-1 h-2 rounded-full" [style.background]="'var(--surface-inset)'">
                  <div class="h-full rounded-full transition-all" style="background: var(--accent-emerald)"
                    [style.width.%]="barWidth(ins.cantidadConsumida ?? 0, maxCant(ins))"></div>
                </div>
                <div class="flex-1 h-2 rounded-full" [style.background]="'var(--surface-inset)'">
                  <div class="h-full rounded-full transition-all" style="background: '#a855f7'"
                    [style.width.%]="barWidth(ins.cantidadDevuelta ?? 0, maxCant(ins))"></div>
                </div>
              </div>
              <div class="flex justify-between text-xs mb-3" style="color: var(--text-muted)">
                <span>Req: {{ ins.cantidadRequerida }}</span>
                <span>Ent: {{ ins.cantidadEntregada ?? 0 }}</span>
                <span>Con: {{ ins.cantidadConsumida ?? 0 }}</span>
                <span>Dev: {{ ins.cantidadDevuelta ?? 0 }}</span>
              </div>
              @if (ins.lote) {
                <div class="text-xs" style="color: var(--text-muted)">Lote: {{ ins.lote }}</div>
              }
              @if (ins.fechaVencimiento) {
                <div class="text-xs" style="color: var(--text-muted)">Vence: {{ ins.fechaVencimiento | date:'dd/MM/yy' }}</div>
              }
              <!-- Actions -->
              <div class="flex gap-2 mt-3 pt-3 border-t" style="border-color: var(--border-glass)">
                @if (ins.estado === 'SOLICITADO') {
                  <button (click)="entregar(ins)" class="flex-1 px-2 py-1.5 rounded text-xs font-medium"
                    style="background: var(--accent-amber); color: #fff">Entregar</button>
                }
                @if (ins.estado === 'ENTREGADO' || ins.estado === 'EN_USO') {
                  <button (click)="consumir(ins)" class="flex-1 px-2 py-1.5 rounded text-xs font-medium"
                    style="background: var(--accent-emerald); color: #fff">Consumir</button>
                  <button (click)="devolver(ins)" class="flex-1 px-2 py-1.5 rounded text-xs font-medium"
                    style="background: '#a855f7'; color: #fff">Devolver</button>
                }
              </div>
              <!-- Inline action form -->
              @if (actionTarget() === ins.id) {
                <form [formGroup]="actionForm" (ngSubmit)="executeAction(ins)" class="mt-3 pt-3 border-t space-y-2" style="border-color: var(--border-glass)">
                  <div class="flex gap-2">
                    <input type="number" formControlName="cantidad" placeholder="Cantidad"
                      class="flex-1 rounded px-2 py-1 text-xs"
                      style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;" />
                    <button type="submit" class="px-3 py-1 rounded text-xs font-medium"
                      style="background: var(--accent-emerald); color: #fff">OK</button>
                    <button type="button" (click)="actionTarget.set(null)" class="px-3 py-1 rounded text-xs"
                      style="color: var(--text-muted)">Cancel</button>
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
export class InsumosTabComponent {
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);
  private fb = inject(FormBuilder);

  insumos = signal<InsumoDomiciliarioDTO[]>([]);
  showForm = signal(false);
  submitting = signal(false);
  msg = signal<string | null>(null);
  msgError = signal(false);
  actionTarget = signal<number | null>(null);
  actionMode = signal<'entregar' | 'consumir' | 'devolver'>('entregar');

  form = this.fb.nonNullable.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    cantidadRequerida: [1, [Validators.required, Validators.min(1)]],
    lote: [''],
    fechaVencimiento: [''],
  });

  actionForm = this.fb.nonNullable.group({
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  solicitar(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const f = this.form.getRawValue();
    this.api.solicitarInsumo(this.internacion().id, {
      productoId: f.productoId,
      cantidadRequerida: f.cantidadRequerida,
      lote: f.lote || undefined,
      fechaVencimiento: f.fechaVencimiento || undefined,
      estado: 'SOLICITADO',
    }).subscribe({
      next: (data) => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.form.reset({ productoId: 0, cantidadRequerida: 1, lote: '', fechaVencimiento: '' });
        this.insumos.update((list) => [...list, data]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.msg.set(err?.error?.detail ?? 'Error');
        this.msgError.set(true);
      },
    });
  }

  entregar(ins: InsumoDomiciliarioDTO): void {
    this.actionTarget.set(ins.id!);
    this.actionMode.set('entregar');
    this.actionForm.patchValue({ cantidad: ins.cantidadRequerida });
  }

  consumir(ins: InsumoDomiciliarioDTO): void {
    this.actionTarget.set(ins.id!);
    this.actionMode.set('consumir');
    this.actionForm.patchValue({ cantidad: 1 });
  }

  devolver(ins: InsumoDomiciliarioDTO): void {
    this.actionTarget.set(ins.id!);
    this.actionMode.set('devolver');
    this.actionForm.patchValue({ cantidad: 1 });
  }

  executeAction(ins: InsumoDomiciliarioDTO): void {
    const cantidad = this.actionForm.getRawValue().cantidad;
    const mode = this.actionMode();
    const obs = mode === 'entregar'
      ? this.api.entregarInsumo(ins.id!, cantidad)
      : mode === 'consumir'
        ? this.api.consumirInsumo(ins.id!, cantidad)
        : this.api.devolverInsumo(ins.id!, cantidad, 'Devolución');

    obs.subscribe({
      next: (data) => {
        this.actionTarget.set(null);
        this.insumos.update((list) => list.map((i) => (i.id === data.id ? data : i)));
      },
      error: (err) => {
        this.msg.set(err?.error?.detail ?? 'Error');
        this.msgError.set(true);
      },
    });
  }

  estadoColor(estado: string): string {
    const m: Record<string, string> = {
      SOLICITADO: 'var(--accent-blue)', ENTREGADO: 'var(--accent-amber)', EN_USO: 'var(--accent-cyan)',
      CONSUMIDO: 'var(--accent-emerald)', DEVUELTO: '#a855f7', VENCIDO: 'var(--accent-red)',
    };
    return m[estado] ?? 'var(--text-muted)';
  }

  barWidth(val: number, max: number): number {
    return max > 0 ? (val / max) * 100 : 0;
  }

  maxCant(ins: InsumoDomiciliarioDTO): number {
    return Math.max(ins.cantidadRequerida, ins.cantidadEntregada ?? 0, ins.cantidadConsumida ?? 0, ins.cantidadDevuelta ?? 0, 1);
  }
}
