import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LedgerService } from '../../../../core/services/ledger.service';
import { LedgerCuentaCorriente } from '../../../../core/models/ledger.model';

@Component({
  selector: 'app-estado-cuenta-tercero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Estado de Cuenta Corriente</h2>
          <p class="text-sm text-gray-500">Saldos oficiales contables (Ledger Append-Only)</p>
        </div>
        <div class="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-right">
          <span class="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider block">Saldo Oficial</span>
          <span class="text-2xl font-extrabold text-blue-700 dark:text-blue-300">
            {{ saldo | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th class="px-4 py-3">Fecha Contable</th>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Concepto</th>
              <th class="px-4 py-3 text-right">Debe (+Deuda)</th>
              <th class="px-4 py-3 text-right">Haber (-Deuda)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of movimientos" class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
              <td class="px-4 py-3 font-medium">{{ m.fechaContable }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full"
                      [ngClass]="m.tipoMovimiento === 'DEBITO_DOCUMENTO' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'">
                  {{ m.tipoMovimiento }}
                </span>
              </td>
              <td class="px-4 py-3">{{ m.concepto }}</td>
              <td class="px-4 py-3 text-right text-red-600 font-semibold">{{ m.montoDebe | currency: 'ARS' : '' }}</td>
              <td class="px-4 py-3 text-right text-green-600 font-semibold">{{ m.montoHaber | currency: 'ARS' : '' }}</td>
            </tr>
            <tr *ngIf="movimientos.length === 0">
              <td colspan="5" class="text-center py-6 text-gray-400">No se encontraron movimientos registrados en la cuenta corriente.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class EstadoCuentaTerceroComponent implements OnInit {
  @Input() terceroId!: number;

  private ledgerService = inject(LedgerService);

  saldo: number = 0;
  movimientos: LedgerCuentaCorriente[] = [];

  ngOnInit(): void {
    if (this.terceroId) {
      this.cargarEstadoCuenta();
    }
  }

  cargarEstadoCuenta(): void {
    this.ledgerService.getSaldoTercero(this.terceroId).subscribe(s => this.saldo = s);
    this.ledgerService.getMovimientosTercero(this.terceroId).subscribe(m => this.movimientos = m);
  }
}
