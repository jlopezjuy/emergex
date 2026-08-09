// MAQUETA SIN CABLEAR — datos ficticios. La tarea F2-03 la conecta. No montar antes.
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'emx-gestion-cobranza-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Registrar Gestión de Cobranza / Mora</h3>
          <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <form [formGroup]="gestionForm" (ngSubmit)="onSubmitGestion()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Tipo de Acción</label>
            <select formControlName="tipoGestion" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
              <option value="PROMESA_PAGO">Promesa de Pago</option>
              <option value="DISPUTA">Disputa de Facturación</option>
              <option value="RECHAZO_DEBITO">Rechazo de Débito Automático</option>
              <option value="INCOBRABLE">Gestión Incobrable</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Fecha Prometida de Pago</label>
            <input type="date" formControlName="fechaPromesaPago" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Monto Prometido ($)</label>
            <input type="number" formControlName="montoPrometido" placeholder="0.00" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Observaciones / Trazabilidad</label>
            <textarea formControlName="observaciones" rows="3" placeholder="Detalle del contacto con el cliente" class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"></textarea>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" [disabled]="gestionForm.invalid" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Registrar Gestión
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class GestionCobranzaModalComponent {
  @Input() clienteId!: number;
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  gestionForm = this.fb.group({
    tipoGestion: ['PROMESA_PAGO', Validators.required],
    fechaPromesaPago: [''],
    montoPrometido: [0],
    observaciones: ['', Validators.required],
  });

  onSubmitGestion(): void {
    if (this.gestionForm.invalid) return;
    this.closed.emit();
  }

  closeModal(): void {
    this.closed.emit();
  }
}
