import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OrdenesPagoApiService } from '../../../../data-access/api/ordenes-pago.api';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';

@Component({
  selector: 'emx-orden-pago-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-[var(--color-bg-card)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border)] text-[var(--color-text-main)]">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-[var(--color-text-main)]">Emisión de Orden de Pago (OP)</h3>
          <button (click)="closeModal()" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">✕</button>
        </div>

        <form [formGroup]="opForm" (ngSubmit)="onSubmitOp()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">Número OP</label>
            <input
              type="text"
              formControlName="numeroOp"
              placeholder="OP-2026-00094"
              class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-main)] text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">Monto Retenciones Tributarias ($)</label>
            <input
              type="number"
              formControlName="montoRetenciones"
              placeholder="0.00"
              class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-[var(--color-text-main)] text-sm font-mono"
            />
            <p class="text-xs text-amber-500 mt-1">REQUIERE VALIDACIÓN DEL CONTADOR O GERENTE</p>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-muted)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="opForm.invalid || submitting"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Emitir Orden de Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class OrdenPagoFormModalComponent {
  @Input() comprobanteId!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() emitted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private ordenesPagoApi = inject(OrdenesPagoApiService);
  private feedbackService = inject(UserFeedbackService);

  submitting = false;

  opForm = this.fb.group({
    numeroOp: ['', Validators.required],
    montoRetenciones: [0]
  });

  onSubmitOp(): void {
    if (this.opForm.invalid || !this.comprobanteId) return;

    this.submitting = true;
    const val = this.opForm.value;

    this.ordenesPagoApi.emitirOrdenDePago({
      comprobanteId: this.comprobanteId,
      numeroOp: val.numeroOp || '',
      montoRetenciones: val.montoRetenciones || 0
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.feedbackService.push({
          type: 'success',
          title: 'Orden de Pago Emitida',
          message: 'La OP fue generada en estado PENDIENTE_APROBACION.'
        });
        this.emitted.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.feedbackService.push({
          type: 'error',
          title: 'Error al emitir OP',
          message: err?.error?.detail || err?.error?.message || 'No se pudo generar la orden de pago.'
        });
      }
    });
  }

  closeModal(): void {
    this.closed.emit();
  }
}
