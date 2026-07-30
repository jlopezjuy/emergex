import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cxp-aging-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Cuentas por Pagar — Aging de Deuda Proveedores</h2>
          <p class="text-sm text-gray-500">Antigüedad de saldos a pagar con validación de 3-Way Match</p>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <span class="text-xs font-semibold text-green-600 uppercase">0 - 30 Días</span>
          <p class="text-xl font-extrabold text-green-700 dark:text-green-300">$ 0.00</p>
        </div>
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <span class="text-xs font-semibold text-yellow-600 uppercase">31 - 60 Días</span>
          <p class="text-xl font-extrabold text-yellow-700 dark:text-yellow-300">$ 0.00</p>
        </div>
        <div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <span class="text-xs font-semibold text-orange-600 uppercase">61 - 90 Días</span>
          <p class="text-xl font-extrabold text-orange-700 dark:text-orange-300">$ 0.00</p>
        </div>
        <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span class="text-xs font-semibold text-red-600 uppercase">+90 Días</span>
          <p class="text-xl font-extrabold text-red-700 dark:text-red-300">$ 0.00</p>
        </div>
      </div>
    </div>
  `
})
export class CxpAgingDashboardComponent implements OnInit {
  ngOnInit(): void {}
}
