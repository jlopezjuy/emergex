import { Component, input, output, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientRow } from '../../patients.component';
import { FacturaDTO } from '../../../../data-access/dto/patient.dto';

export interface InvoiceContext {
  numero: string;
  periodo: string;
  importe: number;
  patientLabel?: string;
}

export interface QuickPaymentPayload {
  amount: number;
  method: string;
  ref: string;
  nota: string;
  fecha: string;
  billingMode: 'mensual' | 'anual';
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
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
  readonly patient          = input<PatientRow | null>(null);
  readonly invoiceContext   = input<InvoiceContext | null>(null);
  readonly suggestedAmount  = input<number>(0);
  readonly isNewSubscription = input<boolean>(false);
  readonly error            = input<string | null>(null);
  readonly facturas         = input<FacturaDTO[]>([]);

  // ── Outputs ──
  readonly close  = output<void>();
  readonly submit = output<QuickPaymentPayload>();

  /** Factura del mes corriente ya pagada, si existe */
  readonly paidThisMonth = computed<FacturaDTO | null>(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return this.facturas().find(f =>
      f.estado === 'PAGADA' && f.fechaEmision?.startsWith(ym)
    ) ?? null;
  });

  /** Show billing-cycle toggle only when creating a brand-new invoice */
  readonly showCycleToggle = computed(() =>
    this.isNewSubscription() && !this.invoiceContext()
  );

  // ── Internal state ──
  paymentAmount: number = 0;
  paymentMethod: string = '';
  paymentRef:    string = '';
  paymentNota:   string = '';
  paymentFecha:  string = todayISO();
  billingMode: 'mensual' | 'anual' = 'mensual';
  baseAmount: number = 0;

  readonly metodosPago = [
    { value: 'EFECTIVO',        label: 'Efectivo en caja' },
    { value: 'TRANSFERENCIA',   label: 'Transferencia bancaria' },
    { value: 'TARJETA_DEBITO',  label: 'Tarjeta de débito' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
    { value: 'MERCADOPAGO',     label: 'MercadoPago' },
    { value: 'CHEQUE',          label: 'Cheque' },
  ];

  ngOnInit(): void {
    this.baseAmount = this.suggestedAmount() > 0
      ? this.suggestedAmount()
      : (this.invoiceContext()?.importe ?? 0);
    this.updateAmount();
  }

  updateAmount(): void {
    this.paymentAmount = this.billingMode === 'mensual'
      ? this.baseAmount
      : Math.round(this.baseAmount * 12 * 0.85);
  }

  setBillingMode(mode: 'mensual' | 'anual'): void {
    this.billingMode = mode;
    this.updateAmount();
  }

  onClose(): void { this.close.emit(); }

  onSubmit(): void {
    if (this.paymentAmount > 0 && this.paymentMethod) {
      this.submit.emit({
        amount:      this.paymentAmount,
        method:      this.paymentMethod,
        ref:         this.paymentRef,
        nota:        this.paymentNota,
        fecha:       this.paymentFecha,
        billingMode: this.billingMode,
      });
    }
  }

  get canSubmit(): boolean {
    return this.paymentAmount > 0 && !!this.paymentMethod;
  }
}
