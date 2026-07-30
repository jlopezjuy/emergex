import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TerceroService } from '../../../../core/services/tercero.service';
import { EstadoCuentaBancaria } from '../../../../core/models/cuenta-bancaria.model';

@Component({
  selector: 'app-cbu-maker-checker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Workflow Maker-Checker de CBU</h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <form [formGroup]="cbuForm" (ngSubmit)="onSubmitSolicitud()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Nombre del Banco</label>
            <input type="text" formControlName="bancoNombre" placeholder="Ej: Banco BBVA" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">CBU / CVU (22 dígitos)</label>
            <input type="text" formControlName="cbu" placeholder="0170099220000010057754" maxlength="22" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Titular de la Cuenta</label>
            <input type="text" formControlName="titularNombre" placeholder="Nombre completo o Razón Social" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" [disabled]="cbuForm.invalid || submitting" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private terceroService = inject(TerceroService);

  submitting = false;

  cbuForm = this.fb.group({
    bancoNombre: ['', Validators.required],
    cbu: ['', [Validators.required, Validators.minLength(10)]],
    titularNombre: ['', Validators.required],
    alias: [''],
  });

  onSubmitSolicitud(): void {
    if (this.cbuForm.invalid) return;
    this.submitting = true;

    const req = {
      terceroEmpresaId: this.terceroEmpresaId,
      bancoNombre: this.cbuForm.value.bancoNombre!,
      cbu: this.cbuForm.value.cbu!,
      titularNombre: this.cbuForm.value.titularNombre!,
      alias: this.cbuForm.value.alias || undefined,
      moneda: 'ARS'
    };

    this.terceroService.solicitarAltaCbu(req).subscribe({
      next: () => {
        this.submitting = false;
        this.closed.emit();
      },
      error: () => this.submitting = false
    });
  }

  closeModal(): void {
    this.closed.emit();
  }
}
