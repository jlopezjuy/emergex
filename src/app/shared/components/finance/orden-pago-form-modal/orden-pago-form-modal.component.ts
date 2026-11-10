import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
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
      <div class="bg-[var(--bg-elevated)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-glass)] text-[var(--text-primary)]">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-[var(--text-primary)]">
            {{ isEjecucion ? 'Ejecución de Orden de Pago' : 'Emisión de Orden de Pago (OP)' }}
          </h3>
          <button (click)="closeModal()" class="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>

        <div *ngIf="isEjecucion" class="mb-4 p-3 bg-[var(--surface-glass)] rounded-lg border border-[var(--border-glass)] text-sm space-y-1">
          <p><span class="text-[var(--text-muted)]">Orden de Pago:</span> <strong class="font-mono text-[var(--text-primary)]">{{ numeroOp || ('#' + opId) }}</strong></p>
          <p *ngIf="montoNeto != null"><span class="text-[var(--text-muted)]">Monto Neto a Pagar:</span> <strong class="font-mono text-[var(--accent-blue)]">$ {{ montoNeto | number:'1.2-2' }}</strong></p>
        </div>

        <form [formGroup]="opForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <ng-container *ngIf="!isEjecucion">
            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Número OP</label>
              <input
                type="text"
                formControlName="numeroOp"
                placeholder="OP-2026-00094"
                class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Monto Retenciones Tributarias ($)</label>
              <input
                type="number"
                formControlName="montoRetenciones"
                placeholder="0.00"
                class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm font-mono"
              />
              <p class="text-xs text-[var(--accent-amber)] mt-1">REQUIERE VALIDACIÓN DEL CONTADOR O GERENTE</p>
            </div>
          </ng-container>

          <ng-container *ngIf="isEjecucion">
            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Medio de Pago</label>
              <select
                formControlName="medioPago"
                class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="CHEQUE">Cheque</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="DEBITO_AUTOMATICO">Débito Automático</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Referencia / Comprobante de Pago</label>
              <input
                type="text"
                formControlName="referenciaTransf"
                placeholder="Ej. N° Transferencia 89432104 / Cheque N° 451"
                class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </ng-container>

          <div class="pt-4 flex justify-end gap-3">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-lg hover:bg-[var(--surface-glass-strong)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="opForm.invalid || submitting"
              class="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-blue)] rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {{ isEjecucion ? 'Confirmar Pago' : 'Emitir Orden de Pago' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class OrdenPagoFormModalComponent implements OnInit {
  @Input() opId?: number;
  @Input() numeroOp?: string;
  @Input() montoNeto?: number;
  @Input() comprobanteId?: number;

  @Output() closed = new EventEmitter<void>();
  @Output() emitted = new EventEmitter<void>();
  @Output() executed = new EventEmitter<{ medioPago: string; referenciaTransf: string }>();

  private fb = inject(FormBuilder);
  private ordenesPagoApi = inject(OrdenesPagoApiService);
  private feedbackService = inject(UserFeedbackService);

  submitting = false;

  get isEjecucion(): boolean {
    return this.opId != null;
  }

  opForm = this.fb.group({
    numeroOp: [''],
    montoRetenciones: [0],
    medioPago: ['TRANSFERENCIA'],
    referenciaTransf: ['']
  });

  ngOnInit(): void {
    if (this.isEjecucion) {
      this.opForm.controls.medioPago.setValidators([Validators.required]);
      this.opForm.controls.referenciaTransf.setValidators([Validators.required]);
      this.opForm.controls.numeroOp.clearValidators();
    } else {
      this.opForm.controls.numeroOp.setValidators([Validators.required]);
      this.opForm.controls.medioPago.clearValidators();
      this.opForm.controls.referenciaTransf.clearValidators();
    }
    this.opForm.controls.numeroOp.updateValueAndValidity();
    this.opForm.controls.medioPago.updateValueAndValidity();
    this.opForm.controls.referenciaTransf.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.opForm.invalid) return;

    if (this.isEjecucion) {
      const val = this.opForm.value;
      this.executed.emit({
        medioPago: val.medioPago || 'TRANSFERENCIA',
        referenciaTransf: val.referenciaTransf || ''
      });
      return;
    }

    if (!this.comprobanteId) return;

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

  onSubmitOp(): void {
    this.onSubmit();
  }

  closeModal(): void {
    this.closed.emit();
  }
}
