// MAQUETA SIN CABLEAR — datos ficticios. La tarea F4-01 la conecta. No montar antes.
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'emx-cxc-aging-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Cuentas por Cobrar — Aging Server-Side</h2>
          <p class="text-sm text-gray-500">Antigüedad de deuda B2C, B2B y Obras Sociales derivada del Ledger</p>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span class="text-xs font-semibold text-blue-600 uppercase">Corriente (0-30d)</span>
          <p class="text-xl font-extrabold text-blue-700 dark:text-blue-300">$ 0.00</p>
        </div>
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <span class="text-xs font-semibold text-yellow-600 uppercase">Mora Media (31-60d)</span>
          <p class="text-xl font-extrabold text-yellow-700 dark:text-yellow-300">$ 0.00</p>
        </div>
        <div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <span class="text-xs font-semibold text-orange-600 uppercase">Mora Alta (61-90d)</span>
          <p class="text-xl font-extrabold text-orange-700 dark:text-orange-300">$ 0.00</p>
        </div>
        <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span class="text-xs font-semibold text-red-600 uppercase">Crítica (+90d)</span>
          <p class="text-xl font-extrabold text-red-700 dark:text-red-300">$ 0.00</p>
        </div>
      </div>
    </div>
  `
})
export class CxcAgingDashboardComponent implements OnInit {
  ngOnInit(): void {}
}
