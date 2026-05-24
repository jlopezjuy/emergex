import { Component, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientRow } from '../../patients.component';

export interface QuickPaymentPayload {
  amount: number;
  method: string;
  ref: string;
}

@Component({
  selector: 'app-quick-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-payment-modal.component.html',
  styleUrl: './quick-payment-modal.component.scss'
})
export class QuickPaymentModalComponent implements OnInit {
  // ── Inputs ──
  readonly patient = input.required<PatientRow>();
  readonly suggestedAmount = input<number>(0);

  // ── Outputs ──
  readonly close = output<void>();
  readonly submit = output<QuickPaymentPayload>();

  // ── Internal State ──
  paymentAmount: number = 0;
  paymentMethod: string = 'EFECTIVO';
  paymentRef: string = '';

  readonly metodosPago = [
    { value: 'EFECTIVO', label: 'Efectivo en caja' },
    { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' }
  ];

  ngOnInit(): void {
    // Si hay un monto sugerido mayor a cero, lo utilizamos para inicializar el cobro.
    // De lo contrario, si es 0 (no hay facturas emitidas), inicializamos con el monto de suscripción base
    // pero manteniendo el flujo adaptativo para crear la factura bajo demanda de forma segura.
    this.paymentAmount = this.suggestedAmount() > 0 ? this.suggestedAmount() : 18500;
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.paymentAmount > 0) {
      this.submit.emit({
        amount: this.paymentAmount,
        method: this.paymentMethod,
        ref: this.paymentRef
      });
    }
  }
}
