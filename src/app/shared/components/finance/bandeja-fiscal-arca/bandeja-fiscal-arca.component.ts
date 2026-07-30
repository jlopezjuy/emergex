import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bandeja-fiscal-arca',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Bandeja Fiscal ARCA / AFIP Outbox</h2>
          <p class="text-sm text-gray-500">Monitoreo de facturación electrónica y autorización CAE (REQUIERE VALIDACIÓN CONTADOR SAE)</p>
        </div>
      </div>
      <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
        Monitoreo Outbox ARCA activo para reintentos yLibro IVA Digital.
      </div>
    </div>
  `
})
export class BandejaFiscalArcaComponent implements OnInit {
  ngOnInit(): void {}
}
