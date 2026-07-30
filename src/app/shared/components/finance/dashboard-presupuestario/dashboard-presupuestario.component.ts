import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-presupuestario',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Dashboard Presupuestario & Control de Gestión</h2>
          <p class="text-sm text-gray-500">Desvíos por Centro de Costo (Solicitado vs Ordenado vs Realizado)</p>
        </div>
      </div>
      <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
        Control Presupuestario integrado con data-quality badges.
      </div>
    </div>
  `
})
export class DashboardPresupuestarioComponent implements OnInit {
  ngOnInit(): void {}
}
