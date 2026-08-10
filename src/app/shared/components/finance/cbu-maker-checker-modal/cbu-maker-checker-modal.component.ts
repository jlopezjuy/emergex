import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TercerosApiService } from '../../../../data-access/api/terceros.api';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';
import { CuentaBancariaTerceroDTO } from '../../../../data-access/dto/terceros.dto';
import { StatusBadgeComponent } from '../../status-badge/status-badge.component';

@Component({
  selector: 'emx-cbu-maker-checker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, StatusBadgeComponent],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-[var(--bg-elevated)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-glass)] text-[var(--text-primary)]">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-[var(--text-primary)]">Workflow Maker-Checker de CBU</h3>
          <button (click)="closeModal()" class="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>

        @if (cuentas && cuentas.length > 0) {
          <div class="mb-6 space-y-3">
            <h4 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Cuentas Registradas</h4>
            @for (cta of cuentas; track cta.id) {
              <div class="p-3 rounded-lg border border-[var(--border-glass)] bg-[var(--surface-glass)] flex justify-between items-center">
                <div>
                  <div class="font-medium text-sm text-[var(--text-primary)]">{{ cta.bancoNombre }} - {{ cta.titularNombre }}</div>
                  <div class="font-mono text-xs text-[var(--text-muted)]">{{ cta.cbuMasked || cta.cbu }}</div>
                </div>
                <div class="flex items-center gap-2">
                  <emx-status-badge [variant]="cta.estado === 'VERIFICADA' ? 'stable' : 'pending'">{{ cta.estado === 'VERIFICADA' ? 'VERIFICADA' : 'PENDIENTE' }}</emx-status-badge>
                  @if (cta.estado !== 'VERIFICADA') {
                    <button
                      type="button"
                      (click)="onAprobarCbu(cta.id)"
                      [disabled]="approvingId === cta.id"
                      class="px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <form [formGroup]="cbuForm" (ngSubmit)="onSubmitSolicitud()" class="space-y-4">
          <h4 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Solicitar Nuevo CBU / CVU</h4>
          <div>
            <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Nombre del Banco</label>
            <input
              type="text"
              formControlName="bancoNombre"
              placeholder="Ej: Banco Galicia"
              class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">CBU / CVU (22 dígitos)</label>
            <input
              type="text"
              formControlName="cbu"
              placeholder="0070000000000000000012"
              maxlength="22"
              class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Titular de la Cuenta</label>
            <input
              type="text"
              formControlName="titularNombre"
              placeholder="Nombre completo o Razón Social"
              class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Alias (opcional)</label>
            <input
              type="text"
              formControlName="alias"
              placeholder="MI.ALIAS.MP"
              class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] text-sm"
            />
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-lg hover:bg-[var(--surface-glass)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="cbuForm.invalid || submitting"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Solicitar Alta (PENDIENTE)
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CbuMakerCheckerModalComponent {
  @Input() terceroEmpresaId!: number;
  @Input() cuentas: CuentaBancariaTerceroDTO[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private tercerosApi = inject(TercerosApiService);
  private feedbackService = inject(UserFeedbackService);

  submitting = false;
  approvingId: number | null = null;

  cbuForm = this.fb.group({
    bancoNombre: ['', Validators.required],
    cbu: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(22)]],
    titularNombre: ['', Validators.required],
    alias: ['']
  });

  onSubmitSolicitud(): void {
    if (this.cbuForm.invalid || !this.terceroEmpresaId) return;

    this.submitting = true;
    const val = this.cbuForm.value;

    this.tercerosApi.solicitarAltaCbu({
      terceroEmpresaId: this.terceroEmpresaId,
      bancoNombre: val.bancoNombre || '',
      cbu: val.cbu || '',
      titularNombre: val.titularNombre || '',
      alias: val.alias || undefined
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.feedbackService.push({
          type: 'success',
          title: 'Solicitud CBU creada',
          message: 'La cuenta bancaria quedó en estado PENDIENTE_VERIFICACION.'
        });
        this.cbuForm.reset();
        this.updated.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.feedbackService.push({
          type: 'error',
          title: 'Error al solicitar CBU',
          message: err?.error?.detail || err?.error?.message || 'No se pudo crear la solicitud de CBU.'
        });
      }
    });
  }

  onAprobarCbu(ctaId: number): void {
    this.approvingId = ctaId;
    this.tercerosApi.aprobarCbu(ctaId).subscribe({
      next: () => {
        this.approvingId = null;
        this.feedbackService.push({
          type: 'success',
          title: 'CBU Aprobado',
          message: 'La cuenta bancaria ha sido VERIFICADA exitosamente.'
        });
        this.updated.emit();
      },
      error: (err) => {
        this.approvingId = null;
        this.feedbackService.push({
          type: 'error',
          title: 'Error al aprobar CBU',
          message: err?.error?.detail || err?.error?.message || 'El backend rechazó la aprobación.'
        });
      }
    });
  }

  closeModal(): void {
    this.closed.emit();
  }
}
