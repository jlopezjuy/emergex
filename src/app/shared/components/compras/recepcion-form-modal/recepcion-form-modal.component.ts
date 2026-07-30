import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-recepcion-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Recepción de Bienes / Remito</h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <form [formGroup]="remitoForm" (ngSubmit)="onSubmitRemito()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Número de Remito</label>
            <input type="text" formControlName="numeroRemito" placeholder="R-0001-00004582" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Recibido Por (Operador / Depósito)</label>
            <input type="text" formControlName="recibidoPor" placeholder="Nombre del receptor" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" [disabled]="remitoForm.invalid" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Confirmar Recepción
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class RecepcionFormModalComponent {
  @Input() ordenDeCompraId!: number;
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  remitoForm = this.fb.group({
    numeroRemito: ['', Validators.required],
    recibidoPor: ['', Validators.required],
  });

  onSubmitRemito(): void {
    if (this.remitoForm.invalid) return;
    this.closed.emit();
  }

  closeModal(): void {
    this.closed.emit();
  }
}
