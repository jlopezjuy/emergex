import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conciliacion-bancaria-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Tesorería — Conciliación Bancaria M:N</h2>
          <p class="text-sm text-gray-500">Matching automático de extractos bancarios con hash anti-duplicados</p>
        </div>
      </div>
      <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        Panel de Conciliación listo para la importación batch de resúmenes.
      </div>
    </div>
  `
})
export class ConciliacionBancariaDashboardComponent implements OnInit {
  ngOnInit(): void {}
}
